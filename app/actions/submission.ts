'use server';

import { db } from '@/db';
import { submissions, problems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getProblemById } from './problem';
import { spawn, ChildProcess } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

interface ExecutionSession {
  process: ChildProcess;
  stdout: string;
  stderr: string;
  isFinished: boolean;
  exitCode: number | null;
  lastSeen: number;
}

const activeSessions = new Map<string, ExecutionSession>();

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.lastSeen > 30000) {
      session.process.kill();
      activeSessions.delete(id);
    }
  }
}, 10000);

async function runPythonCodeInternal(
  code: string, 
  input?: string, 
  executionId?: string
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  const tmpFilePath = path.join(os.tmpdir(), `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}.py`);

  try {
    await writeFile(tmpFilePath, code, 'utf-8');

    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve) => {
      const pyProcess = spawn('python3', [tmpFilePath]);
      
      let stdout = '';
      let stderr = '';
      
      pyProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pyProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pyProcess.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode });
      });

      if (input) {
        pyProcess.stdin.write(input);
      }
      pyProcess.stdin.end();
      
      const timeout = setTimeout(() => {
        pyProcess.kill();
        resolve({ stdout, stderr: stderr + '\nWaktu eksekusi habis (5 detik)', exitCode: -1 });
      }, 5000);

      pyProcess.on('exit', () => clearTimeout(timeout));
    });

    return result;
  } finally {
    try {
      await unlink(tmpFilePath);
    } catch (e) { }
  }
}

export async function runCode(data: { code: string; executionId: string; input?: string }) {
  const tmpFilePath = path.join(os.tmpdir(), `${data.executionId}.py`);
  await writeFile(tmpFilePath, data.code, 'utf-8');

  const pyProcess = spawn('python3', ['-u', tmpFilePath]);
  
  const session: ExecutionSession = {
    process: pyProcess,
    stdout: '',
    stderr: '',
    isFinished: false,
    exitCode: null,
    lastSeen: Date.now()
  };

  activeSessions.set(data.executionId, session);

  pyProcess.stdout.on('data', (d) => {
    session.stdout += d.toString();
    session.lastSeen = Date.now();
  });

  pyProcess.stderr.on('data', (d) => {
    session.stderr += d.toString();
    session.lastSeen = Date.now();
  });

  pyProcess.on('close', async (code) => {
    session.isFinished = true;
    session.exitCode = code;
    try { await unlink(tmpFilePath); } catch (e) {}
  });

  if (data.input) {
    pyProcess.stdin.write(data.input);
  }

  return { success: true, executionId: data.executionId };
}

export async function getExecutionStatus(executionId: string) {
  const session = activeSessions.get(executionId);
  if (!session) return { success: false, error: 'Sesi tidak ditemukan' };

  session.lastSeen = Date.now();
  const data = {
    stdout: session.stdout,
    stderr: session.stderr,
    isFinished: session.isFinished,
    exitCode: session.exitCode
  };

  if (session.isFinished) {
    activeSessions.delete(executionId);
  }

  return { success: true, ...data };
}

export async function sendStdin(executionId: string, text: string) {
  const session = activeSessions.get(executionId);
  if (session && !session.isFinished && session.process.stdin) {
    session.process.stdin.write(text + '\n');
    session.lastSeen = Date.now();
    return { success: true };
  }
  return { success: false };
}

export async function stopCode(executionId: string) {
  const session = activeSessions.get(executionId);
  if (session) {
    session.process.kill();
    activeSessions.delete(executionId);
    return { success: true };
  }
  return { success: false };
}

export async function runTests(data: { problemId: number; code: string }) {
  try {
    const problem = await getProblemById(data.problemId);
    if (!problem || !problem.testCases || problem.testCases.length === 0) {
      return { success: false, error: 'Soal tidak ditemukan atau tidak memiliki kasus pengujian' };
    }

    const testResults = [];
    let allPassed = true;

    for (const testCase of problem.testCases) {
      let passed = false;
      let actualOutput = '';
      let error = '';

      if (testCase.type === 'script') {
        const combinedCode = `${data.code}\n\n# --- Test Script ---\n${testCase.testScript}`;
        const result = await runPythonCodeInternal(combinedCode);
        passed = result.exitCode === 0;
        actualOutput = result.stdout;
        error = result.stderr;
      } else {
        const result = await runPythonCodeInternal(data.code, testCase.input || '');
        actualOutput = result.stdout;
        error = result.stderr;

        if (result.exitCode === 0) {
          passed = result.stdout.trim() === (testCase.expectedOutput || '').trim();
        } else {
          passed = false;
        }
      }

      if (!passed) allPassed = false;

      testResults.push({
        id: testCase.id,
        passed,
        actualOutput,
        error,
        type: testCase.type
      });
    }

    return { success: true, allPassed, testResults };
  } catch (error) {
    console.error('Eksekusi pengujian gagal:', error);
    return { success: false, error: 'Gagal menjalankan pengujian' };
  }
}

export async function autoSubmitOnExpire(data: { nim: string; problemId: number; code: string }) {
  try {
    await db.insert(submissions).values({
      nim: data.nim,
      problemId: data.problemId,
      code: data.code,
      status: 'fail',
    });
    revalidatePath('/admin/dashboard');
    revalidatePath(`/admin/problem/${data.problemId}/results`);
    return { success: true, status: 'fail' };
  } catch (error) {
    console.error('Pengiriman otomatis gagal:', error);
    return { success: false, error: 'Eksekusi gagal karena kesalahan server' };
  }
}

export async function submitCode(data: { nim: string; problemId: number; code: string }) {
  try {
    const problem = await getProblemById(data.problemId);
    if (!problem) return { success: false, error: 'Soal tidak ditemukan' };

    const now = new Date();
    if (problem.startTime && now < new Date(problem.startTime)) {
      return { success: false, error: 'Soal belum tersedia' };
    }
    if (problem.endTime && now > new Date(problem.endTime)) {
      return { success: false, error: 'Masa pengerjaan soal telah berakhir' };
    }

    const testResult = await runTests({ problemId: data.problemId, code: data.code });
    if (!testResult.success) return { success: false, error: testResult.error };

    const finalStatus = testResult.allPassed ? 'pass' : 'fail';
    await db.insert(submissions).values({
      nim: data.nim,
      problemId: data.problemId,
      code: data.code,
      status: finalStatus,
    });
    revalidatePath('/admin/dashboard');
    return { success: true, status: finalStatus, allPassed: testResult.allPassed };
  } catch (error) {
    console.error('Pengiriman jawaban gagal:', error);
    return { success: false, error: 'Eksekusi gagal karena kesalahan server' };
  }
}

export async function getSubmissions(problemId?: number) {
  let query = db.select({
    id: submissions.id,
    nim: submissions.nim,
    code: submissions.code,
    status: submissions.status,
    createdAt: submissions.createdAt,
    problemId: submissions.problemId,
    problemTitle: problems.title
  })
    .from(submissions)
    .leftJoin(problems, eq(submissions.problemId, problems.id));

  if (problemId) {
    query = query.where(eq(submissions.problemId, problemId)) as any;
  }

  const result = await query.orderBy(submissions.createdAt);
  return result;
}

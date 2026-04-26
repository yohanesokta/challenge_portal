'use server';

import { db } from '@/db';
import { submissions, problems, cheatLogs } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getProblemById } from './problem';
import { spawn, ChildProcess } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

// ─────────────────────────────────────────────────────────────────────────────
// Interactive execution session management
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Core Python runner
// ─────────────────────────────────────────────────────────────────────────────

async function runPythonCodeInternal(
  code: string,
  input?: string
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

// ─────────────────────────────────────────────────────────────────────────────
// Error formatter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether a Python stderr output contains a SyntaxError that originates
 * from the test script section (after '# --- Test Script ---') vs user code.
 * Returns a friendly Indonesian message if detected.
 */
function formatEvaluatorError(
  stderr: string,
  userCodeLines: number,
  testScriptStartLine: number
): string {
  if (!stderr) return '';

  // Detect SyntaxError
  if (stderr.includes('SyntaxError')) {
    // Try to extract the offending line number
    const lineMatch = stderr.match(/line (\d+)/);
    const errorLine = lineMatch ? parseInt(lineMatch[1]) : null;

    if (errorLine !== null && errorLine > testScriptStartLine) {
      const scriptLine = errorLine - testScriptStartLine;
      return (
        `⚠️ Kesalahan Sintaks pada Skrip Pengujian (baris ${scriptLine}):\n` +
        `Periksa skrip pengujian soal. Kemungkinan penyebab:\n` +
        `  • assert dengan koma di akhir baris tanpa pesan: gunakan assert expr, "pesan" pada satu baris\n` +
        `  • Tanda kurung yang tidak tertutup\n\n` +
        `Detail error Python:\n${stderr}`
      );
    } else if (errorLine !== null && errorLine <= userCodeLines) {
      return (
        `⚠️ Kesalahan Sintaks pada Kode Anda (baris ${errorLine}):\n\n${stderr}`
      );
    }

    return `⚠️ Kesalahan Sintaks:\n${stderr}`;
  }

  return stderr;
}

/**
 * Count lines in a string (used to locate test script start)
 */
function countLines(str: string): number {
  return str.split('\n').length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Modular Evaluators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EvaluatorFunction:
 * Append test_script after user code then run.
 * Test script calls the function by name and uses assert to validate.
 * Pass = exitCode 0, Fail = non-zero (AssertionError counts as fail).
 */
async function evaluatorFunction(
  userCode: string,
  testScript: string
): Promise<{ passed: boolean; actualOutput: string; error: string }> {
  const separator = '\n\n# --- Test Script ---\n';
  const combined = `${userCode}${separator}${testScript}`;
  const userLines = countLines(userCode);
  const testScriptStartLine = userLines + 2; // +2 for the two blank lines before separator comment
  const result = await runPythonCodeInternal(combined);
  return {
    passed: result.exitCode === 0,
    actualOutput: result.stdout,
    error: formatEvaluatorError(result.stderr, userLines, testScriptStartLine),
  };
}

/**
 * EvaluatorClass:
 * Same as EvaluatorFunction — append test script, run, check exit code.
 * Test script instantiates the class and calls methods.
 */
async function evaluatorClass(
  userCode: string,
  testScript: string
): Promise<{ passed: boolean; actualOutput: string; error: string }> {
  const separator = '\n\n# --- Test Script ---\n';
  const combined = `${userCode}${separator}${testScript}`;
  const userLines = countLines(userCode);
  const testScriptStartLine = userLines + 2;
  const result = await runPythonCodeInternal(combined);
  return {
    passed: result.exitCode === 0,
    actualOutput: result.stdout,
    error: formatEvaluatorError(result.stderr, userLines, testScriptStartLine),
  };
}

/**
 * EvaluatorBebas:
 * Run user code as a full program, then compare stdout with expectedOutput.
 * If testScript is provided (non-empty), use it as a wrapper around user code.
 * Fall back to stdout comparison using expectedOutput.
 */
async function evaluatorBebas(
  userCode: string,
  testScript: string,
  expectedOutput?: string | null
): Promise<{ passed: boolean; actualOutput: string; error: string }> {
  // If testScript has real content (not just comment), use it as evaluator
  const scriptLines = testScript.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  const hasScript = scriptLines.length > 0;

  if (hasScript) {
    const combined = `${userCode}\n\n# --- Test Script ---\n${testScript}`;
    const result = await runPythonCodeInternal(combined);
    return {
      passed: result.exitCode === 0,
      actualOutput: result.stdout,
      error: result.stderr,
    };
  }

  // Fallback: run code and compare stdout
  const result = await runPythonCodeInternal(userCode);
  const passed = result.exitCode === 0
    ? result.stdout.trim() === (expectedOutput || '').trim()
    : false;
  return {
    passed,
    actualOutput: result.stdout,
    error: result.stderr,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive run / exec session export
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// runTests — routes to correct evaluator based on solutionType
// ─────────────────────────────────────────────────────────────────────────────

export async function runTests(data: { problemId: string; code: string }) {
  try {
    const problem = await getProblemById(data.problemId);
    if (!problem || !problem.testCases || problem.testCases.length === 0) {
      return { success: false, error: 'Soal tidak ditemukan atau tidak memiliki kasus pengujian' };
    }

    const solutionType = problem.solutionType || 'bebas';
    const testResults = [];
    let allPassed = true;

    for (const testCase of problem.testCases) {
      let result: { passed: boolean; actualOutput: string; error: string };

      const script = testCase.testScript || '';

      if (solutionType === 'function') {
        result = await evaluatorFunction(data.code, script);
      } else if (solutionType === 'class') {
        result = await evaluatorClass(data.code, script);
      } else {
        // bebas
        result = await evaluatorBebas(data.code, script, testCase.expectedOutput);
      }

      if (!result.passed) allPassed = false;

      testResults.push({
        id: testCase.id,
        passed: result.passed,
        actualOutput: result.actualOutput,
        error: result.error,
        testScript: script,
        solutionType,
      });
    }

    return { success: true, allPassed, testResults };
  } catch (error) {
    console.error('Eksekusi pengujian gagal:', error);
    return { success: false, error: 'Gagal menjalankan pengujian' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit
// ─────────────────────────────────────────────────────────────────────────────

export async function logCheatEvent(data: { userId?: string; problemId: string; eventType: string; description?: string }) {
  try {
    await db.insert(cheatLogs).values({
      userId: data.userId,
      problemId: data.problemId,
      eventType: data.eventType,
      description: data.description,
    });
    return { success: true };
  } catch (error) {
    console.error('Gagal mencatat log anti-cheat:', error);
    return { success: false };
  }
}

export async function getCheatLogsBySubmissionId(submissionId: number) {
  return await db.select()
    .from(cheatLogs)
    .where(eq(cheatLogs.submissionId, submissionId))
    .orderBy(cheatLogs.createdAt);
}

export async function autoSubmitOnExpire(data: { nim: string; problemId: string; code: string; userId?: string }) {
  try {
    const [result] = await db.insert(submissions).values({
      nim: data.nim,
      userId: data.userId,
      problemId: data.problemId,
      code: data.code,
      status: 'fail',
    });

    const newSubmissionId = (result as any).insertId;

    // Link unlinked cheat logs to this submission
    if (data.userId) {
      await db.update(cheatLogs)
        .set({ submissionId: newSubmissionId })
        .where(and(
          eq(cheatLogs.userId, data.userId),
          eq(cheatLogs.problemId, data.problemId),
          isNull(cheatLogs.submissionId)
        ));
    }

    revalidatePath('/admin/dashboard');
    revalidatePath(`/admin/problem/${data.problemId}/results`);
    return { success: true, status: 'fail' };
  } catch (error) {
    console.error('Pengiriman otomatis gagal:', error);
    return { success: false, error: 'Eksekusi gagal karena kesalahan server' };
  }
}

export async function submitCode(data: { nim: string; problemId: string; code: string; userId?: string }) {
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
    const [result] = await db.insert(submissions).values({
      nim: data.nim,
      userId: data.userId,
      problemId: data.problemId,
      code: data.code,
      status: finalStatus,
    });

    const newSubmissionId = (result as any).insertId;

    // Link unlinked cheat logs to this submission
    if (data.userId) {
      await db.update(cheatLogs)
        .set({ submissionId: newSubmissionId })
        .where(and(
          eq(cheatLogs.userId, data.userId),
          eq(cheatLogs.problemId, data.problemId),
          isNull(cheatLogs.submissionId)
        ));
    }

    revalidatePath('/admin/dashboard');
    return { success: true, status: finalStatus, allPassed: testResult.allPassed };
  } catch (error) {
    console.error('Pengiriman jawaban gagal:', error);
    return { success: false, error: 'Eksekusi gagal karena kesalahan server' };
  }
}

export async function getSubmissions(problemId?: string) {
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

export async function getSubmissionById(id: number) {
  const result = await db.select()
    .from(submissions)
    .where(eq(submissions.id, id));
  
  return result.length > 0 ? result[0] : null;
}

export async function getSubmissionByUserAndProblem(problemId: string, userId: string) {
  const result = await db.select()
    .from(submissions)
    .where(and(
      eq(submissions.problemId, problemId),
      eq(submissions.userId, userId)
    ))
    .orderBy(submissions.createdAt);
  
  // Return the latest submission
  return result.length > 0 ? result[result.length - 1] : null;
}

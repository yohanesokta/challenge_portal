'use server';

import { db } from '@/db';
import { problems, testCases } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getProblems() {
  return await db.select().from(problems).where(eq(problems.isPublic, true)).orderBy(problems.createdAt);
}

export async function getAllProblemsAdmin() {
  return await db.select().from(problems).orderBy(problems.createdAt);
}

export async function getProblemById(id: number) {
  const result = await db.select().from(problems).where(eq(problems.id, id));
  if (result.length === 0) return null;
  
  const problemTestCases = await db.select().from(testCases).where(eq(testCases.problemId, id));
  
  return {
    ...result[0],
    testCases: problemTestCases,
  };
}

export interface TestCaseInput {
  testScript: string;
  expectedOutput?: string; // only for 'bebas' type
}

export interface ProblemInput {
  title: string;
  description: string;
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
  timingMode: 'scheduled' | 'manual';
  isPublic?: boolean;
  // SkemaSoal
  solutionType: 'function' | 'class' | 'bebas';
  functionName?: string | null;
  className?: string | null;
  testCases: TestCaseInput[];
}

export async function createProblem(data: ProblemInput) {
  try {
    const [result] = await db.insert(problems).values({
      title: data.title,
      description: data.description,
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      duration: data.duration,
      timingMode: data.timingMode,
      isPublic: data.isPublic ?? true,
      solutionType: data.solutionType,
      functionName: data.functionName || null,
      className: data.className || null,
    });
    
    const insertedId = (result as any).insertId;
    
    if (data.testCases && data.testCases.length > 0) {
      await db.insert(testCases).values(
        data.testCases.map(tc => ({
          problemId: insertedId,
          testScript: tc.testScript,
          expectedOutput: tc.expectedOutput || null,
          // legacy fields kept as null for new records
          type: data.solutionType === 'bebas' ? 'standard' : 'script',
          input: null,
        }))
      );
    }
    
    revalidatePath('/admin/dashboard');
    revalidatePath('/');
    return { success: true, id: insertedId };
  } catch (error) {
    console.error('Failed to create problem:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function updateProblem(id: number, data: ProblemInput) {
  try {
    await db.update(problems).set({
      title: data.title,
      description: data.description,
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      duration: data.duration,
      timingMode: data.timingMode,
      isPublic: data.isPublic ?? true,
      solutionType: data.solutionType,
      functionName: data.functionName || null,
      className: data.className || null,
    }).where(eq(problems.id, id));
    
    // Replace test cases: delete then re-insert
    await db.delete(testCases).where(eq(testCases.problemId, id));
    
    if (data.testCases && data.testCases.length > 0) {
      await db.insert(testCases).values(
        data.testCases.map(tc => ({
          problemId: id,
          testScript: tc.testScript,
          expectedOutput: tc.expectedOutput || null,
          type: data.solutionType === 'bebas' ? 'standard' : 'script',
          input: null,
        }))
      );
    }
    
    revalidatePath('/admin/dashboard');
    revalidatePath(`/problem/${id}`);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to update problem:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function startProblemManual(id: number) {
  try {
    await db.update(problems).set({
      startTime: new Date(),
    }).where(eq(problems.id, id));
    
    revalidatePath('/admin/dashboard');
    revalidatePath(`/problem/${id}`);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to start problem:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function getProblemStatus(id: number) {
  const result = await db.select({ startTime: problems.startTime }).from(problems).where(eq(problems.id, id));
  if (result.length === 0) return null;
  return result[0];
}

export async function resetProblemManual(id: number) {
  try {
    await db.update(problems).set({
      startTime: null,
    }).where(eq(problems.id, id));
    
    revalidatePath('/admin/dashboard');
    revalidatePath(`/problem/${id}`);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to reset problem:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function deleteProblem(id: number) {
  try {
    await db.delete(problems).where(eq(problems.id, id));
    revalidatePath('/admin/dashboard');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete problem:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

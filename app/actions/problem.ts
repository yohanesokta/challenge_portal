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

export async function createProblem(data: { 
  title: string; 
  description: string; 
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
  isPublic?: boolean;
  testCases: { 
    type: string;
    input?: string; 
    expectedOutput?: string;
    testScript?: string;
  }[] 
}) {
  try {
    const [result] = await db.insert(problems).values({
      title: data.title,
      description: data.description,
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      duration: data.duration,
      isPublic: data.isPublic ?? true,
    });
    
    const insertedId = (result as any).insertId;
    
    if (data.testCases && data.testCases.length > 0) {
      await db.insert(testCases).values(
        data.testCases.map(tc => ({
          problemId: insertedId,
          type: tc.type,
          input: tc.input || null,
          expectedOutput: tc.expectedOutput || null,
          testScript: tc.testScript || null,
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

export async function updateProblem(id: number, data: { 
  title: string; 
  description: string; 
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
  isPublic?: boolean;
  testCases: { 
    type: string;
    input?: string; 
    expectedOutput?: string;
    testScript?: string;
  }[] 
}) {
  try {
    await db.update(problems).set({
      title: data.title,
      description: data.description,
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      duration: data.duration,
      isPublic: data.isPublic ?? true,
    }).where(eq(problems.id, id));
    
    // Replace test cases: simplest way for a MVP is delete then re-insert
    await db.delete(testCases).where(eq(testCases.problemId, id));
    
    if (data.testCases && data.testCases.length > 0) {
      await db.insert(testCases).values(
        data.testCases.map(tc => ({
          problemId: id,
          type: tc.type,
          input: tc.input || null,
          expectedOutput: tc.expectedOutput || null,
          testScript: tc.testScript || null,
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

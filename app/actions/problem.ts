'use server';

import { db } from '@/db';
import { problems, testCases } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

async function generateShortLink(longUrl: string) {
  const authId = process.env.S_ID_AUTH_ID;
  const authKey = process.env.S_ID_AUTH_KEY;

  if (!authId || !authKey) {
    console.warn('S_ID_AUTH_ID or S_ID_AUTH_KEY not set, skipping short link generation');
    return null;
  }

  try {
    const response = await fetch('https://api.s.id/v1/links', {
      method: 'POST',
      headers: {
        'X-Auth-Id': authId,
        'X-Auth-Key': authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ long_url: longUrl }),
    });

    const result = await response.json();
    if (result.code === 200 && result.data && result.data.short) {
      return `https://s.id/${result.data.short}`;
    }
    console.error('Failed to generate short link from s.id:', result);
    return null;
  } catch (error) {
    console.error('Error calling s.id API:', error);
    return null;
  }
}

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
  shortLink?: string | null;
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

    // Generate short link
    try {
      const host = (await headers()).get('host');
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const longUrl = `${protocol}://${host}/problem/${insertedId}`;
      const shortLink = await generateShortLink(longUrl);
      if (shortLink) {
        await db.update(problems).set({ shortLink }).where(eq(problems.id, insertedId));
      }
    } catch (err) {
      console.error('Error generating short link after insert:', err);
    }
    
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
    // Check if short link exists, if not generate one
    const [existing] = await db.select({ shortLink: problems.shortLink }).from(problems).where(eq(problems.id, id));
    let shortLink = existing?.shortLink;

    if (!shortLink) {
      try {
        const host = (await headers()).get('host');
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const longUrl = `${protocol}://${host}/problem/${id}`;
        shortLink = await generateShortLink(longUrl);
      } catch (err) {
        console.error('Error generating short link during update:', err);
      }
    }

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
      shortLink: shortLink || null,
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

export async function regenerateShortLink(id: number) {
  try {
    const host = (await headers()).get('host');
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const longUrl = `${protocol}://${host}/problem/${id}`;
    const shortLink = await generateShortLink(longUrl);
    
    if (shortLink) {
      await db.update(problems).set({ shortLink }).where(eq(problems.id, id));
      revalidatePath('/admin/dashboard');
      revalidatePath(`/admin/problem/${id}/edit`);
      return { success: true, shortLink };
    }
    return { success: false, error: 'Gagal membuat tautan singkat' };
  } catch (error) {
    console.error('Error regenerating short link:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

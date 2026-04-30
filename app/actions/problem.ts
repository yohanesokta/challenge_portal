'use server';

import { db } from '@/db';
import { problems, testCases, submissions, problemOwnership, users } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

async function generateShortLink(id: string, customSlug?: string | null) {
  const shortlinkBaseUrl = process.env.SHORTLINK_URL || 'http://localhost:3001';
  const appBaseUrl = process.env.APP_URL || 'http://localhost:3000';
  
  const longUrl = `${appBaseUrl}/problem/${id}`;

  try {
    const response = await fetch(`${shortlinkBaseUrl}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        id: customSlug || undefined, // If undefined, service generates random 4-char slug
        long_url: longUrl 
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.short_url; // Service returns the full short URL
    }
    console.error('Failed to create internal shortlink:', await response.text());
    return null;
  } catch (error) {
    console.error('Error calling shortlink service:', error);
    return null;
  }
}

export async function getServerTime() {
  return new Date();
}

export async function getProblems() {
  return await db.select().from(problems).where(eq(problems.isPublic, true)).orderBy(problems.createdAt);
}

export async function getAllProblemsAdmin() {
  const session = await auth();
  const user = session?.user as any;
  
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return [];
  }

  // Join with users to get creator name
  let query = db.select({
    id: problems.id,
    title: problems.title,
    isPublic: problems.isPublic,
    startTime: problems.startTime,
    endTime: problems.endTime,
    duration: problems.duration,
    timingMode: problems.timingMode,
    shortLink: problems.shortLink,
    createdBy: problems.createdBy,
    creatorName: users.name,
    creatorEmail: users.email,
  })
  .from(problems)
  .leftJoin(users, eq(problems.createdBy, users.id));

  if (user.role !== 'superadmin') {
    // Regular admin only sees their own problems
    return await query.where(eq(problems.createdBy, user.id)).orderBy(problems.createdAt);
  }

  // Superadmin sees everything
  return await query.orderBy(problems.createdAt);
}

export async function getProblemById(id: string) {
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
  input?: string | null;
}

export interface ProblemInput {
  title: string;
  description: string;
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
  timingMode: 'scheduled' | 'manual';
  isPublic?: boolean;
  antiCheatEnabled?: boolean;
  // SkemaSoal
  solutionType: 'function' | 'class' | 'bebas';
  functionName?: string | null;
  className?: string | null;
  shortLink?: string | null;
  testCases: TestCaseInput[];
}

export async function createProblem(data: ProblemInput) {
  const session = await auth();
  const user = session?.user as any;

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const id = crypto.randomUUID();
    await db.insert(problems).values({
      id,
      title: data.title,
      description: data.description,
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      duration: data.duration,
      timingMode: data.timingMode,
      isPublic: data.isPublic ?? true,
      antiCheatEnabled: data.antiCheatEnabled ?? false,
      solutionType: data.solutionType,
      functionName: data.functionName || null,
      className: data.className || null,
      createdBy: user.id,
    });

    // Masukkan ke table penghubung kepemilikan
    await db.insert(problemOwnership).values({
      problemId: id,
      userId: user.id,
      role: 'owner'
    });
    
    // Generate random short link
    try {
      const shortLink = await generateShortLink(id); // No slug passed = random
      if (shortLink) {
        await db.update(problems).set({ shortLink }).where(eq(problems.id, id));
      }
    } catch (err) {
      console.error('Error generating short link after insert:', err);
    }
    
    if (data.testCases && data.testCases.length > 0) {
      await db.insert(testCases).values(
        data.testCases.map(tc => ({
          problemId: id,
          testScript: tc.testScript,
          expectedOutput: tc.expectedOutput || null,
          type: data.solutionType === 'bebas' ? 'standard' : 'script',
          input: tc.input || null,
        }))
      );
    }
    
    revalidatePath('/admin/dashboard');
    revalidatePath('/');
    return { success: true, id };
  } catch (error) {
    console.error('Failed to create problem:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function updateProblem(id: string, data: ProblemInput) {
  const session = await auth();
  const user = session?.user as any;

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    // Check ownership if not superadmin
    if (user.role !== 'superadmin') {
      const [existing] = await db.select({ createdBy: problems.createdBy }).from(problems).where(eq(problems.id, id));
      if (!existing || existing.createdBy !== user.id) {
        return { success: false, error: 'Unauthorized to update this problem' };
      }
    }

    let finalShortLink = data.shortLink;

    if (finalShortLink && finalShortLink.trim() !== "") {
      // If manually updated/provided, sync it to the shortlink-service
      try {
        // Extract slug: can be full URL or just the slug
        const slug = finalShortLink.split('/').pop();
        if (slug) {
          const syncedUrl = await generateShortLink(id, slug);
          if (syncedUrl) {
            finalShortLink = syncedUrl;
          }
        }
      } catch (err) {
        console.error('Error syncing manual short link:', err);
      }
    } else {
      // If no short link provided in data, check existing or generate
      const [existing] = await db.select({ shortLink: problems.shortLink }).from(problems).where(eq(problems.id, id));
      finalShortLink = existing?.shortLink;

      if (!finalShortLink) {
        try {
          finalShortLink = await generateShortLink(id);
        } catch (err) {
          console.error('Error generating random short link during update:', err);
        }
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
      antiCheatEnabled: data.antiCheatEnabled ?? false,
      solutionType: data.solutionType,
      functionName: data.functionName || null,
      className: data.className || null,
      shortLink: finalShortLink || null,
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
          input: tc.input || null,
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

export async function startProblemManual(id: string) {
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

export async function getProblemStatus(id: string) {
  const result = await db.select({ startTime: problems.startTime }).from(problems).where(eq(problems.id, id));
  if (result.length === 0) return null;
  return result[0];
}

export async function resetProblemManual(id: string) {
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

export async function deleteProblem(id: string) {
  const session = await auth();
  const user = session?.user as any;

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    // Check ownership if not superadmin
    if (user.role !== 'superadmin') {
      const [existing] = await db.select({ createdBy: problems.createdBy }).from(problems).where(eq(problems.id, id));
      if (!existing || existing.createdBy !== user.id) {
        return { success: false, error: 'Unauthorized to delete this problem' };
      }
    }

    await db.delete(problems).where(eq(problems.id, id));
    revalidatePath('/admin/dashboard');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete problem:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function getUserHistory() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await db.select({
    id: submissions.id,
    problemId: problems.id,
    problemTitle: problems.title,
    status: submissions.status,
    createdAt: submissions.createdAt
  })
  .from(submissions)
  .innerJoin(problems, eq(submissions.problemId, problems.id))
  .where(eq(submissions.userId, session.user.id))
  .orderBy(submissions.createdAt);
}

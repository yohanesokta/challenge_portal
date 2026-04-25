'use server';

import { db } from "@/db";
import { users, adminRequests } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nim = formData.get("nim") as string;

  if (!email || !password || !nim) {
    return { error: "Email, Password dan NIM wajib diisi" };
  }

  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return { error: "Email sudah terdaftar" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    await db.insert(users).values({
      id,
      name,
      email,
      password: hashedPassword,
      nim,
      role: "student",
    });

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Gagal melakukan registrasi" };
  }
}

export async function requestAdminRole(reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Silakan login terlebih dahulu" };

  try {
    // Check if there is already a pending or approved request
    const [existingRequest] = await db
      .select()
      .from(adminRequests)
      .where(
        and(
          eq(adminRequests.userId, session.user.id),
          eq(adminRequests.status, "pending")
        )
      )
      .limit(1);

    if (existingRequest) {
      return { error: "Permintaan Anda sedang diproses" };
    }

    await db.insert(adminRequests).values({
      userId: session.user.id,
      reason,
      status: "pending",
    });

    // Update user role to pending_admin for visual feedback if needed
    await db
      .update(users)
      .set({ role: "pending_admin" })
      .where(eq(users.id, session.user.id));

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Admin request error:", error);
    return { error: "Gagal mengirimkan permintaan" };
  }
}

export async function handleAdminRequest(requestId: number, action: 'approve' | 'reject') {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return { error: "Anda tidak memiliki izin" };
  }

  try {
    const [request] = await db
      .select()
      .from(adminRequests)
      .where(eq(adminRequests.id, requestId))
      .limit(1);

    if (!request) return { error: "Permintaan tidak ditemukan" };

    const status = action === 'approve' ? 'approved' : 'rejected';
    const newRole = action === 'approve' ? 'admin' : 'student';

    await db
      .update(adminRequests)
      .set({
        status,
        reviewedBy: session!.user!.id
      })
      .where(eq(adminRequests.id, requestId));

    await db
      .update(users)
      .set({ role: newRole })
      .where(eq(users.id, request.userId));

    revalidatePath("/admin/requests");
    return { success: true };
  } catch (error) {
    console.error("Admin action error:", error);
    return { error: "Gagal memproses permintaan" };
  }
}

export async function getPendingAdminRequests() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) return [];

  return db
    .select({
      id: adminRequests.id,
      reason: adminRequests.reason,
      status: adminRequests.status,
      createdAt: adminRequests.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(adminRequests)
    .innerJoin(users, eq(adminRequests.userId, users.id))
    .where(eq(adminRequests.status, "pending"))
    .orderBy(adminRequests.createdAt);
}

export async function updateUserNim(nim: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Silakan login terlebih dahulu" };
  if (!nim.trim()) return { error: "NIM tidak boleh kosong" };

  try {
    await db
      .update(users)
      .set({ nim })
      .where(eq(users.id, session.user.id));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Update NIM error:", error);
    return { error: "Gagal memperbarui NIM" };
  }
}

export async function getAllAdmins() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'superadmin') return [];

  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    })
    .from(users)
    .where(eq(users.role, 'admin'))
    .orderBy(users.createdAt);
}

export async function demoteAdmin(userId: string) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'superadmin') {
    return { error: "Anda tidak memiliki izin" };
  }

  try {
    await db
      .update(users)
      .set({ role: 'student' })
      .where(eq(users.id, userId));

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Demote admin error:", error);
    return { error: "Gagal menurunkan jabatan admin" };
  }
}

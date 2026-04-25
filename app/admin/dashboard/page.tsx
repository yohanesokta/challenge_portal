import { getAllProblemsAdmin } from "@/app/actions/problem";
import { redirect } from "next/navigation";
import ProblemsList from "./ProblemsList";
import { cookies } from "next/headers";
import Link from "next/link";
import { auth as getAuth } from "@/auth";
import { isAuthEnabled } from "@/lib/config";
import { getAllAdmins, demoteAdmin } from "@/app/actions/auth";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const authEnabled = isAuthEnabled();
  let user: any = null;
  
  if (authEnabled) {
    const session = await getAuth();
    user = session?.user;
    if (!session || (user.role !== 'admin' && user.role !== 'superadmin')) {
      redirect('/admin');
    }
  } else {
    const cookieStore = await cookies();
    const legacyAuth = cookieStore.get('admin_auth');
    if (!legacyAuth) {
      redirect('/admin');
    }
  }

  const problems = await getAllProblemsAdmin();
  const admins = user?.role === 'superadmin' ? await getAllAdmins() : [];

  return (
    <div className="min-h-screen bg-[#1e1e1e] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dasbor {user?.role === 'superadmin' ? 'Super Admin' : 'Administrator'}</h1>
            <p className="text-zinc-500">Kelola soal dan pantau tantangan yang sedang berjalan.</p>
          </div>
          <div className="flex gap-4">
            {authEnabled && (
              <Link href="/admin/requests" className="px-4 py-2 bg-green-600/10 text-green-500 rounded border border-green-600/30 hover:bg-green-600 hover:text-white transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">group_add</span>
                Permintaan Moderator
              </Link>
            )}
            <Link href="/" className="px-4 py-2 bg-[#2d2d2d] text-white rounded border border-[#333333] hover:bg-[#3d3d3d]">
              Lihat Situs
            </Link>

            <Link href="/admin/problem/new" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
              + Soal Baru
            </Link>
          </div>
        </div>

        {user?.role === 'superadmin' && admins.length > 0 && (
          <div className="mb-12 bg-[#2d2d2d] border border-[#333333] rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500">shield_person</span>
              Manajemen Admin
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#333333]">
                    <th className="py-2 text-zinc-400 font-medium">Nama</th>
                    <th className="py-2 text-zinc-400 font-medium">Email</th>
                    <th className="py-2 text-zinc-400 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id} className="border-b border-[#333333]/50">
                      <td className="py-3 text-white">{admin.name}</td>
                      <td className="py-3 text-zinc-300">{admin.email}</td>
                      <td className="py-3">
                        <form action={async () => {
                          'use server';
                          await demoteAdmin(admin.id);
                        }}>
                          <button className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">person_remove</span>
                            Jadikan User Biasa
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          <ProblemsList problems={problems as any} userRole={user?.role} />
        </div>
      </div>
    </div>
  );
}

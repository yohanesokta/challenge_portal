import { getAllProblemsAdmin } from "@/app/actions/problem";
import { redirect } from "next/navigation";
import ProblemsList from "./ProblemsList";
import { cookies } from "next/headers";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const auth = cookieStore.get('admin_auth');
  
  if (!auth) {
    redirect('/admin');
  }

  const problems = await getAllProblemsAdmin();

  return (
    <div className="min-h-screen bg-[#1e1e1e] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dasbor Administrator</h1>
            <p className="text-zinc-500">Kelola soal dan pantau tantangan yang sedang berjalan.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/" className="px-4 py-2 bg-[#2d2d2d] text-white rounded border border-[#333333] hover:bg-[#3d3d3d]">
              Lihat Situs
            </Link>
            <Link href="/admin/problem/new" className="px-4 py-2 bg-[#007acc] text-white rounded hover:bg-[#005f9e]">
              + Soal Baru
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <ProblemsList problems={problems as any} />
        </div>
      </div>
    </div>
  );
}

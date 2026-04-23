import { getAllProblemsAdmin } from "@/app/actions/problem";
import { getSubmissions } from "@/app/actions/submission";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SubmissionsList from "./SubmissionsList";
import ProblemsList from "./ProblemsList";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const auth = cookieStore.get('admin_auth');
  
  if (!auth) {
    redirect('/admin');
  }

  const [problems, submissions] = await Promise.all([
    getAllProblemsAdmin(),
    getSubmissions()
  ]);

  return (
    <div className="min-h-screen bg-[#1e1e1e] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-zinc-500">Manage problems and monitor submissions.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/" className="px-4 py-2 bg-[#2d2d2d] text-white rounded border border-[#333333] hover:bg-[#3d3d3d]">
              View Site
            </Link>
            <Link href="/admin/problem/new" className="px-4 py-2 bg-[#007acc] text-white rounded hover:bg-[#005f9e]">
              + New Problem
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Problems List Component */}
          <ProblemsList problems={problems as any} />

          {/* Submissions List Component */}
          <SubmissionsList submissions={submissions} />
        </div>
      </div>
    </div>
  );
}

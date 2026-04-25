'use client';

import { useState, useEffect } from "react";
import { getProblemById } from "@/app/actions/problem";
import { getSubmissions } from "@/app/actions/submission";
import { useParams } from "next/navigation";
import Link from "next/link";
import SubmissionsList from "../../../dashboard/SubmissionsList";

export default function ProblemResults() {
  const params = useParams();
  const id = params.id as string;

  const [problem, setProblem] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [problemData, submissionData] = await Promise.all([
        getProblemById(id),
        getSubmissions(id)
      ]);
      
      setProblem(problemData);
      setSubmissions(submissionData);
      setIsLoading(false);
    }
    fetchData();
  }, [id]);

  const handleShare = () => {
    const url = `${window.location.origin}/problem/${id}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center text-white">Loading results...</div>;
  }

  if (!problem) {
    return <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center text-white">Problem not found.</div>;
  }

  return (
    <div className="min-h-screen bg-[#1e1e1e] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Results: {problem.title}</h1>
            <div className="flex gap-4 items-center">
                <Link href="/admin/dashboard" className="text-[#007acc] hover:underline text-sm">&larr; Back to Dashboard</Link>
                <span className="text-zinc-600 text-xs">|</span>
                <span className="text-zinc-500 text-xs uppercase font-bold tracking-widest">Problem ID: {problem.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
               onClick={handleShare}
               className={`flex items-center gap-2 px-4 py-2 rounded border border-[#333333] transition-all font-bold text-xs uppercase tracking-widest ${isCopied ? 'bg-green-600 text-white border-green-500' : 'bg-[#252526] text-zinc-400 hover:text-white hover:border-zinc-500'}`}
            >
                <span className="material-symbols-outlined text-sm">{isCopied ? 'check_circle' : 'share'}</span>
                {isCopied ? 'Link Disalin!' : 'Bagikan Soal'}
            </button>
            <div className="flex bg-[#252526] border border-[#333333] rounded px-4 py-2 gap-6 h-full">
                  <div className="text-center">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Pass</p>
                      <p className="text-green-500 font-bold">{submissions.filter(s => s.status === 'pass').length}</p>
                  </div>
                  <div className="text-center">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Fail</p>
                      <p className="text-red-500 font-bold">{submissions.filter(s => s.status === 'fail').length}</p>
                  </div>
                  <div className="text-center border-l border-[#333333] pl-6">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Total</p>
                      <p className="text-white font-bold">{submissions.length}</p>
                  </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
            <SubmissionsList submissions={submissions} />
        </div>
      </div>
    </div>
  );
}

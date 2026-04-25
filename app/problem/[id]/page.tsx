import { getProblemById } from "@/app/actions/problem";
import Header from "../../components/Header";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import EditorClient from "./EditorClient";

const SOLUTION_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  function: { label: 'Function', color: 'text-[#007acc] bg-[#007acc]/20 border-[#007acc]/40', icon: 'function' },
  class:    { label: 'Class',    color: 'text-emerald-400 bg-emerald-900/20 border-emerald-600/40', icon: 'data_object' },
  bebas:    { label: 'Bebas',    color: 'text-purple-400 bg-purple-900/20 border-purple-600/40', icon: 'terminal' },
};

import { isAuthEnabled } from "@/lib/config";
import { auth } from "@/auth";

import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const problem = await getProblemById(id);

  if (!problem) {
    return {
      title: "Soal Tidak Ditemukan",
    };
  }

  return {
    title: problem.title,
    description: problem.description.substring(0, 160),
    alternates: {
      canonical: `/problem/${id}`,
    },
    openGraph: {
      title: `${problem.title} | Coding Assignment Portal`,
      description: problem.description.substring(0, 160),
      type: "article",
      url: `/problem/${id}`,
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const problem = await getProblemById(id);
  const authEnabled = isAuthEnabled();
  const session = authEnabled ? await auth() : null;

  if (!problem) {
    notFound();
  }

  const solutionType = (problem.solutionType as string) || 'bebas';
  const typeMeta = SOLUTION_TYPE_META[solutionType] ?? SOLUTION_TYPE_META.bebas;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": problem.title,
            "description": problem.description.substring(0, 160),
            "author": {
              "@type": "Organization",
              "name": "Coding Assignment Portal"
            },
            "datePublished": problem.createdAt,
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `${process.env.APP_URL || 'http://localhost:3000'}/problem/${problem.id}`
            }
          }),
        }}
      />
      <Header authEnabled={authEnabled} />
      <div className="flex h-[calc(100vh-48px)] overflow-hidden">
        <main className="flex-1 p-0 overflow-hidden">
          <div className="flex h-full flex-col lg:flex-row overflow-hidden">
            <div className="w-full lg:w-1/3 p-6 bg-[#1e1e1e] border-r border-[#333333] overflow-y-auto custom-scrollbar">
              {/* Header badges */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="bg-[#2d2d2d] text-primary px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border border-[#333333]">
                  ID: {problem.id}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border flex items-center gap-1 ${typeMeta.color}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{typeMeta.icon}</span>
                  {typeMeta.label}
                </span>
                {solutionType === 'function' && problem.functionName && (
                  <span className="bg-[#1e1e1e] text-[#007acc] px-2 py-0.5 rounded text-[10px] font-mono border border-[#007acc]/30">
                    def {problem.functionName}()
                  </span>
                )}
                {solutionType === 'class' && problem.className && (
                  <span className="bg-[#1e1e1e] text-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-600/30">
                    class {problem.className}
                  </span>
                )}
              </div>

              <h1 className="font-h1 text-h1 text-white mb-4">{problem.title}</h1>
              
              <div className="prose prose-invert max-w-none prose-pre:bg-[#252526] prose-pre:border prose-pre:border-[#333333] prose-code:text-primary prose-a:text-primary hover:prose-a:underline">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {problem.description}
                </ReactMarkdown>
              </div>

              {/* Test cases — all visible */}
              {problem.testCases.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-white font-bold">Kasus Pengujian</h3>
                    <span className="text-[10px] text-zinc-500 italic">— semua terlihat</span>
                  </div>
                  <div className="space-y-4">
                    {problem.testCases.map((tc: any, idx: number) => (
                      <div key={idx} className="bg-[#252526] rounded border border-[#333333] overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] border-b border-[#333333]">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Kasus #{idx + 1}</span>
                        </div>
                        {tc.testScript ? (
                          <div className="p-3">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">Skrip Pengujian (Python)</span>
                            <pre className="bg-[#1e1e1e] p-3 rounded text-xs text-green-300 font-mono whitespace-pre-wrap overflow-x-auto border border-[#333333]">{tc.testScript}</pre>
                          </div>
                        ) : (
                          <div className="p-3 grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Input</span>
                              <code className="bg-[#1e1e1e] p-2 block rounded text-sm text-zinc-300 font-mono whitespace-pre-wrap">{tc.input || '(tidak ada)'}</code>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Output Diharapkan</span>
                              <code className="bg-[#1e1e1e] p-2 block rounded text-sm text-zinc-300 font-mono whitespace-pre-wrap">{tc.expectedOutput || '(tidak ada)'}</code>
                            </div>
                          </div>
                        )}
                        {solutionType === 'bebas' && tc.expectedOutput && tc.testScript && (
                          <div className="px-3 pb-3">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Output Diharapkan (Fallback)</span>
                            <code className="bg-[#1e1e1e] p-2 block rounded text-xs text-zinc-400 font-mono whitespace-pre-wrap">{tc.expectedOutput}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 bg-[#1e1e1e] flex flex-col h-full min-h-[500px]">
              <EditorClient 
                problemId={problem.id} 
                endTime={problem.endTime} 
                duration={problem.duration}
                timingMode={problem.timingMode as 'scheduled' | 'manual'}
                startTime={problem.startTime}
                solutionType={solutionType as 'function' | 'class' | 'bebas'}
                functionName={problem.functionName || undefined}
                className={problem.className || undefined}
                userNim={(session?.user as any)?.nim}
                userId={session?.user?.id}
                authEnabled={authEnabled}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}


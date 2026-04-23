import { getProblemById } from "@/app/actions/problem";
import Header from "../../components/Header";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import EditorClient from "./EditorClient";

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const problem = await getProblemById(parseInt(id));

  if (!problem) {
    notFound();
  }

  return (
    <>
      <Header />
      <div className="flex min-h-[calc(100vh-48px)]">
        <main className="flex-1 p-0">
          <div className="flex h-full flex-col lg:flex-row">
            {/* Split layout: Problem Description on left, Editor on right */}
            <div className="w-full lg:w-1/3 p-6 bg-[#1e1e1e] border-r border-[#333333] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-[#2d2d2d] text-primary px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border border-[#333333]">
                  Problem {problem.id}
                </span>
              </div>
              <h1 className="font-h1 text-h1 text-white mb-4">{problem.title}</h1>
              
              <div className="prose prose-invert max-w-none prose-pre:bg-[#252526] prose-pre:border prose-pre:border-[#333333] prose-code:text-primary prose-a:text-primary hover:prose-a:underline">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {problem.description}
                </ReactMarkdown>
              </div>

              <div className="mt-8">
                <h3 className="text-white font-bold mb-4">Test Cases</h3>
                <div className="space-y-4">
                  {problem.testCases.map((tc, idx) => (
                    <div key={idx} className="bg-[#252526] p-4 rounded border border-[#333333]">
                      <div className="mb-2">
                        <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">Input</span>
                        <code className="bg-[#1e1e1e] p-2 block rounded text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                          {tc.input}
                        </code>
                      </div>
                      <div>
                        <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">Expected Output</span>
                        <code className="bg-[#1e1e1e] p-2 block rounded text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                          {tc.expectedOutput}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 bg-[#1e1e1e] flex flex-col h-full min-h-[500px]">
              <EditorClient problemId={problem.id} endTime={problem.endTime} duration={problem.duration} />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

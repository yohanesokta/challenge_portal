import { getProblems } from "@/app/actions/problem";
import Link from "next/link";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import MarkdownRenderer from "./components/MarkdownRenderer";

export const dynamic = 'force-dynamic';

import { isAuthEnabled } from "@/lib/config";

export default async function Home() {
  const problems = await getProblems();
  const authEnabled = isAuthEnabled();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Coding Assignment Portal",
            "url": process.env.APP_URL || 'http://localhost:3000',
            "description": "Platform tantangan pemrograman harian untuk meningkatkan skill coding.",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${process.env.APP_URL || 'http://localhost:3000'}/?q={search_term_string}`
              },
              "query-input": "required name=search_term_string"
            }
          }),
        }}
      />
      <Header authEnabled={authEnabled} />
      <div className="flex min-h-[calc(100vh-48px)]">
        <Sidebar className="hidden md:flex" authEnabled={authEnabled} />

        <main className="flex-1 md:ml-64 p-6 bg-[#1e1e1e]">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-h1 text-h1 text-white mb-1">Daftar Soal Tersedia</h1>
                <p className="font-caption text-caption text-zinc-500">Selesaikan tantangan dan asah kemampuan pemrograman Anda.</p>
              </div>
              <div className="flex gap-2">
                <button className="bg-[#252526] text-zinc-300 px-3 py-1.5 rounded border border-[#333333] text-sm hover:bg-[#2d2d2d] transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">filter_list</span>
                  Penyaring
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {problems.length === 0 ? (
                <div className="col-span-full py-12 text-center text-zinc-500">
                  Belum ada soal tersedia saat ini. Silakan periksa kembali nanti!
                </div>
              ) : (
                problems.map((problem, index) => (
                  <div key={problem.id} className="bg-[#252526] border border-[#333333] p-5 flex flex-col justify-between hover:bg-[#2a2d2e] transition-all duration-200 group">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-[#2d2d2d] text-primary px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border border-[#333333]">
                          Tantangan
                        </span>
                        <span className="material-symbols-outlined text-zinc-600 group-hover:text-[#007acc] transition-colors">
                          code
                        </span>
                      </div>
                      <h2 className="font-h2 text-h2 text-white mb-2">{problem.title}</h2>
                      <div className="font-body-main text-body-main text-zinc-400 line-clamp-2 prose prose-invert prose-xs max-w-none">
                        <MarkdownRenderer content={problem.description} />
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-zinc-500 text-xs flex items-center gap-1">
                        P{problem.id}
                      </div>
                      <a
                        href={`/problem/${problem.id}`}
                        className="bg-[#007acc] text-white px-4 py-1.5 rounded text-sm font-semibold hover:opacity-90 active:scale-95 transition-all text-center"
                      >
                        Selesaikan
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-900 border-t border-[#333333] flex justify-around items-center z-50">
        <button className="flex flex-col items-center gap-1 text-[#007acc]">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-bold">DASBOR</span>
        </button>
      </div>
    </>
  );
}

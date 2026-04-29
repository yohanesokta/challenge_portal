'use client';

import Editor from '@monaco-editor/react';

interface TestCasePreviewProps {
  testCases: any[];
}

export default function TestCasePreview({ testCases }: TestCasePreviewProps) {
  return (
    <div className="space-y-4">
      {testCases.map((tc, idx) => (
        <div key={idx} className="bg-[#252526] rounded border border-[#333333] overflow-hidden">
          <details className="group" open={idx === 0}>
            <summary className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] border-b border-[#333333] cursor-pointer hover:bg-[#333333] transition-colors list-none">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Kasus #{idx + 1}</span>
              <span className="material-symbols-outlined text-zinc-500 text-sm group-open:rotate-180 transition-transform">expand_more</span>
            </summary>
            
            <div className="p-3">
              {tc.testScript ? (
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">Skrip Pengujian (Python)</span>
                  <div className="rounded border border-[#333333] overflow-hidden bg-[#1e1e1e]">
                    <Editor
                      height="120px"
                      defaultLanguage="python"
                      theme="vs-dark"
                      value={tc.testScript}
                      options={{
                        readOnly: true,
                        fontSize: 11,
                        minimap: { enabled: false },
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        lineNumbers: 'off',
                        glyphMargin: false,
                        folding: false,
                        lineDecorationsWidth: 0,
                        lineNumbersMinChars: 0,
                        padding: { top: 8, bottom: 8 },
                        fontFamily: "'Fira Code', 'Courier New', monospace",
                        scrollbar: {
                          vertical: 'hidden',
                          horizontal: 'auto',
                          handleMouseWheel: true,
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
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
              {tc.expectedOutput && tc.testScript && (
                <div className="mt-3">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Output Diharapkan (Fallback)</span>
                  <code className="bg-[#1e1e1e] p-2 block rounded text-xs text-zinc-400 font-mono whitespace-pre-wrap">{tc.expectedOutput}</code>
                </div>
              )}
            </div>
          </details>
        </div>
      ))}
    </div>
  );
}

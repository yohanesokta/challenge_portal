'use client';

import { useState, useEffect } from "react";
import { runTests } from "@/app/actions/submission";
import Editor from '@monaco-editor/react';

interface ReviewClientProps {
  problemId: string;
  nim?: string;
  storageKey?: string;
  submissionStatus?: 'pass' | 'fail' | 'timeout';
  solutionType?: 'function' | 'class' | 'bebas';
  functionName?: string;
  className?: string;
}

export default function ReviewClient({
  problemId,
  nim,
  storageKey,
  submissionStatus,
  solutionType,
  functionName,
  className,
}: ReviewClientProps) {
  const [code, setCode] = useState<string>('# Memuat kode mahasiswa...');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [allTestsPassed, setAllTestsPassed] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tests'>('tests');
  const [hasRunTests, setHasRunTests] = useState(false);

  useEffect(() => {
    // Load code from sessionStorage using the key
    if (storageKey) {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          setCode(stored);
          // Clean up storage after reading
          sessionStorage.removeItem(storageKey);
        } else {
          setCode('# Kode tidak tersedia atau sesi telah kedaluwarsa.\n# Muat ulang tab pengerjaan untuk mencoba lagi.');
        }
      } catch {
        setCode('# Gagal memuat kode dari penyimpanan sesi.');
      }
    } else {
      setCode('# Tidak ada kode yang dikirimkan.');
    }
    setIsLoaded(true);
  }, [storageKey]);

  const handleRunTests = async () => {
    if (!isLoaded) return;
    setIsRunningTests(true);
    setExecutionError(null);
    try {
      const res = await runTests({ problemId, code });
      if (res.success) {
        setTestResults(res.testResults || []);
        setAllTestsPassed(res.allPassed || false);
        setHasRunTests(true);
      } else {
        setExecutionError(res.error || 'Gagal menjalankan pengujian.');
      }
    } catch {
      setExecutionError('Kesalahan jaringan saat menjalankan pengujian.');
    } finally {
      setIsRunningTests(false);
    }
  };

  const statusConfig = {
    pass: {
      bg: 'bg-green-900/20',
      border: 'border-green-700/40',
      text: 'text-green-300',
      icon: 'check_circle',
      iconColor: 'text-green-400',
      label: 'Jawaban Berhasil',
      desc: 'Semua kasus pengujian lulus saat pengiriman',
    },
    fail: {
      bg: 'bg-red-900/20',
      border: 'border-red-700/40',
      text: 'text-red-300',
      icon: 'cancel',
      iconColor: 'text-red-400',
      label: 'Jawaban Gagal',
      desc: 'Tidak semua kasus pengujian lulus saat pengiriman',
    },
    timeout: {
      bg: 'bg-orange-900/20',
      border: 'border-orange-700/40',
      text: 'text-orange-300',
      icon: 'timer_off',
      iconColor: 'text-orange-400',
      label: 'Waktu Habis',
      desc: 'Waktu pengerjaan habis, jawaban dikirim otomatis',
    },
  };

  const status = submissionStatus && statusConfig[submissionStatus] ? statusConfig[submissionStatus] : null;

  return (
    <div className="flex flex-col h-full relative">
      {/* Top bar */}
      <div className="flex bg-[#252526] border-b border-[#333333] px-4 py-2 items-center justify-between z-10 gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex gap-2 flex-shrink-0">
            <span className="text-white text-xs font-mono bg-[#1e1e1e] border border-[#333333] px-3 py-1 rounded flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-amber-400">lock</span>
              main.py
              <span className="text-[10px] text-amber-500 font-bold uppercase">[Baca Saja]</span>
            </span>
          </div>
          {nim && (
            <div className="text-xs text-zinc-500 font-mono truncate">
              NIM: <span className="text-zinc-300">{nim}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Status badge */}
          {status && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${status.bg} ${status.border}`}>
              <span className={`material-symbols-outlined text-base ${status.iconColor}`}>{status.icon}</span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${status.text}`}>{status.label}</span>
            </div>
          )}

          {/* Run tests button */}
          <button
            onClick={handleRunTests}
            disabled={isRunningTests || !isLoaded}
            className="bg-[#333333] text-white px-3 py-1 rounded text-xs font-semibold hover:bg-[#444444] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">fact_check</span>
            {isRunningTests ? 'Sedang Menguji...' : 'Uji Ulang Kode'}
          </button>
        </div>
      </div>

      {/* Editor + panel */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Monaco editor — read only */}
        <div className="flex-[2] relative overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              readOnly: true,
              padding: { top: 16, bottom: 16 },
              fontFamily: "'Fira Code', 'Courier New', monospace",
              fontLigatures: true,
              domReadOnly: true,
              cursorStyle: 'line',
            }}
          />
        </div>

        {/* Bottom panel: test results */}
        <div className="flex-1 min-h-[150px] bg-[#1e1e1e] border-t border-[#333333] flex flex-col overflow-hidden">
          <div className="bg-[#252526] px-2 flex items-center border-b border-[#333333] justify-between">
            <div className="flex">
              <button
                onClick={() => setActiveTab('tests')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'tests' ? 'text-[#007acc] border-b-2 border-[#007acc]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Kasus Pengujian {testResults.length > 0 && `(${testResults.filter(r => r.passed).length}/${testResults.length})`}
              </button>
            </div>
            {hasRunTests && (
              <div className="pr-2">
                <button
                  onClick={() => { setTestResults([]); setHasRunTests(false); }}
                  title="Reset hasil pengujian"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">block</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0">
            <div className="flex flex-col h-full">
              {/* Summary bar */}
              {testResults.length > 0 && (
                <div className={`flex-shrink-0 px-4 py-3 border-b border-[#333333] ${allTestsPassed ? 'bg-green-900/20' : 'bg-red-900/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-lg ${allTestsPassed ? 'text-green-400' : 'text-red-400'}`}>
                        {allTestsPassed ? 'check_circle' : 'cancel'}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {testResults.filter(r => r.passed).length} / {testResults.length} kasus pengujian lulus
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {testResults.map((r, i) => (
                        <div
                          key={i}
                          title={`#${i + 1} ${r.passed ? 'Lulus' : 'Gagal'}`}
                          className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center cursor-default select-none transition-all ${
                            r.passed ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                          }`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="w-full bg-[#333333] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${allTestsPassed ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${(testResults.filter(r => r.passed).length / testResults.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4">
                {executionError && (
                  <div className="bg-red-900/20 border border-red-900 text-red-500 p-3 rounded mb-4 font-mono text-xs whitespace-pre-wrap">
                    {executionError}
                  </div>
                )}

                {testResults.length === 0 && !executionError && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-8 gap-3">
                    <span className="material-symbols-outlined text-4xl text-zinc-700">fact_check</span>
                    <p className="text-sm italic">
                      {!hasRunTests
                        ? 'Klik "Uji Ulang Kode" untuk menjalankan kode mahasiswa terhadap semua kasus pengujian.'
                        : 'Belum ada hasil pengujian.'}
                    </p>
                    {nim && (
                      <p className="text-[10px] text-zinc-700 uppercase tracking-widest">
                        Kode dari: {nim}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid gap-3">
                  {testResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg overflow-hidden transition-all ${
                        result.passed ? 'bg-green-900/10 border-green-900/40' : 'bg-red-900/10 border-red-900/40'
                      }`}
                    >
                      <div className={`flex items-center gap-3 px-3 py-2 border-b ${
                        result.passed ? 'border-green-900/30 bg-green-900/20' : 'border-red-900/30 bg-red-900/20'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          result.passed ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                          <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>
                            {result.passed ? 'check' : 'close'}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-white flex-1">Kasus #{idx + 1}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                          {result.passed ? '✓ Lulus' : '✗ Gagal'}
                        </span>
                      </div>

                      {result.testScript && (
                        <details className="px-3 pt-2 pb-1">
                          <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors select-none flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>code</span>
                            Lihat skrip pengujian
                          </summary>
                          <pre className="mt-2 bg-black/30 p-2 rounded text-[10px] text-green-300 font-mono whitespace-pre-wrap overflow-x-auto border border-[#333333]">{result.testScript}</pre>
                        </details>
                      )}

                      {result.passed && result.actualOutput && (
                        <div className="px-3 pb-3 pt-1">
                          <span className="text-[10px] text-zinc-500 block mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-green-500" style={{ fontSize: '11px' }}>terminal</span>
                            Output:
                          </span>
                          <div className="text-[11px] font-mono text-green-300 bg-black/20 p-2 rounded overflow-x-auto whitespace-pre border border-green-900/20">
                            {result.actualOutput || '(tidak ada output)'}
                          </div>
                        </div>
                      )}

                      {!result.passed && result.error && (
                        <div className="px-3 pb-3 pt-1">
                          <span className="text-[10px] text-zinc-500 block mb-1">Error:</span>
                          <div className="text-[11px] font-mono text-red-400 bg-black/40 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                            {result.error}
                          </div>
                        </div>
                      )}

                      {!result.passed && result.actualOutput && (
                        <div className="px-3 pb-3">
                          <span className="text-[10px] text-zinc-500 block mb-1">Output yang Dihasilkan:</span>
                          <div className="text-[11px] font-mono text-zinc-300 bg-black/40 p-2 rounded overflow-x-auto whitespace-pre">
                            {result.actualOutput}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

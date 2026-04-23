'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { submitCode, runTests, runCode, stopCode, autoSubmitOnExpire, getExecutionStatus, sendStdin } from "@/app/actions/submission";
import { getProblemStatus } from "@/app/actions/problem";
import { useRouter } from "next/navigation";
import Timer from "../../components/Timer";
import Editor from '@monaco-editor/react';

type ProblemPhase = 'not_started' | 'in_progress' | 'ended';

interface EditorClientProps {
  problemId: number;
  endTime?: Date | null;
  duration?: number | null;
  timingMode: 'scheduled' | 'manual';
  startTime?: Date | null;
}

function computePhase(
  timingMode: 'scheduled' | 'manual',
  startTime: Date | null | undefined,
  endTime: Date | null | undefined,
  duration: number | null | undefined
): { phase: ProblemPhase; effectiveEndTime: Date | null } {
  const now = new Date();

  if (timingMode === 'scheduled') {
    const start = startTime ? new Date(startTime) : null;
    const end = endTime ? new Date(endTime) : null;

    if (start && now < start) {
      return { phase: 'not_started', effectiveEndTime: end };
    }
    if (end && now > end) {
      return { phase: 'ended', effectiveEndTime: end };
    }
    return { phase: 'in_progress', effectiveEndTime: end };
  }

  if (!startTime) {
    return { phase: 'not_started', effectiveEndTime: null };
  }

  const start = new Date(startTime);
  if (duration) {
    const end = new Date(start.getTime() + duration * 60000);
    if (now > end) {
      return { phase: 'not_started', effectiveEndTime: null };
    }
    return { phase: 'in_progress', effectiveEndTime: end };
  }

  return { phase: 'in_progress', effectiveEndTime: null };
}

export default function EditorClient({ problemId, endTime, duration, timingMode, startTime }: EditorClientProps) {
  const router = useRouter();

  const initial = computePhase(timingMode, startTime, endTime, duration);

  const [phase, setPhase] = useState<ProblemPhase>(initial.phase);
  const [effectiveEndTime, setEffectiveEndTime] = useState<Date | null>(initial.effectiveEndTime);
  const [currentStartTime, setCurrentStartTime] = useState<Date | null>(startTime ? new Date(startTime) : null);

  const [code, setCode] = useState("def solve():\n    # Tulis kode Python Anda di sini\n    pass\n\nsolve()\n");
  const [nim, setNim] = useState("");
  const [tempNim, setTempNim] = useState("");
  const [isNimLocked, setIsNimLocked] = useState(true);
  const [stdin, setStdin] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);

  const [allTestsPassed, setAllTestsPassed] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<{ stdout: string; stderr: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'tests' | 'console' | 'input'>('tests');
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [interactiveInput, setInteractiveInput] = useState("");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoPromptRef = useRef<number>(0);

  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleOutput]);

  useEffect(() => {
    if (!isNimLocked && phase === 'in_progress') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "Peringatan: Memuat ulang halaman dapat menyebabkan hilangnya kemajuan pengerjaan. Apakah Anda yakin?";
        return e.returnValue;
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [isNimLocked, phase]);

  useEffect(() => {
    if (timingMode !== 'manual' || phase === 'in_progress') return;

    const interval = setInterval(async () => {
      const status = await getProblemStatus(problemId);
      if (status?.startTime) {
        const newStart = new Date(status.startTime);
        setCurrentStartTime(newStart);

        const newPhase = computePhase(timingMode, newStart, endTime, duration);
        setPhase(newPhase.phase);
        setEffectiveEndTime(newPhase.effectiveEndTime);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [timingMode, phase, problemId, endTime, duration]);

  useEffect(() => {
    if (timingMode !== 'scheduled') return;
    if (phase === 'ended') return;

    const interval = setInterval(() => {
      const newPhase = computePhase(timingMode, currentStartTime, endTime, duration);
      if (newPhase.phase !== phase) {
        setPhase(newPhase.phase);
        setEffectiveEndTime(newPhase.effectiveEndTime);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [timingMode, phase, currentStartTime, endTime, duration]);

  const handleStartChallenge = () => {
    if (!tempNim.trim()) {
      alert("Silakan masukkan Nomor Induk Mahasiswa (NIM) Anda.");
      return;
    }
    setNim(tempNim);
    setIsNimLocked(false);
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    setActiveTab('tests');
    setExecutionError(null);
    try {
      const res = await runTests({ problemId, code });
      if (res.success) {
        setTestResults(res.testResults || []);
        setAllTestsPassed(res.allPassed || false);
      } else {
        setExecutionError(res.error || "Gagal menjalankan pengujian.");
      }
    } catch {
      setExecutionError("Kesalahan jaringan saat menjalankan pengujian.");
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleRunCode = async () => {
    const id = `exec-${Date.now()}`;
    setExecutionId(id);
    setIsExecuting(true);
    setActiveTab('console');
    setConsoleOutput({ stdout: 'Sedang menyiapkan lingkungan...', stderr: '' });
    
    try {
      const res = await runCode({ code, executionId: id, input: stdin });
      if (res.success) {
        startPolling(id);
      } else {
        setConsoleOutput({ stdout: '', stderr: 'Gagal memulai eksekusi.' });
        setIsExecuting(false);
        setExecutionId(null);
      }
    } catch {
      setConsoleOutput({ stdout: '', stderr: 'Kesalahan jaringan.' });
      setIsExecuting(false);
      setExecutionId(null);
    }
  };

  const startPolling = (id: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await getExecutionStatus(id);
        if (res.success && 'stdout' in res) {
          const newStdout = res.stdout || '';
          const newStderr = res.stderr || '';
          setConsoleOutput({ stdout: newStdout, stderr: newStderr });

          if (!res.isFinished && newStdout.length > lastAutoPromptRef.current) {
            const lastPart = newStdout.trimEnd();
            const lastChar = newStdout.slice(-1);
            
            const looksLikePrompt = 
              lastPart.length > 0 && 
              lastChar !== '\n' && 
              (lastPart.endsWith(':') || lastPart.endsWith('?') || lastPart.endsWith('>') || lastPart.length < 50);

            if (looksLikePrompt) {
              lastAutoPromptRef.current = newStdout.length;
              setTimeout(() => {
                const val = window.prompt(`Program meminta input:\n\n${lastPart.slice(-100)}`);
                if (val !== null) {
                  sendStdin(id, val);
                }
              }, 100);
            }
          }

          if (res.isFinished) {
            stopPolling();
            setIsExecuting(false);
            setExecutionId(null);
            lastAutoPromptRef.current = 0;
          }
        } else {
          stopPolling();
          setIsExecuting(false);
          setExecutionId(null);
          lastAutoPromptRef.current = 0;
        }
      } catch {
        stopPolling();
      }
    }, 600);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleSendInteractiveStdin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executionId || !interactiveInput.trim()) return;
    
    const textToSend = interactiveInput;
    setInteractiveInput("");
    
    try {
      await sendStdin(executionId, textToSend);
    } catch {
      console.error("Gagal mengirimkan input ke proses.");
    }
  };

  const handleStopCode = async () => {
    if (!executionId) return;
    try {
      stopPolling();
      await stopCode(executionId);
      setConsoleOutput(prev => ({
        stdout: (prev?.stdout || '') + '\n[Eksekusi dihentikan oleh pengguna]',
        stderr: prev?.stderr || '',
      }));
    } catch {
      console.error("Gagal menghentikan eksekusi kode.");
    } finally {
      setIsExecuting(false);
      setExecutionId(null);
    }
  };

  const handleSubmit = async () => {
    if (!allTestsPassed) {
      alert("Semua kasus pengujian harus lulus sebelum mengirimkan jawaban.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await submitCode({ nim, problemId, code });
      if (res.success) {
        alert("Jawaban berhasil dikirimkan! Mengalihkan ke halaman utama...");
        router.push('/');
      } else {
        alert("Pengiriman jawaban gagal: " + res.error);
      }
    } catch {
      alert("Kesalahan jaringan saat mengirimkan jawaban.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeExpire = useCallback(async () => {
    if (isReadOnly || hasAutoSubmitted) return;

    setIsReadOnly(true);

    if (nim) {
      setHasAutoSubmitted(true);
      await autoSubmitOnExpire({ nim, problemId, code });
      setTimeoutMessage(
        "⏰ Waktu Telah Habis! Jawaban Anda saat ini telah dikirimkan secara otomatis (status: gagal). Halaman kini bersifat baca-saja."
      );
    } else {
      if (timingMode === 'manual') {
        setPhase('not_started');
        setEffectiveEndTime(null);
        setCurrentStartTime(null);
        setIsReadOnly(false);
      } else {
        setPhase('ended');
      }
    }
  }, [isReadOnly, hasAutoSubmitted, nim, problemId, code, timingMode]);

  const canInteract = phase === 'in_progress' && !isNimLocked && !isReadOnly;
  const canRunTests = canInteract && !isRunningTests && !isSubmitting && !isExecuting;
  const canSubmit = canInteract && allTestsPassed && !isSubmitting && !isRunningTests && !isExecuting;
  const canRunCode = !isExecuting && !isReadOnly;

  const renderPhaseOverlay = () => {
    if (timeoutMessage) {
      return (
        <div className="absolute inset-0 bg-[#1e1e1e]/95 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-[#252526] border border-red-900/50 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-400 text-3xl">timer_off</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Waktu Telah Habis!</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">{timeoutMessage}</p>
            <div className="mt-6 pt-6 border-t border-[#333333]">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                Anda masih dapat melihat soal dan kode Anda.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (phase === 'ended' && timingMode === 'scheduled') {
      const closedAt = endTime ? new Date(endTime).toLocaleString('id-ID', {
        dateStyle: 'full', timeStyle: 'short'
      }) : 'waktu yang telah ditentukan';
      return (
        <div className="absolute inset-0 bg-[#1e1e1e]/95 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-[#252526] border border-[#333333] rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-zinc-400 text-3xl">lock</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Soal Telah Ditutup</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Pengerjaan soal ini telah berakhir pada <span className="text-zinc-200 font-semibold">{closedAt}</span>.
              Anda tidak dapat lagi mengakses atau mengerjakan soal ini.
            </p>
            <div className="mt-6 pt-6 border-t border-[#333333]">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Silakan hubungi tenaga pengajar untuk informasi lebih lanjut.</p>
            </div>
          </div>
        </div>
      );
    }

    if (phase === 'in_progress' && isNimLocked) {
      return (
        <div className="absolute inset-0 bg-[#1e1e1e]/95 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-[#252526] border border-[#333333] rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Siap untuk Memulai?</h2>
            <p className="text-zinc-400 mb-8 text-sm">Masukkan Nomor Induk Mahasiswa (NIM) Anda untuk membuka ruang kerja dan mulai mengerjakan soal.</p>

            <div className="mb-6 text-left">
              <label className="block text-zinc-500 text-xs font-bold uppercase mb-2">NIM Mahasiswa</label>
              <input
                type="text"
                value={tempNim}
                onChange={(e) => setTempNim(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartChallenge()}
                autoFocus
                placeholder="Contoh: 2501928392"
                className="w-full bg-[#1e1e1e] border border-[#333333] text-white rounded-lg p-4 focus:outline-none focus:border-[#007acc] font-mono text-lg"
              />
            </div>

            <button
              onClick={handleStartChallenge}
              className="w-full bg-[#007acc] text-white py-4 rounded-lg font-bold text-lg hover:bg-[#005f9e] transition-all shadow-lg hover:shadow-[#007acc]/20"
            >
              Mulai Pengerjaan
            </button>
            <p className="mt-4 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
              NIM tidak dapat diubah setelah sesi dimulai.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderPhaseStatusBar = () => {
    if (phase === 'not_started') {
      if (timingMode === 'manual') {
        return (
          <div className="flex items-center gap-2 bg-purple-900/30 border border-purple-900/50 px-3 py-1 rounded-full animate-pulse">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span className="text-[10px] text-purple-200 font-bold uppercase tracking-widest">Menunggu Administrator Memulai Sesi</span>
          </div>
        );
      }
      if (timingMode === 'scheduled' && currentStartTime) {
        return (
          <Timer
            startTime={currentStartTime}
            mode="countdown-to-start"
            onExpire={() => {
              const newPhase = computePhase(timingMode, currentStartTime, endTime, duration);
              setPhase(newPhase.phase);
              setEffectiveEndTime(newPhase.effectiveEndTime);
            }}
          />
        );
      }
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full relative">
      {renderPhaseOverlay()}

      <div className="flex bg-[#252526] border-b border-[#333333] px-4 py-2 items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <span className="text-white text-xs font-mono bg-[#1e1e1e] border border-[#333333] px-3 py-1 rounded">main.py</span>
          </div>
          <div className="h-6 w-[1px] bg-[#333333]"></div>
          {nim && (
            <div className="text-xs text-zinc-500 font-mono">
              NIM: <span className="text-zinc-300">{nim}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {renderPhaseStatusBar()}

          {phase === 'in_progress' && effectiveEndTime && (
            <Timer endTime={effectiveEndTime} onExpire={handleTimeExpire} />
          )}

          <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded border border-[#333333]">
            {isExecuting ? (
              <button
                onClick={handleStopCode}
                className="bg-red-600/20 text-red-500 px-3 py-1 rounded text-xs font-bold hover:bg-red-600/30 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">stop</span>
                Berhenti
              </button>
            ) : (
              <button
                onClick={handleRunCode}
                disabled={!canRunCode || isRunningTests || isSubmitting}
                className="bg-[#333333] text-white px-3 py-1 rounded text-xs font-semibold hover:bg-[#444444] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                Jalankan
              </button>
            )}

            <button
              onClick={handleRunTests}
              disabled={!canRunTests}
              title={phase !== 'in_progress' ? (timingMode === 'manual' ? 'Menunggu administrator memulai sesi' : 'Pengerjaan soal belum dimulai') : ''}
              className="bg-[#333333] text-white px-3 py-1 rounded text-xs font-semibold hover:bg-[#444444] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">fact_check</span>
              {isRunningTests ? 'Sedang Menguji...' : 'Jalankan Pengujian'}
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`px-4 py-1.5 rounded text-sm font-bold transition-all flex items-center gap-2 ${
              canSubmit
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20'
                : 'bg-[#1e1e1e] text-zinc-600 border border-[#333333] cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-sm">cloud_upload</span>
            {isSubmitting ? 'Sedang Mengirim...' : 'Kirimkan'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-[2] relative overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              readOnly: isRunningTests || isSubmitting || isExecuting || isReadOnly,
              padding: { top: 16, bottom: 16 },
              fontFamily: "'Fira Code', 'Courier New', monospace",
              fontLigatures: true,
            }}
          />
        </div>

        <div className="flex-1 min-h-[150px] bg-[#1e1e1e] border-t border-[#333333] flex flex-col overflow-hidden">
          <div className="bg-[#252526] px-2 flex items-center border-b border-[#333333] justify-between">
            <div className="flex">
              <button
                onClick={() => setActiveTab('tests')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'tests' ? 'text-[#007acc] border-b-2 border-[#007acc]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Kasus Pengujian {testResults.length > 0 && `(${testResults.filter(r => r.passed).length}/${testResults.length})`}
              </button>
              <button
                onClick={() => setActiveTab('console')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'console' ? 'text-[#007acc] border-b-2 border-[#007acc]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Konsol {isExecuting && <span className="inline-block w-2 h-2 bg-[#007acc] rounded-full ml-1 animate-pulse"></span>}
              </button>
              <button
                onClick={() => setActiveTab('input')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'input' ? 'text-[#007acc] border-b-2 border-[#007acc]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Masukan (Stdin)
              </button>
            </div>
            <div className="flex items-center gap-2 pr-2">
              <button
                onClick={() => { setTestResults([]); setConsoleOutput(null); setStdin(""); }}
                title="Bersihkan semua"
              >
                <span className="material-symbols-outlined text-sm">block</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0">
            {activeTab === 'tests' ? (
              <div className="p-4">
                {executionError && (
                  <div className="bg-red-900/20 border border-red-900 text-red-500 p-3 rounded mb-4 font-mono text-xs whitespace-pre-wrap">
                    {executionError}
                  </div>
                )}

                {testResults.length === 0 && !executionError && (
                  <div className="h-full flex items-center justify-center text-zinc-600 italic text-sm py-8">
                    {phase !== 'in_progress'
                      ? (timingMode === 'manual'
                          ? 'Pengujian hanya dapat dijalankan setelah administrator memulai sesi.'
                          : phase === 'ended'
                            ? 'Sesi pengerjaan telah berakhir.'
                            : 'Fungsi pengujian akan aktif saat sesi dimulai.')
                      : 'Belum ada hasil pengujian. Klik "Jalankan Pengujian" untuk memulai.'}
                  </div>
                )}

                <div className="grid gap-3">
                  {testResults.map((result, idx) => (
                    <div key={idx} className={`border rounded p-3 ${result.passed ? 'bg-green-900/10 border-green-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-white">Kasus Pengujian #{idx + 1} ({result.type})</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${result.passed ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                          {result.passed ? 'LULUS' : 'GAGAL'}
                        </span>
                      </div>
                      {result.error && (
                        <div className="text-[11px] font-mono text-red-400 bg-black/40 p-2 rounded mt-2 overflow-x-auto">
                          {result.error}
                        </div>
                      )}
                      {!result.passed && result.actualOutput && (
                        <div className="mt-2">
                          <span className="text-[10px] text-zinc-500 block mb-1">Keluaran Aktual:</span>
                          <div className="text-[11px] font-mono text-zinc-300 bg-black/40 p-2 rounded overflow-x-auto whitespace-pre">
                            {result.actualOutput}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === 'console' ? (
              <div className="bg-black/20 font-mono text-sm p-4 text-zinc-300 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar mb-2">
                  {!consoleOutput && (
                    <div className="flex items-center justify-center text-zinc-600 italic text-sm py-4">
                      Konsol kosong. Klik "Jalankan" untuk melihat keluaran program.
                    </div>
                  )}
                  {consoleOutput && (
                    <div className="whitespace-pre-wrap break-all">
                      {consoleOutput.stdout && <div className="text-zinc-100 font-mono">{consoleOutput.stdout}</div>}
                      {consoleOutput.stderr && <div className="text-red-400 mt-2 font-mono">{consoleOutput.stderr}</div>}
                      <div ref={consoleEndRef} />
                    </div>
                  )}
                </div>

                {isExecuting && (
                  <div className="flex-shrink-0 mt-2 border-t border-[#333333] pt-4 flex justify-center">
                    <button 
                      onClick={() => {
                        const val = window.prompt("Program sedang menunggu input. Masukkan teks di sini:");
                        if (val !== null) {
                          sendStdin(executionId!, val);
                        }
                      }}
                      className="bg-[#007acc] hover:bg-[#005f9e] text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">keyboard</span>
                      Kirim Input ke Program
                    </button>
                    <p className="hidden md:block absolute right-4 text-[9px] text-zinc-500 uppercase font-bold tracking-widest mt-2 animate-pulse">
                      Menunggu Input...
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 h-full flex flex-col">
                <label className="block text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">Masukan Standar (Stdin)</label>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  className="flex-1 bg-[#1e1e1e] border border-[#333333] text-zinc-300 p-4 font-mono text-sm focus:outline-none focus:border-[#007acc] rounded resize-none"
                  placeholder="Ketikkan data input di sini. Setiap input() akan membaca satu baris dari sini..."
                />
                <p className="mt-2 text-[10px] text-zinc-600 italic">Input ini akan dikirimkan ke program saat Anda mengeklik tombol "Jalankan".</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

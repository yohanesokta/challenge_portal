'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { submitCode, runTests, runCode, stopCode, autoSubmitOnExpire, getExecutionStatus, sendStdin, logCheatEvent } from "@/app/actions/submission";
import { getProblemStatus } from "@/app/actions/problem";
import { updateUserNim } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import Timer from "../../components/Timer";
import Editor from '@monaco-editor/react';

// Singleton instance to prevent multiple workers & memory leaks
let pyrightProvider: any = null;
let pyrightPromise: Promise<any> | null = null;

type ProblemPhase = 'not_started' | 'in_progress' | 'ended';

interface EditorClientProps {
  problemId: string;
  endTime?: Date | null;
  duration?: number | null;
  timingMode: 'scheduled' | 'manual';
  startTime?: Date | null;
  solutionType?: 'function' | 'class' | 'bebas';
  functionName?: string;
  className?: string;
  userNim?: string;
  userId?: string;
  authEnabled?: boolean;
  antiCheatEnabled?: boolean;
}


function getStarterCode(solutionType?: string, functionName?: string, className?: string): string {
  if (solutionType === 'function') {
    const fn = functionName || 'solve';
    return `def ${fn}():
    # Tulis kode Python Anda di sini
    pass
`;
  }
  if (solutionType === 'class') {
    const cls = className || 'Solution';
    return `class ${cls}:
    def __init__(self):
        # Inisialisasi atribut jika diperlukan
        pass

    # Tambahkan method sesuai instruksi
`;
  }
  // bebas
  return `# Tulis kode Python Anda di sini

`;
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

export default function EditorClient({ problemId, endTime, duration, timingMode, startTime, solutionType, functionName, className, userNim, userId, authEnabled, antiCheatEnabled }: EditorClientProps) {

  const router = useRouter();

  const [isGoAppRunning, setIsGoAppRunning] = useState(false);
  const [checkingComponents, setCheckingComponents] = useState(antiCheatEnabled);
  const [isMounted, setIsMounted] = useState(false);

  const [reviewModal, setReviewModal] = useState<{
    code: string;
    nim: string;
    status: 'pass' | 'fail' | 'timeout';
  } | null>(null);
  const [reviewTestResults, setReviewTestResults] = useState<any[]>([]);
  const [reviewAllPassed, setReviewAllPassed] = useState(false);
  const [isRunningReviewTests, setIsRunningReviewTests] = useState(false);
  const [reviewTestError, setReviewTestError] = useState<string | null>(null);
  const [reviewHasRunTests, setReviewHasRunTests] = useState(false);

  const openReviewModal = (submittedCode: string, submittedNim: string, status: 'pass' | 'fail' | 'timeout') => {
    setReviewModal({ code: submittedCode, nim: submittedNim, status });
    setReviewTestResults([]);
    setReviewAllPassed(false);
    setReviewTestError(null);
    setReviewHasRunTests(false);
  };

  const handleRunReviewTests = async (codeToTest: string) => {
    setIsRunningReviewTests(true);
    setReviewTestError(null);
    try {
      const res = await runTests({ problemId, code: codeToTest });
      if (res.success) {
        setReviewTestResults(res.testResults || []);
        setReviewAllPassed(res.allPassed || false);
        setReviewHasRunTests(true);
      } else {
        setReviewTestError(res.error || 'Gagal menjalankan pengujian.');
      }
    } catch {
      setReviewTestError('Kesalahan jaringan saat menjalankan pengujian.');
    } finally {
      setIsRunningReviewTests(false);
    }
  };

  const [phase, setPhase] = useState<ProblemPhase>('not_started');
  const [effectiveEndTime, setEffectiveEndTime] = useState<Date | null>(null);
  const [currentStartTime, setCurrentStartTime] = useState<Date | null>(startTime ? new Date(startTime) : null);

  useEffect(() => {
    setIsMounted(true);
    const initial = computePhase(timingMode, startTime, endTime, duration);
    setPhase(initial.phase);
    setEffectiveEndTime(initial.effectiveEndTime);
  }, [timingMode, startTime, endTime, duration]);

  const [code, setCode] = useState(() => getStarterCode(solutionType, functionName, className));
  const [nim, setNim] = useState(userNim || "");
  const [tempNim, setTempNim] = useState(userNim || "");
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
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptContent, setPromptContent] = useState("");

  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blurStartTimeRef = useRef<number | null>(null);
  const awayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showCheatWarning = useCallback((message: string, duration: number) => {
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    setCheatWarning(message);
    warningTimeoutRef.current = setTimeout(() => {
      setCheatWarning(null);
      warningTimeoutRef.current = null;
    }, duration);
  }, []);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (!antiCheatEnabled) return;

    const checkComponents = async () => {
      // Check Go App via fetch
      try {
        const res = await fetch("http://localhost:9012/ping", { signal: AbortSignal.timeout(1000) });
        if (res.ok) setIsGoAppRunning(true);
        else setIsGoAppRunning(false);
      } catch (e) {
        setIsGoAppRunning(false);
      }

      setCheckingComponents(false);
    };

    checkComponents();
    const interval = setInterval(checkComponents, 2000);
    return () => clearInterval(interval);
  }, [antiCheatEnabled]);

  useEffect(() => {
    return () => {
      if (pyrightProvider && editorRef.current) {
        console.log("Stopping Pyright diagnostics for instance...");
        pyrightProvider.stopDiagnostics();
      }
    };
  }, []);

  const getBrutalData = useCallback(async () => {
    let activeWindow = "Unknown";

    if (isGoAppRunning) {
      try {
        const res = await fetch("http://localhost:9012/status", { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          const data = await res.json();
          activeWindow = data.active_window || "Unknown";
        }
      } catch (e) {}
    }

    return { activeWindow };
  }, [isGoAppRunning]);

  useEffect(() => {
    if (phase !== 'in_progress' || isNimLocked || isReadOnly) return;

    let lastLogTime = 0;

    const handleViolation = async (type: string, baseDesc: string) => {
      const now = Date.now();
      // Only throttle if it's the SAME type, but for periodic checks we want them consistent
      if (type !== 'away_periodic' && now - lastLogTime < 1500) return;
      lastLogTime = now;

      let fullDesc = baseDesc;
      if (antiCheatEnabled) {
        const { activeWindow } = await getBrutalData();
        fullDesc += `\n[WINDOW]: ${activeWindow}`;
      }
      
      logCheatEvent({
        userId,
        problemId,
        eventType: type,
        description: fullDesc,
      });
    };

    const startAwayMonitoring = (type: string, initialDesc: string) => {
      if (awayIntervalRef.current) clearInterval(awayIntervalRef.current);
      
      blurStartTimeRef.current = Date.now();
      handleViolation(type, initialDesc);
      
      awayIntervalRef.current = setInterval(() => {
        const duration = Math.round((Date.now() - (blurStartTimeRef.current || Date.now())) / 1000);
        handleViolation('away_periodic', `Pengguna masih berada di luar tab/jendela (${duration} detik)`);
      }, 2000);
    };

    const stopAwayMonitoring = (type: string, returnDesc: string) => {
      if (awayIntervalRef.current) {
        clearInterval(awayIntervalRef.current);
        awayIntervalRef.current = null;
      }

      const startTime = blurStartTimeRef.current;
      if (startTime === null) return;
      blurStartTimeRef.current = null;

      const awayDuration = Math.round((Date.now() - startTime) / 1000);
      handleViolation(type, `${returnDesc} setelah ${awayDuration} detik`);
      
      const msg = awayDuration > 2 
        ? ` Peringatan: Anda meninggalkan pengerjaan selama ${awayDuration} detik. Aktivitas ini dilaporkan.`
        : " Anda kembali ke pengerjaan. Tetaplah di jendela ini.";
      
      showCheatWarning(msg, 4000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        startAwayMonitoring('tab_hidden', 'Tab disembunyikan / pengguna pindah tab');
        showCheatWarning(" Peringatan: Anda meninggalkan tab! Aktivitas ini dicatat.", 1000000); // Large duration while away
      } else {
        stopAwayMonitoring('tab_focus', 'Pengguna kembali ke tab');
      }
    };

    const handleBlur = () => {
      startAwayMonitoring('window_blur', 'Jendela kehilangan fokus (mungkin membuka aplikasi lain)');
      showCheatWarning(" Peringatan: Fokus beralih ke aplikasi lain! Tetaplah di jendela ini.", 1000000); // Large duration while away
    };

    const handleFocus = () => {
      stopAwayMonitoring('window_focus', 'Jendela kembali fokus');
    };

    const handleResize = () => {
      logCheatEvent({
        userId,
        problemId,
        eventType: 'window_resize',
        description: `Ukuran jendela diubah ke ${window.innerWidth}x${window.innerHeight} (Indikasi split-screen dengan aplikasi lain)`,
      });
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('resize', handleResize);

    const handlePaste = (e: ClipboardEvent) => {
      const pastedData = e.clipboardData?.getData('text') || '';
      if (pastedData.length > 10) { // Only log significant pastes
        logCheatEvent({
          userId,
          problemId,
          eventType: 'paste',
          description: `Pengguna menempelkan teks sepanjang ${pastedData.length} karakter`,
        });
        showCheatWarning(" Peringatan: Menempelkan kode (copy-paste) terdeteksi dan dicatat.", 5000);
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      if (awayIntervalRef.current) clearInterval(awayIntervalRef.current);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('paste', handlePaste);
    };
  }, [phase, isNimLocked, isReadOnly, userId, problemId]);

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

  const handleStartChallenge = async () => {
    if (!tempNim.trim()) {
      alert("Silakan masukkan Nomor Induk Mahasiswa (NIM) Anda.");
      return;
    }

    // If user has no NIM in DB, update it now
    if (authEnabled && !userNim) {
      try {
        const res = await updateUserNim(tempNim);
        if (res.error) {
          alert(res.error);
          return;
        }
      } catch (err) {
        alert("Gagal menyimpan NIM ke profil.");
        return;
      }
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

            if (looksLikePrompt && !showPrompt) {
              lastAutoPromptRef.current = newStdout.length;
              setPromptContent(lastPart.slice(-100));
              setShowPrompt(true);
            }
          }

          if (res.isFinished) {
            stopPolling();
            setIsExecuting(false);
            setExecutionId(null);
            lastAutoPromptRef.current = 0;
            setShowPrompt(false);
          }
        } else {
          stopPolling();
          setIsExecuting(false);
          setExecutionId(null);
          lastAutoPromptRef.current = 0;
          setShowPrompt(false);
        }
      } catch {
        stopPolling();
        setShowPrompt(false);
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
      setShowPrompt(false);
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
      const res = await submitCode({ nim, problemId, code, userId });
      if (res.success) {

        openReviewModal(code, nim, res.allPassed ? 'pass' : 'fail');
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
      const snapshotCode = code; // capture current code before state changes
      await autoSubmitOnExpire({ nim, problemId, code: snapshotCode, userId });
      openReviewModal(snapshotCode, nim, 'timeout');

      setTimeoutMessage(
        "⏰ Waktu Telah Habis! Jawaban telah dikirimkan otomatis. Halaman kini bersifat baca-saja."
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
    if (antiCheatEnabled && !isGoAppRunning && !checkingComponents) {
        return (
          <div className="absolute inset-0 bg-[#1e1e1e]/95 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
            <div className={`bg-[#252526] border border-red-600/50 rounded-xl p-8 ${!isGoAppRunning ? 'max-w-4xl' : 'max-w-lg'} w-full shadow-2xl text-center`}>
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-red-500 text-4xl">security</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Anti-Cheat Wajib Digunakan</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed text-sm">
                Soal ini mewajibkan penggunaan sistem proteksi <strong>OctaAnticheat</strong>.
              </p>
              
              <div className="flex flex-col md:flex-row gap-8 items-stretch mb-8">
                {/* Left Column: Status & Warnings */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className={`flex items-center justify-between p-4 rounded-lg border transition-all ${isGoAppRunning ? 'bg-green-900/10 border-green-600/30' : 'bg-zinc-800 border-[#333333]'}`}>
                      <div className="flex items-center gap-3 text-left">
                        <span className={`material-symbols-outlined ${isGoAppRunning ? 'text-green-500' : 'text-zinc-500'}`}>
                          {isGoAppRunning ? 'check_circle' : 'terminal'}
                        </span>
                        <div>
                          <p className={`text-sm font-bold ${isGoAppRunning ? 'text-green-400' : 'text-zinc-300'}`}>OctaAnticheat System App</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Native Process Scanner</p>
                        </div>
                      </div>
                      {!isGoAppRunning && (
                        <a href="https://github.com/yohanesokta/Codelab-JAI/releases/download/1.0/octaAnticheat.exe" className="text-[10px] font-bold text-blue-400 hover:underline uppercase flex-shrink-0">Download</a>
                      )}
                    </div>

                    {!isGoAppRunning ? (
                      <div className="bg-orange-900/10 border border-orange-900/30 p-4 rounded-lg text-left">
                        <p className="text-xs text-orange-400 leading-tight">
                          <strong>Penting:</strong> Pastikan aplikasi OctaAnticheat sudah berjalan di latar belakang. Halaman akan mendeteksi secara otomatis.
                        </p>
                      </div>
                    ) : (
                      <p className="text-green-500 font-bold animate-pulse text-sm">Sistem siap! Anda bisa melanjutkan.</p>
                    )}
                  </div>

                  <button
                    disabled={!isGoAppRunning}
                    onClick={() => setCheckingComponents(false)}
                    className={`w-full py-4 rounded-lg font-bold text-lg transition-all shadow-lg ${
                      isGoAppRunning
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20'
                        : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    Mulai Mengerjakan
                  </button>
                </div>

                {/* Right Column: How to Run Image */}
                {!isGoAppRunning && (
                  <div className="flex-1 flex flex-col border-t md:border-t-0 md:border-l border-[#333333] pt-6 md:pt-0 md:pl-8 text-left">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">Cara Menjalankan Secara Manual</p>
                    <div className="rounded-lg overflow-hidden border border-[#333333] bg-black/20 group cursor-zoom-in h-full">
                      <img 
                        src="/howtorun.png" 
                        alt="Cara Menjalankan OctaAnticheat" 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
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
              Anda tidak dapat lagi mengakses or mengerjakan soal ini.
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
            
            {userNim ? (
              <div className="mb-8">
                <p className="text-zinc-400 mb-6 text-sm leading-relaxed">Selamat datang kembali! Anda terdaftar dengan NIM di bawah ini. Klik tombol untuk mulai mengerjakan.</p>
                <div className="bg-[#1e1e1e] border border-[#333333] rounded-lg p-4 mb-2">
                  <span className="block text-zinc-500 text-[10px] font-bold uppercase mb-1 tracking-widest">NIM Terdaftar</span>
                  <span className="text-white font-mono text-xl">{userNim}</span>
                </div>
              </div>
            ) : (
              <div className="mb-8 text-left">
                <p className="text-zinc-400 mb-6 text-sm text-center">Silakan masukkan Nomor Induk Mahasiswa (NIM) Anda untuk membuka ruang kerja dan mulai mengerjakan soal.</p>
                <label className="block text-zinc-500 text-[10px] font-bold uppercase mb-2 tracking-widest">NIM Mahasiswa</label>
                <input
                  type="text"
                  value={tempNim}
                  onChange={(e) => setTempNim(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartChallenge()}
                  autoFocus
                  placeholder="Contoh: 2501928392"
                  className="w-full bg-[#1e1e1e] border border-[#333333] text-white rounded-lg p-4 focus:outline-none focus:border-green-600 font-mono text-lg"
                />
              </div>
            )}

            <button
              onClick={handleStartChallenge}
              className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-green-900/20"
            >
              {userNim ? 'Kerjakan Sekarang' : 'Mulai Pengerjaan'}
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
      
      {cheatWarning && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-red-400">
            <span className="material-symbols-outlined animate-bounce">warning</span>
            <span className="text-sm font-bold whitespace-nowrap">{cheatWarning}</span>
          </div>
        </div>
      )}

      <div className="flex bg-[#252526] border-b border-[#333333] px-4 py-2 items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <span className="text-white text-xs font-mono bg-[#1e1e1e] border border-[#333333] px-3 py-1 rounded flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-blue-400">description</span>
              main.py
            </span>
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
            onMount={async (editor, monaco) => {
              editorRef.current = editor;
              // Initialize Real Python IntelliSense using Pyright LSP (Singleton Pattern)
              if (!pyrightPromise) {
                pyrightPromise = (async () => {
                  console.log("Starting Pyright LSP initialization...");
                  try {
                    const { MonacoPyrightProvider } = await import('monaco-pyright-lsp');
                    
                    // Fetch the typeshed fallback zip as ArrayBuffer
                    console.log("Fetching typeshed assets...");
                    const response = await fetch('/typeshed-fallback.zip');
                    const typeshedData = await response.arrayBuffer();
                    
                    const workerUrl = new URL('/pyright.worker.js', window.location.origin).toString();
                    const provider = new MonacoPyrightProvider(workerUrl, {
                      typeshed: typeshedData
                    });
                    
                    console.log("Provider instanced, calling init...");
                    await provider.init(monaco);
                    pyrightProvider = provider;
                    console.log("Pyright LSP is now ONLINE");
                    return provider;
                  } catch (e) {
                    console.error("Pyright LSP Error:", e);
                    pyrightPromise = null;
                    return null;
                  }
                })();
              }

              const provider = await pyrightPromise;
              if (provider) {
                console.log("Setting up diagnostics for current editor instance...");
                await provider.setupDiagnostics(editor);
              }
            }}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              readOnly: isRunningTests || isSubmitting || isExecuting || isReadOnly,
              padding: { top: 16, bottom: 16 },
              fontFamily: "'Fira Code', 'Courier New', monospace",
              fontLigatures: true,
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: "on",
              tabCompletion: "on",
              quickSuggestions: {
                other: true,
                comments: false,
                strings: true
              },
              formatOnType: true,
              parameterHints: { enabled: true }
            }}
          />
        </div>

        <div className="flex-1 min-h-[150px] bg-[#1e1e1e] border-t border-[#333333] flex flex-col overflow-hidden">
          <div className="bg-[#252526] px-2 flex items-center border-b border-[#333333] justify-between">
            <div className="flex">
              <button
                onClick={() => setActiveTab('tests')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'tests' ? 'text-green-500 border-b-2 border-green-600' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Kasus Pengujian {testResults.length > 0 && `(${testResults.filter(r => r.passed).length}/${testResults.length})`}
              </button>
              <button
                onClick={() => setActiveTab('console')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'console' ? 'text-green-500 border-b-2 border-green-600' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Konsol {isExecuting && <span className="inline-block w-2 h-2 bg-green-500 rounded-full ml-1 animate-pulse"></span>}
              </button>
              <button
                onClick={() => setActiveTab('input')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'input' ? 'text-green-500 border-b-2 border-green-600' : 'text-zinc-500 hover:text-zinc-300'}`}
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
              <div className="flex flex-col h-full">
                {/* Summary bar */}
                {testResults.length > 0 && (
                  <div className={`flex-shrink-0 px-4 py-3 border-b border-[#333333] ${
                    allTestsPassed ? 'bg-green-900/20' : 'bg-red-900/10'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-lg ${allTestsPassed ? 'text-green-400' : 'text-red-400'}`}>
                          {allTestsPassed ? 'check_circle' : 'cancel'}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {testResults.filter(r => r.passed).length} / {testResults.length} kasus pengujian lulus
                        </span>
                      </div>
                      {/* Quick badge per test */}
                      <div className="flex gap-1">
                        {testResults.map((r, i) => (
                          <div
                            key={i}
                            title={`#${i + 1} ${r.passed ? 'Lulus' : 'Gagal'}`}
                            className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center cursor-default select-none transition-all ${
                              r.passed
                                ? 'bg-green-600 text-white'
                                : 'bg-red-600 text-white'
                            }`}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Progress bar */}
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
                      <div
                        key={idx}
                        className={`border rounded-lg overflow-hidden transition-all ${
                          result.passed
                            ? 'bg-green-900/10 border-green-900/40'
                            : 'bg-red-900/10 border-red-900/40'
                        }`}
                      >
                        {/* Test case header */}
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
                          <span className="text-xs font-bold text-white flex-1">
                            Kasus #{idx + 1}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${
                            result.passed ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {result.passed ? '✓ Lulus' : '✗ Gagal'}
                          </span>
                        </div>

                        {/* Test script (collapsible) */}
                        {result.testScript && (
                          <details className="px-3 pt-2 pb-1">
                            <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors select-none flex items-center gap-1">
                              <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>code</span>
                              Lihat skrip pengujian
                            </summary>
                            <pre className="mt-2 bg-black/30 p-2 rounded text-[10px] text-green-300 font-mono whitespace-pre-wrap overflow-x-auto border border-[#333333]">{result.testScript}</pre>
                          </details>
                        )}

                        {/* Passed: show stdout */}
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

                        {/* Failed: show error */}
                        {!result.passed && result.error && (
                          <div className="px-3 pb-3 pt-1">
                            <span className="text-[10px] text-zinc-500 block mb-1">Error:</span>
                            <div className="text-[11px] font-mono text-red-400 bg-black/40 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                              {result.error}
                            </div>
                          </div>
                        )}

                        {/* Failed: show actual output */}
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
                  <div className="flex-shrink-0 mt-2 border-t border-[#333333] pt-4 flex justify-between items-center px-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-zinc-500 text-xs animate-spin">sync</span>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Program sedang berjalan...</span>
                    </div>
                    <button 
                      onClick={() => setShowPrompt(true)}
                      className="bg-[#333333] hover:bg-[#444444] text-white px-4 py-1.5 rounded text-[10px] font-bold flex items-center gap-2 transition-all active:scale-95 border border-[#444444]"
                    >
                      <span className="material-symbols-outlined text-sm">keyboard</span>
                      Kirim Masukan
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 h-full flex flex-col">
                <label className="block text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">Masukan Standar (Stdin)</label>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  className="flex-1 bg-[#1e1e1e] border border-[#333333] text-zinc-300 p-4 font-mono text-sm focus:outline-none focus:border-green-600 rounded resize-none"
                  placeholder="Ketikkan data input di sini. Setiap input() akan membaca satu baris dari sini..."
                />
                <p className="mt-2 text-[10px] text-zinc-600 italic">Input ini akan dikirimkan ke program saat Anda mengeklik tombol "Jalankan".</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPrompt && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] z-[100] flex items-center justify-center p-4">
          <div className="bg-[#252526] border border-green-600/50 rounded-xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500">terminal</span>
              </div>
              <div>
                <h3 className="text-white font-bold">Input Diperlukan</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Program sedang menunggu jawaban Anda</p>
              </div>
            </div>
            
            <div className="bg-black/30 border border-[#333333] p-3 rounded-lg mb-4">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Prompt dari Program:</span>
              <p className="text-zinc-300 font-mono text-sm italic">{promptContent || "(Tidak ada teks prompt)"}</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (interactiveInput.trim()) {
                sendStdin(executionId!, interactiveInput);
                setInteractiveInput("");
                setShowPrompt(false);
              }
            }}>
              <input 
                autoFocus
                type="text"
                value={interactiveInput}
                onChange={(e) => setInteractiveInput(e.target.value)}
                placeholder="Ketik jawaban di sini..."
                className="w-full bg-[#1e1e1e] border border-[#333333] text-white rounded-lg p-4 focus:outline-none focus:border-green-600 font-mono mb-4 shadow-inner"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPrompt(false)}
                  className="flex-1 bg-[#2d2d2d] text-zinc-400 py-3 rounded-lg font-bold hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-900/20"
                >
                  Kirim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Review Modal ───────────────────────────────────────────────── */}
      {reviewModal && (
        <div className="fixed inset-0 z-[200] bg-[#1e1e1e] flex flex-col">
          {/* Modal top bar */}
          <div className="flex-shrink-0 flex items-center justify-between bg-[#252526] border-b border-[#333333] px-4 py-2 gap-3">
            {/* Left: file badge + nim */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-white text-xs font-mono bg-[#1e1e1e] border border-[#333333] px-3 py-1 rounded flex items-center gap-2 flex-shrink-0">
                <span className="material-symbols-outlined text-[14px] text-amber-400">lock</span>
                main.py
                <span className="text-[10px] text-amber-500 font-bold uppercase">[Baca Saja]</span>
              </span>
              <div className="text-xs text-zinc-500 font-mono truncate">
                NIM: <span className="text-zinc-300">{reviewModal.nim}</span>
              </div>
            </div>

            {/* Center: status badge */}
            <div className="flex items-center gap-2">
              {reviewModal.status === 'pass' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/20 border border-green-700/40">
                  <span className="material-symbols-outlined text-base text-green-400">check_circle</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-300">Jawaban Berhasil</span>
                </div>
              )}
              {reviewModal.status === 'fail' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-900/20 border border-red-700/40">
                  <span className="material-symbols-outlined text-base text-red-400">cancel</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-300">Jawaban Gagal</span>
                </div>
              )}
              {reviewModal.status === 'timeout' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-900/20 border border-orange-700/40">
                  <span className="material-symbols-outlined text-base text-orange-400">timer_off</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-300">Waktu Habis</span>
                </div>
              )}
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleRunReviewTests(reviewModal.code)}
                disabled={isRunningReviewTests}
                className="bg-[#333333] text-white px-3 py-1 rounded text-xs font-semibold hover:bg-[#444444] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">fact_check</span>
                {isRunningReviewTests ? 'Sedang Menguji...' : 'Uji Ulang'}
              </button>

              <button
                onClick={() => { setReviewModal(null); router.push('/'); }}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">home</span>
                Selesai
              </button>

              <button
                onClick={() => setReviewModal(null)}
                title="Tutup tinjauan"
                className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Modal body: editor + test results side by side */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Code editor — read only, takes most of the space */}
            <div className={`flex flex-col min-h-0 overflow-hidden ${reviewTestResults.length > 0 || reviewTestError || isRunningReviewTests ? 'w-1/2 border-r border-[#333333]' : 'flex-1'}`}>
              <div className="flex-shrink-0 flex items-center gap-2 bg-[#2d2d2d] border-b border-[#333333] px-4 py-1.5">
                <span className="material-symbols-outlined text-sm text-zinc-500">description</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Kode Mahasiswa — Tinjauan</span>
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="vs-dark"
                  value={reviewModal.code}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    readOnly: true,
                    domReadOnly: true,
                    padding: { top: 16, bottom: 16 },
                    fontFamily: "'Fira Code', 'Courier New', monospace",
                    fontLigatures: true,
                    cursorStyle: 'line',
                  }}
                />
              </div>
            </div>

            {/* Test results panel — only shown after running tests */}
            {(reviewTestResults.length > 0 || reviewTestError || isRunningReviewTests) && (
              <div className="w-1/2 flex flex-col min-h-0 overflow-hidden bg-[#1e1e1e]">
                <div className="flex-shrink-0 flex items-center justify-between bg-[#252526] border-b border-[#333333] px-4 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-zinc-500">fact_check</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      Hasil Pengujian {reviewTestResults.length > 0 && `(${reviewTestResults.filter(r => r.passed).length}/${reviewTestResults.length})`}
                    </span>
                  </div>
                  <button
                    onClick={() => { setReviewTestResults([]); setReviewTestError(null); setReviewHasRunTests(false); }}
                    className="text-zinc-600 hover:text-zinc-300 transition-colors"
                    title="Reset hasil"
                  >
                    <span className="material-symbols-outlined text-sm">block</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {isRunningReviewTests && (
                    <div className="flex items-center justify-center h-full gap-3 text-zinc-500">
                      <span className="material-symbols-outlined animate-spin">sync</span>
                      <span className="text-sm">Menjalankan pengujian...</span>
                    </div>
                  )}

                  {reviewTestError && !isRunningReviewTests && (
                    <div className="p-4">
                      <div className="bg-red-900/20 border border-red-900 text-red-500 p-3 rounded font-mono text-xs whitespace-pre-wrap">
                        {reviewTestError}
                      </div>
                    </div>
                  )}

                  {!isRunningReviewTests && reviewTestResults.length > 0 && (
                    <div className="p-4 space-y-3">
                      {/* Summary */}
                      <div className={`px-4 py-3 rounded-lg border ${reviewAllPassed ? 'bg-green-900/20 border-green-700/40' : 'bg-red-900/10 border-red-700/40'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-lg ${reviewAllPassed ? 'text-green-400' : 'text-red-400'}`}>
                              {reviewAllPassed ? 'check_circle' : 'cancel'}
                            </span>
                            <span className="text-sm font-bold text-white">
                              {reviewTestResults.filter(r => r.passed).length} / {reviewTestResults.length} lulus
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {reviewTestResults.map((r, i) => (
                              <div key={i} className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${r.passed ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                {i + 1}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="w-full bg-[#333333] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${reviewAllPassed ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${(reviewTestResults.filter(r => r.passed).length / reviewTestResults.length) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Individual results */}
                      {reviewTestResults.map((result, idx) => (
                        <div key={idx} className={`border rounded-lg overflow-hidden ${result.passed ? 'bg-green-900/10 border-green-900/40' : 'bg-red-900/10 border-red-700/40'}`}>
                          <div className={`flex items-center gap-3 px-3 py-2 border-b ${result.passed ? 'border-green-900/30 bg-green-900/20' : 'border-red-900/30 bg-red-900/20'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${result.passed ? 'bg-green-600' : 'bg-red-600'}`}>
                              <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>{result.passed ? 'check' : 'close'}</span>
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
                              <span className="text-[10px] text-zinc-500 block mb-1">Output:</span>
                              <div className="text-[11px] font-mono text-green-300 bg-black/20 p-2 rounded overflow-x-auto whitespace-pre border border-green-900/20">{result.actualOutput || '(tidak ada output)'}</div>
                            </div>
                          )}
                          {!result.passed && result.error && (
                            <div className="px-3 pb-3 pt-1">
                              <span className="text-[10px] text-zinc-500 block mb-1">Error:</span>
                              <div className="text-[11px] font-mono text-red-400 bg-black/40 p-2 rounded overflow-x-auto whitespace-pre-wrap">{result.error}</div>
                            </div>
                          )}
                          {!result.passed && result.actualOutput && (
                            <div className="px-3 pb-3">
                              <span className="text-[10px] text-zinc-500 block mb-1">Output yang Dihasilkan:</span>
                              <div className="text-[11px] font-mono text-zinc-300 bg-black/40 p-2 rounded overflow-x-auto whitespace-pre">{result.actualOutput}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

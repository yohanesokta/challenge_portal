'use client';

import { useState } from "react";
import { createProblem } from "@/app/actions/problem";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import TestScriptEditor from "@/app/components/TestScriptEditor";

type SolutionType = 'function' | 'class' | 'bebas';

interface TestCase {
  testScript: string;
  expectedOutput?: string;
}

function getDefaultScript(solutionType: SolutionType, functionName?: string, className?: string): string {
  if (solutionType === 'function') {
    const fn = functionName || 'solve';
    return `# Test untuk fungsi ${fn}
# Pastikan fungsi Anda mengembalikan nilai yang benar

assert ${fn}() is not None, "Fungsi harus mengembalikan nilai"
# Contoh:
# assert ${fn}(1, 2) == 3, "1 + 2 harus == 3"
print("Semua test lulus!")`;
  }
  if (solutionType === 'class') {
    const cls = className || 'Solution';
    return `# Test untuk class ${cls}
# Inisialisasi dan panggil method

obj = ${cls}()
assert obj is not None, "Class harus bisa diinisialisasi"
# Contoh:
# assert obj.method(1, 2) == 3, "method(1, 2) harus == 3"
print("Semua test lulus!")`;
  }
  // bebas
  return `# Test untuk program bebas
# Tidak diperlukan — program akan dijalankan dan output dibandingkan
# Isi 'Output yang Diharapkan' di bawah, atau tulis skrip validasi di sini

# Contoh validasi dengan assert:
# import subprocess
# result = subprocess.run(...)`;
}

export default function NewProblem() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState("");
  const [timingMode, setTimingMode] = useState<'scheduled' | 'manual'>('scheduled');
  const [isPublic, setIsPublic] = useState(true);
  const [solutionType, setSolutionType] = useState<SolutionType>('function');
  const [functionName, setFunctionName] = useState("");
  const [className, setClassName] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([
    { testScript: getDefaultScript('function', '', ''), expectedOutput: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [descTab, setDescTab] = useState<'edit' | 'preview'>('edit');
  const router = useRouter();

  const handleSolutionTypeChange = (type: SolutionType) => {
    setSolutionType(type);
    // Update existing test case templates
    setTestCases(prev => prev.map(tc => ({
      ...tc,
      testScript: tc.testScript === getDefaultScript(solutionType, functionName, className)
        ? getDefaultScript(type, functionName, className)
        : tc.testScript
    })));
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, {
      testScript: getDefaultScript(solutionType, functionName, className),
      expectedOutput: ''
    }]);
  };

  const handleTestCaseChange = (index: number, field: keyof TestCase, value: string) => {
    const updated = [...testCases];
    (updated[index] as any)[field] = value;
    setTestCases(updated);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await createProblem({
        title,
        description,
        startTime: timingMode === 'scheduled' ? (startTime || null) : null,
        endTime: timingMode === 'scheduled' ? (endTime || null) : null,
        duration: duration ? parseInt(duration) : null,
        timingMode,
        isPublic,
        solutionType,
        functionName: functionName || null,
        className: className || null,
        testCases,
      });
      if (res.success) {
        router.push("/admin/dashboard");
      } else {
        alert("Gagal membuat soal: " + res.error);
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Buat Soal Baru</h1>
            <Link href="/admin/dashboard" className="text-[#007acc] hover:underline">&larr; Kembali ke Dasbor</Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#252526] border border-[#333333] rounded-lg p-6 space-y-8 shadow-xl">
          {/* Informasi Soal */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white border-b border-[#333333] pb-2">Informasi Soal</h2>
            <div>
              <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Judul</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#333333] text-white rounded p-3 focus:outline-none focus:border-[#007acc]"
                placeholder="Contoh: Implementasi Stack Menggunakan Class"
              />
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-zinc-400 text-xs font-bold uppercase">Deskripsi / Instruksi (Markdown)</label>
                <div className="flex bg-[#1e1e1e] rounded border border-[#333333] p-1">
                  <button
                    type="button"
                    onClick={() => setDescTab('edit')}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${descTab === 'edit' ? 'bg-[#333333] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    KODE
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescTab('preview')}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${descTab === 'preview' ? 'bg-[#333333] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    PRATINJAU
                  </button>
                </div>
              </div>

              {descTab === 'edit' ? (
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  className="w-full bg-[#1e1e1e] border border-[#333333] text-white rounded p-4 focus:outline-none focus:border-[#007acc] font-mono text-sm shadow-inner"
                  placeholder="Gunakan Markdown untuk deskripsi soal Anda..."
                />
              ) : (
                <div className="w-full bg-[#1e1e1e] border border-[#333333] text-white rounded p-4 min-h-[192px] prose prose-invert prose-sm max-w-none">
                  {description ? (
                    <ReactMarkdown>{description}</ReactMarkdown>
                  ) : (
                    <span className="text-zinc-600 italic">Tidak ada pratinjau (deskripsi kosong).</span>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* SkemaSoal */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white border-b border-[#333333] pb-2">Skema Soal</h2>
            <p className="text-xs text-zinc-500">Pilih tipe solusi yang harus ditulis mahasiswa. Ini menentukan cara evaluator menilai kode.</p>

            <div className="grid grid-cols-3 gap-4">
              {([
                { id: 'function', label: 'Function', icon: 'function', desc: 'Mahasiswa menulis satu fungsi dengan nama tertentu' },
                { id: 'class', label: 'Class', icon: 'data_object', desc: 'Mahasiswa menulis sebuah class dengan method tertentu' },
                { id: 'bebas', label: 'Bebas', icon: 'terminal', desc: 'Program lengkap, output dibandingkan atau skrip validasi' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSolutionTypeChange(opt.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${solutionType === opt.id
                    ? opt.id === 'function' ? 'bg-[#007acc]/15 border-[#007acc] text-[#007acc]'
                    : opt.id === 'class' ? 'bg-emerald-900/20 border-emerald-600 text-emerald-400'
                    : 'bg-purple-900/20 border-purple-600 text-purple-400'
                    : 'bg-[#1e1e1e] border-[#333333] text-zinc-500 hover:border-zinc-500'}`}
                >
                  <span className="material-symbols-outlined text-xl mb-2 block">{opt.icon}</span>
                  <div className="font-bold text-sm mb-1">{opt.label}</div>
                  <div className="text-[10px] leading-relaxed opacity-80">{opt.desc}</div>
                </button>
              ))}
            </div>

            {solutionType === 'function' && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Nama Fungsi yang Diperlukan</label>
                <input
                  type="text"
                  value={functionName}
                  onChange={(e) => setFunctionName(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#007acc]/40 text-white rounded p-3 focus:outline-none focus:border-[#007acc] font-mono"
                  placeholder="Contoh: hitung_faktorial"
                />
                <p className="text-[10px] text-zinc-600 mt-1 italic">Nama ini akan muncul di template kode awal mahasiswa dan dipakai di test script.</p>
              </div>
            )}

            {solutionType === 'class' && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Nama Class yang Diperlukan</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-emerald-600/40 text-white rounded p-3 focus:outline-none focus:border-emerald-600 font-mono"
                  placeholder="Contoh: Stack"
                />
                <p className="text-[10px] text-zinc-600 mt-1 italic">Nama ini akan muncul di template kode awal mahasiswa dan dipakai di test script.</p>
              </div>
            )}
          </section>

          {/* Pengaturan Waktu */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white border-b border-[#333333] pb-2">Pengaturan Waktu & Penjadwalan</h2>
            
            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={() => setTimingMode('scheduled')}
                className={`flex-1 py-3 px-4 rounded border text-sm font-bold transition-all ${timingMode === 'scheduled' ? 'bg-[#007acc]/20 border-[#007acc] text-[#007acc]' : 'bg-[#252526] border-[#333333] text-zinc-500'}`}
              >
                Terjadwal (Tanggal & Waktu)
              </button>
              <button
                type="button"
                onClick={() => setTimingMode('manual')}
                className={`flex-1 py-3 px-4 rounded border text-sm font-bold transition-all ${timingMode === 'manual' ? 'bg-purple-900/20 border-purple-600 text-purple-400' : 'bg-[#252526] border-[#333333] text-zinc-500'}`}
              >
                Mulai Manual (Kontrol Administrator)
              </button>
            </div>

            {timingMode === 'scheduled' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Tanggal & Waktu Mulai</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#333333] text-white rounded p-3 focus:outline-none focus:border-[#007acc]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Tanggal & Waktu Selesai</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#333333] text-white rounded p-3 focus:outline-none focus:border-[#007acc]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Durasi (Menit - Opsional)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#333333] text-white rounded p-3 focus:outline-none focus:border-[#007acc]"
                    placeholder="Contoh: 60"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-[#1e1e1e] border border-[#333333] rounded-lg p-6 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-4 mb-6">
                  <span className="material-symbols-outlined text-purple-400">info</span>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Dalam <strong>Mode Manual</strong>, mahasiswa dapat membuka soal dan menulis kode segera, namun mereka hanya dapat menjalankan perintah &quot;Jalankan&quot;.
                    Tombol &quot;Jalankan Pengujian&quot; dan &quot;Kirimkan&quot; akan dinonaktifkan hingga Anda mengeklik <strong>&quot;Mulai Sesi&quot;</strong> pada Dasbor Admin.
                  </p>
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Durasi Pengerjaan (Menit)</label>
                  <input
                    required
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-[#252526] border border-[#333333] text-white rounded p-3 focus:outline-none focus:border-purple-600"
                    placeholder="Contoh: 60"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Visibilitas */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white border-b border-[#333333] pb-2">Visibilitas</h2>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex-1 py-3 px-4 rounded border text-sm font-bold transition-all ${isPublic ? 'bg-[#007acc]/20 border-[#007acc] text-[#007acc]' : 'bg-[#252526] border-[#333333] text-zinc-500'}`}
              >
                Publik (Muncul di Beranda)
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex-1 py-3 px-4 rounded border text-sm font-bold transition-all ${!isPublic ? 'bg-orange-900/20 border-orange-600 text-orange-400' : 'bg-[#252526] border-[#333333] text-zinc-500'}`}
              >
                Privat (Hanya lewat URL)
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 italic">Soal privat tidak akan muncul di daftar publik namun tetap dapat diakses melalui tautan ID spesifik.</p>
          </section>

          {/* Kasus Pengujian */}
          <section className="space-y-6">
            <div className="flex justify-between items-center border-b border-[#333333] pb-2">
              <div>
                <h2 className="text-xl font-bold text-white">Kasus Pengujian</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5 italic">Semua kasus pengujian terlihat oleh mahasiswa — tidak ada hidden test.</p>
              </div>
              <button
                type="button"
                onClick={handleAddTestCase}
                className="bg-[#007acc] hover:bg-[#005f9e] text-white text-xs font-bold px-4 py-2 rounded transition-colors"
              >
                + Tambah Kasus Pengujian
              </button>
            </div>

            <div className="space-y-6">
              {testCases.map((tc, index) => (
                <div key={index} className="bg-[#1e1e1e] border border-[#333333] rounded-lg p-6 relative shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Kasus Pengujian #{index + 1}</span>
                    {testCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTestCase(index)}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-zinc-500 text-[10px] font-bold uppercase">Skrip Pengujian (Python)</label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        solutionType === 'function' ? 'bg-[#007acc]/20 text-[#007acc]'
                        : solutionType === 'class' ? 'bg-emerald-900/20 text-emerald-400'
                        : 'bg-purple-900/20 text-purple-400'
                      }`}>
                        {solutionType === 'function' ? 'EvaluatorFunction' : solutionType === 'class' ? 'EvaluatorClass' : 'EvaluatorBebas'}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-600 mb-3 italic">
                      {solutionType === 'function'
                        ? `Kode ini dijalankan setelah kode mahasiswa. Gunakan assert untuk validasi hasil fungsi \`${functionName || 'nama_fungsi'}\`.`
                        : solutionType === 'class'
                        ? `Kode ini dijalankan setelah kode mahasiswa. Inisialisasi class \`${className || 'NamaClass'}\` dan panggil method-nya.`
                        : 'Untuk tipe Bebas: isi \'Output yang Diharapkan\' di bawah, atau tulis skrip validasi Python di sini.'}
                    </p>
                    <TestScriptEditor
                      value={tc.testScript}
                      onChange={(v) => handleTestCaseChange(index, 'testScript', v)}
                      height={280}
                      solutionType={solutionType}
                      functionName={functionName}
                      className={className}
                    />
                  </div>

                  {solutionType === 'bebas' && (
                    <div className="mt-4">
                      <label className="block text-zinc-500 text-[10px] font-bold uppercase mb-2">Output yang Diharapkan (Stdout) — Opsional</label>
                      <p className="text-[10px] text-zinc-600 mb-2 italic">Jika skrip di atas kosong, output program akan dibandingkan dengan teks ini secara persis.</p>
                      <textarea
                        value={tc.expectedOutput || ''}
                        onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                        rows={3}
                        className="w-full bg-[#252526] border border-[#333333] text-zinc-300 rounded p-3 text-sm font-mono focus:outline-none focus:border-purple-600"
                        placeholder="Contoh: Hello, World!"
                        spellCheck={false}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="pt-8 border-t border-[#333333] flex justify-end gap-4">
            <Link href="/admin/dashboard" className="px-6 py-3 text-zinc-500 hover:text-white transition-colors">Batal</Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#007acc] text-white px-10 py-3 rounded-lg font-bold hover:bg-[#005f9e] transition-all disabled:opacity-50 shadow-lg shadow-[#007acc]/20"
            >
              {isSubmitting ? 'Sedang Membuat Soal...' : 'Buat Soal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

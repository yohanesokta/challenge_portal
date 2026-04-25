'use client';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { updateUserNim } from "@/app/actions/auth";

interface NIMModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNIM?: string;
  isMandatory?: boolean;
}

export default function NIMModal({ isOpen, onClose, initialNIM = "", isMandatory = false }: NIMModalProps) {
  const [nim, setNim] = useState(initialNIM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { update } = useSession();

  useEffect(() => {
    setNim(initialNIM);
  }, [initialNIM]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nim.trim()) {
      setError("NIM tidak boleh kosong");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await updateUserNim(nim);
      if (result.success) {
        await update({ nim });
        onClose();
      } else {
        setError(result.error || "Gagal memperbarui NIM");
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#252526] border border-[#333333] rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">person_pin</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Atur NIM Anda</h2>
              <p className="text-sm text-zinc-400">NIM diperlukan untuk merekam hasil pengerjaan Anda.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nim" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                Nomor Induk Mahasiswa
              </label>
              <input
                id="nim"
                type="text"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="Contoh: 220101001"
                className="w-full bg-[#1e1e1e] border border-[#333333] text-white px-4 py-2.5 rounded focus:outline-none focus:border-primary transition-colors font-mono"
                disabled={isLoading}
                autoFocus
              />
              {error && <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {error}
              </p>}
            </div>

            <div className="flex gap-3 pt-2">
              {!isMandatory && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded bg-[#2d2d2d] text-zinc-300 font-bold text-sm hover:bg-[#333333] transition-colors border border-[#333333]"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || !nim.trim()}
                className="flex-[2] px-4 py-2.5 rounded bg-primary text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-sm">save</span>
                )}
                Simpan NIM
              </button>
            </div>
          </form>
        </div>
        
        {isMandatory && (
          <div className="px-6 py-4 bg-[#1a1a1b] border-t border-[#333333]">
            <p className="text-[10px] text-zinc-500 leading-relaxed italic text-center">
              * Anda harus mengatur NIM sebelum dapat melihat soal atau mengumpulkan jawaban.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

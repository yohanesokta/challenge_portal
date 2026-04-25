'use client';

import { useState } from "react";
import { requestAdminRole } from "@/app/actions/auth";

interface AdminRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminRequestModal({ isOpen, onClose }: AdminRequestModalProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Alasan harus diisi");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await requestAdminRole(reason);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setReason("");
        }, 2000);
      } else {
        setError(result.error || "Gagal mengirim permintaan");
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
            <div className="w-10 h-10 rounded-full bg-green-600/10 flex items-center justify-center text-green-500">
              <span className="material-symbols-outlined">verified_user</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Daftar Moderator</h2>
              <p className="text-sm text-zinc-400">Ajukan diri untuk membantu mengelola tantangan.</p>
            </div>
          </div>

          {success ? (
            <div className="py-8 text-center animate-in fade-in zoom-in">
              <span className="material-symbols-outlined text-4xl text-green-500 mb-2">check_circle</span>
              <p className="text-white font-bold">Permintaan Berhasil Dikirim</p>
              <p className="text-xs text-zinc-500 mt-1">Admin akan meninjau permohonan Anda segera.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reason" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  Alasan & Motivasi
                </label>
                <textarea
                  id="reason"
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan mengapa Anda ingin menjadi moderator..."
                  className="w-full bg-[#1e1e1e] border border-[#333333] text-white px-4 py-2.5 rounded focus:outline-none focus:border-green-600 transition-colors text-sm resize-none"
                  disabled={isLoading}
                  autoFocus
                />
                {error && <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {error}
                </p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded bg-[#2d2d2d] text-zinc-300 font-bold text-sm hover:bg-[#333333] transition-colors border border-[#333333]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !reason.trim()}
                  className="flex-[2] px-4 py-2.5 rounded bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">send</span>
                  )}
                  Kirim Lamaran
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

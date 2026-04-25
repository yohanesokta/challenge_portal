'use client';

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { requestAdminRole } from "@/app/actions/auth";
import Link from "next/link";
import { isAuthEnabled } from "@/lib/config";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();
  const authEnabled = isAuthEnabled();

  useEffect(() => {
    // If auth is disabled, allow direct cookie-based or bypass login (legacy support)
    // But since we are overhauling, we guide them to the dashboard if auth is off
    if (!authEnabled) {
      router.push("/admin/dashboard");
      return;
    }

    if (status === "authenticated" && ((session?.user as any)?.role === 'admin' || (session?.user as any)?.role === 'superadmin')) {
      router.push("/admin/dashboard");
    }
  }, [session, status, router, authEnabled]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await requestAdminRole(reason);
      if (res.success) {
        setMessage({ type: 'success', text: "Permintaan Anda telah dikirim. Mohon tunggu persetujuan admin lain." });
        setReason("");
      } else {
        setMessage({ type: 'error', text: res.error || "Gagal mengirimkan permintaan." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Terjadi kesalahan koneksi." });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && ((session?.user as any)?.role === 'admin' || (session?.user as any)?.role === 'superadmin'))) return (
    <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
    </div>
  );

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center p-4">
        <div className="bg-[#252526] border border-[#333333] p-8 rounded-lg max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-zinc-400 text-3xl">lock</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Akses Terbatas</h1>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">Silakan masuk dengan akun Anda untuk mengakses Panel Administrator.</p>
          <Link 
            href={`/auth/login?callbackUrl=/admin`}
            className="block w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 transition-all"
          >
            Masuk Sekarang
          </Link>
          <Link href="/" className="block mt-4 text-xs text-zinc-500 hover:text-zinc-300">Kembali ke Beranda</Link>
        </div>
      </div>
    );
  }

  // Not an admin yet
  return (
    <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center p-4">
      <div className="bg-[#252526] border border-[#333333] p-8 rounded-lg max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-green-600/20 text-green-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">security</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Permintaan Akses Admin</h1>
          <p className="text-zinc-400 text-sm">Akun Anda saat ini memiliki akses sebagai <strong>{String((session?.user as any)?.role || 'student').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>. Ajukan permintaan untuk menjadi Administrator.</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 text-sm ${
            message.type === 'success' ? 'bg-green-900/20 border border-green-900 text-green-400' : 'bg-red-900/20 border border-red-900 text-red-500'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-2 tracking-widest">Alasan Akses</label>
            <textarea 
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#333333] text-white rounded p-3 text-sm focus:outline-none focus:border-green-600 resize-none"
              placeholder="Jelaskan mengapa Anda memerlukan akses admin..."
            />
          </div>
          <button 
            type="submit"
            disabled={loading || message?.type === 'success'}
            className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Mengirim..." : "Kirim Permintaan Akses"}
          </button>
        </form>
        
        <Link href="/" className="block text-center mt-6 text-xs text-zinc-500 hover:text-zinc-300">Batal dan Kembali</Link>
      </div>
    </div>
  );
}

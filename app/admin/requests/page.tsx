'use client';

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPendingAdminRequests, handleAdminRequest } from "@/app/actions/auth";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { isAuthEnabled } from "@/lib/config";

export default function AdminRequestsPage() {
  const { data: session, status } = useSession();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const router = useRouter();
  const authEnabled = isAuthEnabled();

  useEffect(() => {
    if (!authEnabled) {
      router.push("/admin/dashboard");
      return;
    }

    const userRole = (session?.user as any)?.role;
    if (status === "authenticated" && userRole !== 'admin' && userRole !== 'superadmin') {
      router.push("/admin");
    } else if (status === "unauthenticated") {
       router.push("/admin");
    } else if (status === "authenticated") {
      fetchRequests();
    }
  }, [session, status, router, authEnabled]);

  const fetchRequests = async () => {
    setLoading(true);
    const data = await getPendingAdminRequests();
    setRequests(data);
    setLoading(false);
  };

  const onAction = async (id: number, action: 'approve' | 'reject') => {
    setActingId(id);
    try {
      const res = await handleAdminRequest(id, action);
      if (res.success) {
        setRequests(requests.filter(r => r.id !== id));
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    } finally {
      setActingId(null);
    }
  };

  const userRole = (session?.user as any)?.role;
  const isAuthorized = userRole === 'admin' || userRole === 'superadmin';

  if (status === "loading" || loading || (status === "authenticated" && !isAuthorized) || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <>
      <Header authEnabled={authEnabled} />
      <div className="flex min-h-[calc(100vh-48px)]">
        <Sidebar className="hidden md:flex" authEnabled={authEnabled} />
        <main className="flex-1 md:ml-64 p-8 bg-[#1e1e1e]">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Permintaan Moderator</h1>
                <p className="text-zinc-500 text-sm">Review dan setujui permintaan akses administrator baru.</p>
              </div>
              <div className="bg-[#252526] px-4 py-2 rounded border border-[#333333] text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                {requests.length} Permintaan Menunggu
              </div>
            </div>

            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="bg-[#252526] border border-dashed border-[#333333] rounded-xl p-12 text-center text-zinc-500">
                  <span className="material-symbols-outlined text-4xl mb-4 opacity-20">inbox</span>
                  <p>Tidak ada permintaan akses administrator yang tertunda.</p>
                </div>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="bg-[#252526] border border-[#333333] rounded-xl p-6 flex flex-col md:flex-row gap-6 md:items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-600/20 text-green-500 rounded-full flex items-center justify-center font-bold">
                          {req.userName?.[0] || req.userEmail?.[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-white font-bold">{req.userName || 'Tanpa Nama'}</h3>
                          <p className="text-xs text-zinc-500">{req.userEmail}</p>
                        </div>
                      </div>
                      <div className="bg-[#1e1e1e] p-4 rounded-lg border border-[#333333] mt-4">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Alasan Permintaan:</p>
                        <p className="text-zinc-300 text-sm italic">"{req.reason}"</p>
                      </div>
                      <p className="text-[9px] text-zinc-600 mt-3 font-mono">DIMINTA PADA: {new Date(req.createdAt).toLocaleString()}</p>
                    </div>
                    
                    <div className="flex gap-2 min-w-[200px]">
                      <button 
                         disabled={actingId === req.id}
                         onClick={() => onAction(req.id, 'approve')}
                         className="flex-1 bg-green-600/10 text-green-500 border border-green-600/30 py-2 rounded text-xs font-bold hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                      >
                         {actingId === req.id ? "Wait..." : "Approve"}
                      </button>
                      <button 
                         disabled={actingId === req.id}
                         onClick={() => onAction(req.id, 'reject')}
                         className="flex-1 bg-red-600/10 text-red-500 border border-red-600/30 py-2 rounded text-xs font-bold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                      >
                         Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

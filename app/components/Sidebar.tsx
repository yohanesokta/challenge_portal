'use client';

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getUserHistory } from "@/app/actions/problem";

export default function Sidebar({ className, authEnabled }: { className?: string; authEnabled?: boolean }) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (session?.user) {
      getUserHistory().then(setHistory);
    }
  }, [session]);

  return (
    <aside className={`flex flex-col h-[calc(100vh-48px)] w-64 fixed left-0 top-12 bg-zinc-800 border-r border-[#333333] z-40 ${className || ''}`}>
      <div className="p-4 border-b border-[#333333]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#007acc] rounded flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-lg">terminal</span>
          </div>
          <div>
            <p className="font-label-caps text-label-caps text-on-surface uppercase">WORKSPACE</p>
            <p className="text-[10px] text-zinc-500 font-semibold tracking-wider">Assignments</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto custom-scrollbar">
        <Link 
          className="bg-[#2d2d2d] text-white border-l-2 border-[#007acc] flex items-center px-4 py-3 gap-3 transition-colors duration-200" 
          href="/"
        >
          <span className="material-symbols-outlined text-[#007acc]">grid_view</span>
          <span className="font-label-caps text-label-caps">Explorer</span>
        </Link>

        {authEnabled && session?.user && history.length > 0 && (
          <div className="mt-4 px-4">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">History Pengerjaan</p>
            <div className="space-y-1">
              {history.map((item, idx) => (
                <Link 
                  key={idx}
                  href={`/problem/${item.problemId}/review?sid=${item.id}`}
                  className="flex flex-col p-2 hover:bg-[#2a2d2e] rounded transition-colors group"
                >
                  <span className="text-xs text-zinc-300 truncate group-hover:text-white">{item.problemTitle}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[9px] uppercase font-bold ${item.status === 'pass' ? 'text-green-500' : 'text-red-500'}`}>
                      {item.status === 'pass' ? 'Selesai' : 'Gagal'}
                    </span>
                    <span className="text-[8px] text-zinc-600 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="mt-auto border-t border-[#333333] py-2">
        {(!authEnabled || isAdmin) && (
          <Link 
            className="text-zinc-500 flex items-center px-4 py-3 gap-3 hover:bg-[#2a2d2e] hover:text-zinc-200 transition-colors duration-200" 
            href="/admin"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-caps text-label-caps uppercase">Admin Setup</span>
          </Link>
        )}

        {authEnabled && session?.user && (
          <div className="px-4 py-3 mt-1 bg-[#1e1e1e]/50 border-t border-[#333333]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Sesi Aktif</span>
            </div>
            <p className="text-xs text-white font-bold truncate mt-1">{session.user.name || session.user.email}</p>
            <p className="text-[10px] text-zinc-500 font-mono">NIM: {(session.user as any).nim || '-'}</p>
            <p className="text-[9px] text-[#007acc] font-bold uppercase tracking-tighter mt-1">{user?.role}</p>
          </div>
        )}
      </div>
    </aside>
  );
}

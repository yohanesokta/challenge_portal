import Link from "next/link";

export default function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={`flex-col h-[calc(100vh-48px)] w-64 fixed left-0 top-12 bg-zinc-800 border-r border-[#333333] z-40 ${className || ''}`}>
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
        <a className="bg-[#2d2d2d] text-white border-l-2 border-[#007acc] flex items-center px-4 py-3 gap-3 transition-colors duration-200" href="/">
          <span className="material-symbols-outlined text-[#007acc]">grid_view</span>
          <span className="font-label-caps text-label-caps uppercase">Explorer</span>
        </a>
      </nav>
      
      <div className="mt-auto border-t border-[#333333] py-2">
        <a className="text-zinc-500 flex items-center px-4 py-3 gap-3 hover:bg-[#2a2d2e] hover:text-zinc-200 transition-colors duration-200" href="/admin">
          <span className="material-symbols-outlined">settings</span>
          <span className="font-label-caps text-label-caps uppercase">Admin Setup</span>
        </a>
      </div>
    </aside>
  );
}

'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import NIMModal from "./NIMModal";
import AdminRequestModal from "./AdminRequestModal";

const avatarColors = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-cyan-500',
];

export default function Header({ authEnabled }: { authEnabled?: boolean }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isNimModalOpen, setIsNimModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isMandatory, setIsMandatory] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const isDashboard = pathname === "/";
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'admin';
  const isStudent = userRole === 'student';

  const getAvatarColor = (seed: string) => {
    const charSum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return avatarColors[charSum % avatarColors.length];
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user && !(session.user as any).nim && isDashboard) {
      setIsNimModalOpen(true);
      setIsMandatory(true);
    }
  }, [session, status, isDashboard]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEditNim = () => {
    setIsMandatory(false);
    setIsNimModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleRequestAdmin = () => {
    setIsAdminModalOpen(true);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="flex justify-between items-center h-12 w-full px-4 sticky top-0 z-50 bg-zinc-900 border-b border-[#333333]">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-white tracking-tighter">CodeLab JAI</Link>
          <nav className="hidden md:flex items-center h-12 gap-4">
            <a
              className={`${isDashboard ? 'text-white border-b-2 border-green-600' : 'text-zinc-400 hover:text-zinc-200'} h-full flex items-center px-1 transition-colors`}
              href="/"
            >
              Dasbor
            </a>
            {/* Admin Panel visibility logic */}
            {(!authEnabled || isAdmin) && (
              <a className="text-zinc-400 hover:text-zinc-200 transition-colors h-full flex items-center px-1" href="/admin">
                Panel Admin
              </a>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-2 pr-4 border-r border-[#333333]">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">make by</span>
            <a
              href="https://github.com/yohanesokta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-zinc-300 font-bold hover:text-green-500 transition-colors"
            >
              @yohanesoktanio
            </a>
          </div>

          <a
            href="https://github.com/yohanesokta/Codelab-JAI"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#252526] hover:bg-[#2d2d2d] text-zinc-300 px-3 py-1.5 rounded border border-[#333333] text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 shadow-sm shadow-black/20"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.472-4.041-1.472-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Kontribusi
          </a>

          {authEnabled && (
            <div className="flex items-center gap-3 ml-2 border-l border-[#333333] pl-6 h-6">
              {status === "authenticated" && session?.user ? (
                <div className="flex items-center gap-3 relative" ref={menuRef}>
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-white font-bold leading-none">{session.user.name || session.user.email}</p>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{userRole}</p>
                    </div>
                    <div className={`w-7 h-7 rounded-full overflow-hidden border border-green-600 ${imageError || !session.user.image ? getAvatarColor(session.user.name || session.user.email || 'U') : 'bg-zinc-800'} flex items-center justify-center text-[10px] text-white font-bold shadow-lg shadow-green-900/10`}>
                      {session.user.image && !imageError ? (
                        <img 
                          src={session.user.image} 
                          alt={session.user.name || ""} 
                          className="w-full h-full object-cover" 
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        (session.user.name?.[0] || session.user.email?.[0] || "U").toUpperCase()
                      )}
                    </div>
                  </button>
                  
                  {/* Simple Tooltip/Dropdown Menu */}
                  <div className={`absolute right-0 top-full mt-2 w-48 bg-[#252526] border border-[#333333] rounded shadow-2xl py-1 transition-all z-50 ${isMenuOpen ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none -translate-y-2'}`}>
                    <div className="px-4 py-2 border-b border-[#333333] mb-1">
                      <p className="text-xs text-white font-bold truncate">{session.user.email}</p>
                      <p className="text-[9px] text-zinc-500 font-mono mt-1">NIM: {(session.user as any).nim || 'Belum diatur'}</p>
                    </div>
                    
                    <button 
                      onClick={handleEditNim}
                      className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-[#2d2d2d] transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">edit_square</span>
                      Edit NIM
                    </button>

                    {isStudent && (
                      <button 
                        onClick={handleRequestAdmin}
                        className="w-full text-left px-4 py-2 text-xs text-green-500 hover:bg-green-900/10 transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        Daftar Moderator
                      </button>
                    )}

                    <button 
                      onClick={() => signOut()}
                      className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-900/10 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">logout</span>
                      Keluar Sesi
                    </button>
                  </div>
                </div>
              ) : status !== "authenticated" ? (
                <Link 
                  href="/auth/login" 
                  className="bg-green-600 text-white px-4 py-1 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-green-700 transition-all"
                >
                  Masuk
                </Link>
              ) : null}
            </div>
          )}


          {!authEnabled && (
             <div className="w-6 h-6 rounded-full overflow-hidden border border-[#333333] bg-zinc-800 flex items-center justify-center text-xs text-white">
              S
            </div>
          )}
        </div>
      </header>

      <NIMModal 
        isOpen={isNimModalOpen} 
        onClose={() => setIsNimModalOpen(false)} 
        initialNIM={(session?.user as any)?.nim || ""}
        isMandatory={isMandatory}
      />

      <AdminRequestModal 
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </>
  );
}


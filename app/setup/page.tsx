'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { superadminNotNull, setSuperAdminSecure } from "@/app/actions/auth"

export default function SetupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function checkStatus() {
      const val = await superadminNotNull()
      if (val > 0) {
        router.push("/")
      } else {
        setLoading(false)
      }
    }
    checkStatus()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)

    const result = await setSuperAdminSecure(email, password)
    
    if (result?.success) {
      setSuccess(true)
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } else {
      setError(result?.error || "Terjadi kesalahan")
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center text-zinc-400">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
          <p className="font-mono text-sm">Initializing setup environment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#252526] border border-[#333333] shadow-2xl rounded-sm overflow-hidden">
        {/* VS Code Title Bar Decor */}
        <div className="bg-[#323233] px-4 py-2 flex items-center justify-between border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
            </div>
            <span className="text-xs text-zinc-400 font-mono ml-2">setup_wizard.sh — Codelab-JAI</span>
          </div>
          <span className="material-symbols-outlined text-zinc-500 text-sm">close</span>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#007acc]">admin_panel_settings</span>
              Initial Setup
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Konfigurasi administrator utama untuk pertama kali. 
              <span className="text-amber-500 block mt-1">
                <span className="material-symbols-outlined text-xs align-middle mr-1">warning</span>
                Halaman ini hanya tersedia jika superadmin belum dikonfigurasi.
              </span>
            </p>
          </div>

          {success ? (
            <div className="bg-[#1e1e1e] border border-[#27c93f]/30 p-6 rounded text-center">
              <span className="material-symbols-outlined text-[#27c93f] text-5xl mb-4">check_circle</span>
              <h2 className="text-white font-bold mb-1">Setup Berhasil!</h2>
              <p className="text-zinc-400 text-sm">Mengarahkan Anda ke dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                  Email Superadmin
                </label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-zinc-500 text-sm group-focus-within:text-[#007acc] transition-colors">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007acc] text-white px-10 py-2.5 outline-none text-sm transition-all rounded-sm"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">
                  User dengan email ini harus sudah terdaftar di sistem.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                  Setup Password
                </label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-zinc-500 text-sm group-focus-within:text-[#007acc] transition-colors">
                    key
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007acc] text-white px-10 py-2.5 outline-none text-sm transition-all rounded-sm"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">
                  Gunakan SETUP_PASSWORD yang ada di konfigurasi environment.
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 text-xs rounded flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm mt-0.5">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-sm transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    Memproses...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">rocket_launch</span>
                    Konfigurasi Sekarang
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="bg-[#007acc] h-1 w-full"></div>
      </div>
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#007acc] blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 blur-[120px] rounded-full"></div>
      </div>
    </div>
  )
}

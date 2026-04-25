'use client';

import Link from "next/link";
import { deleteProblem, startProblemManual } from "@/app/actions/problem";
import { useState } from "react";

interface Problem {
    id: number;
    title: string;
    isPublic: boolean;
    startTime: Date | null;
    endTime: Date | null;
    duration: number | null;
    timingMode: 'scheduled' | 'manual';
    shortLink?: string | null;
}

interface ProblemsListProps {
    problems: Problem[];
}

function getProblemStatus(p: Problem): { label: string; color: string } {
    const now = new Date();

    if (p.timingMode === 'scheduled') {
        const start = p.startTime ? new Date(p.startTime) : null;
        const end = p.endTime ? new Date(p.endTime) : null;

        if (start && now < start) {
            return { label: 'Belum Dimulai', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
        }
        if (end && now > end) {
            return { label: 'Telah Selesai', color: 'bg-zinc-800 text-zinc-500 border-zinc-700' };
        }
        return { label: 'Sedang Berjalan', color: 'bg-green-900/40 text-green-400 border-green-900/50' };
    }

    if (!p.startTime) {
        return { label: 'Belum Dimulai', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }

    const start = new Date(p.startTime);
    if (p.duration) {
        const end = new Date(start.getTime() + p.duration * 60000);
        if (now > end) {
            return { label: 'Sesi Selesai', color: 'bg-zinc-800 text-zinc-500 border-zinc-700' };
        }
    }

    return { label: 'Sedang Berjalan', color: 'bg-green-900/40 text-green-400 border-green-900/50' };
}

export default function ProblemsList({ problems }: ProblemsListProps) {
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [shareModal, setShareModal] = useState<{ id: number; url: string; shortLink?: string | null } | null>(null);

    const handleDelete = async (id: number) => {
        if (confirm("Apakah Anda yakin ingin menghapus soal ini?")) {
            await deleteProblem(id);
        }
    };

    const handleShare = (problem: Problem) => {
        const url = `${window.location.origin}/problem/${problem.id}`;
        setShareModal({ id: problem.id, url, shortLink: problem.shortLink });
    };

    const copyToClipboard = (text: string, id: number) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="bg-[#252526] border border-[#333333] rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Daftar Soal</h2>
            <div className="space-y-4">
                {problems.length === 0 ? (
                    <p className="text-zinc-500">Belum ada soal yang dibuat.</p>
                ) : (
                    problems.map(p => {
                        const status = getProblemStatus(p);
                        return (
                            <div key={p.id} className="flex justify-between items-center p-4 bg-[#1e1e1e] border border-[#333333] rounded hover:border-zinc-500 transition-colors group">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-white font-bold">{p.title}</h3>
                                        {!p.isPublic && (
                                            <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 font-bold uppercase tracking-wider">Privat</span>
                                        )}
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-[10px] uppercase font-bold text-zinc-500 flex-wrap">
                                        <span>ID: {p.id}</span>
                                        <span className={`px-1.5 py-0.5 rounded border text-[9px] ${p.timingMode === 'manual' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-green-900/10 text-green-500 border-green-900/20'}`}>
                                            {p.timingMode === 'manual' ? '⏱ Mulai Manual' : '📅 Terjadwal'}
                                        </span>
                                        {p.timingMode === 'scheduled' && p.startTime && (
                                            <span>Mulai: {new Date(p.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        )}
                                        {p.timingMode === 'scheduled' && p.endTime && (
                                            <span>Selesai: {new Date(p.endTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        )}
                                        {p.duration && <span>Durasi: {p.duration} menit</span>}
                                        {p.timingMode === 'manual' && p.startTime && (
                                            <span className="text-green-500">
                                                Dimulai: {new Date(p.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 items-center ml-4 shrink-0">
                                    {p.timingMode === 'manual' && (() => {
                                        const s = getProblemStatus(p);
                                        const isRunning = s.label === 'Sedang Berjalan';
                                        const isFinished = s.label === 'Sesi Selesai';
                                        const label = isRunning ? 'MULAI ULANG' : (isFinished ? 'MULAI KEMBALI' : 'MULAI');
                                        const icon = isRunning ? 'restart_alt' : 'play_circle';
                                        const color = 'bg-green-600 hover:bg-green-700 shadow-green-900/20';
                                        return (
                                            <button
                                                onClick={async () => {
                                                    const msg = isRunning
                                                        ? `Mulai ulang sesi "${p.title}"? Pengatur waktu akan diatur ulang dan mahasiswa yang sedang mengerjakan akan kehilangan sisa waktu.`
                                                        : `Mulai sesi "${p.title}"? Tindakan ini akan memulai hitung mundur selama ${p.duration} menit untuk seluruh mahasiswa saat ini.`;
                                                    if (confirm(msg)) {
                                                        await startProblemManual(p.id);
                                                    }
                                                }}
                                                className={`flex items-center gap-1 text-white text-[10px] font-bold px-3 py-1.5 rounded transition-all shadow-lg ${color}`}
                                            >
                                                <span className="material-symbols-outlined text-sm">{icon}</span>
                                                {label}
                                            </button>
                                        );
                                    })()}

                                    <button
                                        onClick={() => handleShare(p)}
                                        className="p-2 transition-colors flex items-center gap-1 text-zinc-400 hover:text-green-400"
                                        title="Bagikan Tautan"
                                    >
                                        <span className="material-symbols-outlined text-sm">share</span>
                                    </button>
                                    <Link
                                        href={`/admin/problem/${p.id}/results`}
                                        className="p-2 text-zinc-400 hover:text-green-500 transition-colors"
                                        title="Lihat Hasil"
                                    >
                                        <span className="material-symbols-outlined text-sm">bar_chart</span>
                                    </Link>
                                    <Link
                                        href={`/admin/problem/${p.id}/edit`}
                                        className="p-2 text-zinc-400 hover:text-green-500 transition-colors"
                                        title="Ubah Soal"
                                    >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(p.id)}
                                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                        title="Hapus Soal"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Share Modal */}
            {shareModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#252526] border border-[#333333] rounded-2xl p-8 max-w-4xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-500">share</span>
                                Bagikan Soal
                            </h3>
                            <button 
                                onClick={() => setShareModal(null)}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-8">
                            {shareModal.shortLink ? (
                                <div className="text-center space-y-4">
                                    <div className="bg-[#1e1e1e] p-10 rounded-xl border border-green-600/30 group relative">
                                        <div style={{fontSize : "42pt"}} className="font-black text-green-500 font-mono break-all leading-none">
                                            {shareModal.shortLink.replace('http://', '').replace('https://', '')}
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(shareModal.shortLink!, shareModal.id)}
                                            className="mt-10 flex items-center gap-2 mx-auto px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-900/20"
                                        >
                                            <span className="material-symbols-outlined text-sm">
                                                {copiedId === shareModal.id ? 'check' : 'content_copy'}
                                            </span>
                                            {copiedId === shareModal.id ? 'Tersalin!' : 'Salin Tautan Singkat'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-900/20 border border-amber-900/30 p-4 rounded-lg text-amber-500 text-sm flex items-center gap-3">
                                    <span className="material-symbols-outlined">warning</span>
                                    Tautan singkat tidak tersedia. Pastikan APP_URL dan SHORTLINK_URL sudah dikonfigurasi.
                                </div>
                            )}

                            <div className="pt-6 border-t border-[#333333]">
                                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-3">Tautan Lengkap</p>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={shareModal.url}
                                        className="flex-1 bg-[#1e1e1e] border border-[#333333] text-zinc-400 p-3 rounded text-xs font-mono"
                                    />
                                    <button 
                                        onClick={() => copyToClipboard(shareModal.url, -1)}
                                        className="px-4 py-2 bg-[#333333] text-white rounded font-bold text-xs hover:bg-[#444444] transition-colors"
                                    >
                                        Salin
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShareModal(null)}
                            className="w-full mt-8 py-3 text-zinc-500 font-bold hover:text-white transition-colors text-sm"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

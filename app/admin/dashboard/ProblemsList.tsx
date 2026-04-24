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
            return { label: 'Belum Dimulai', color: 'bg-amber-900/40 text-amber-400 border-amber-900/50' };
        }
        if (end && now > end) {
            return { label: 'Telah Selesai', color: 'bg-zinc-800 text-zinc-500 border-zinc-700' };
        }
        return { label: 'Sedang Berjalan', color: 'bg-green-900/40 text-green-400 border-green-900/50' };
    }

    if (!p.startTime) {
        return { label: 'Belum Dimulai', color: 'bg-purple-900/40 text-purple-400 border-purple-900/50' };
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

    const handleDelete = async (id: number) => {
        if (confirm("Apakah Anda yakin ingin menghapus soal ini?")) {
            await deleteProblem(id);
        }
    };

    const handleShare = (id: number) => {
        const url = `${window.location.origin}/problem/${id}`;
        navigator.clipboard.writeText(url);
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
                                            <span className="text-[9px] bg-orange-900/40 text-orange-400 px-1.5 py-0.5 rounded border border-orange-900/50 font-bold uppercase tracking-wider">Privat</span>
                                        )}
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-[10px] uppercase font-bold text-zinc-500 flex-wrap">
                                        <span>ID: {p.id}</span>
                                        <span className={`px-1.5 py-0.5 rounded border text-[9px] ${p.timingMode === 'manual' ? 'bg-purple-900/40 text-purple-400 border-purple-900/50' : 'bg-blue-900/40 text-blue-400 border-blue-900/50'}`}>
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
                                        const color = isRunning
                                            ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-900/20'
                                            : 'bg-purple-600 hover:bg-purple-700 shadow-purple-900/20';
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
                                        onClick={() => handleShare(p.id)}
                                        className={`p-2 transition-colors flex items-center gap-1 ${copiedId === p.id ? 'text-green-500' : 'text-zinc-400 hover:text-orange-400'}`}
                                        title="Bagikan Tautan"
                                    >
                                        {copiedId === p.id ? (
                                            <>
                                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                                <span className="text-[9px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-right-1">Link disalin!</span>
                                            </>
                                        ) : (
                                            <span className="material-symbols-outlined text-sm">share</span>
                                        )}
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
                                        className="p-2 text-zinc-400 hover:text-[#007acc] transition-colors"
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
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { getCheatLogsBySubmissionId } from '@/app/actions/submission';

interface Submission {
    id: number;
    nim: string;
    code: string;
    status: string;
    createdAt: Date;
    problemId: number;
    problemTitle: string | null;
}

interface SubmissionsListProps {
    submissions: Submission[];
}

export default function SubmissionsList({ submissions }: SubmissionsListProps) {
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [cheatLogs, setCheatLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    useEffect(() => {
        if (selectedSubmission) {
            setIsLoadingLogs(true);
            getCheatLogsBySubmissionId(selectedSubmission.id).then(logs => {
                setCheatLogs(logs);
                setIsLoadingLogs(false);
            });
        } else {
            setCheatLogs([]);
        }
    }, [selectedSubmission]);

    return (
        <div className="bg-[#252526] border border-[#333333] rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Recent Submissions</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[#333333] text-zinc-500 text-sm">
                            <th className="pb-3 font-semibold">NIM</th>
                            <th className="pb-3 font-semibold">Problem</th>
                            <th className="pb-3 font-semibold">Status</th>
                            <th className="pb-3 font-semibold">Time</th>
                            <th className="pb-3 font-semibold text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333333]">
                        {submissions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-4 text-center text-zinc-500">No submissions yet.</td>
                            </tr>
                        ) : (
                            submissions.map(s => (
                                <tr key={s.id} className="text-zinc-300 hover:bg-[#2d2d2d] transition-colors group">
                                    <td className="py-3 font-mono text-sm">{s.nim}</td>
                                    <td className="py-3">{s.problemTitle || `Problem ${s.problemId}`}</td>
                                    <td className="py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${s.status === 'pass' ? 'bg-green-900/40 text-green-400 border border-green-900/50' : 'bg-red-900/40 text-red-500 border border-red-900/50'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="py-3 text-xs text-zinc-500">
                                        {new Date(s.createdAt).toLocaleString()}
                                    </td>
                                    <td className="py-3 text-right">
                                        <button 
                                            onClick={() => setSelectedSubmission(s)}
                                            className="text-[10px] font-bold uppercase tracking-widest text-[#007acc] hover:text-[#005f9e] transition-colors"
                                        >
                                            View Code
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Code Viewer Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="bg-[#252526] px-6 py-4 border-b border-[#333333] flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-white">Submission Details</h3>
                                <div className="flex gap-4 text-xs text-zinc-500 mt-1">
                                    <span>NIM: <span className="text-zinc-300">{selectedSubmission.nim}</span></span>
                                    <span>Problem: <span className="text-zinc-300">{selectedSubmission.problemTitle}</span></span>
                                    <span>Status: <span className={selectedSubmission.status === 'pass' ? 'text-green-400' : 'text-red-400'}>{selectedSubmission.status.toUpperCase()}</span></span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedSubmission(null)}
                                className="bg-[#333333] text-white p-2 rounded-full hover:bg-[#444444] transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className="flex-1 relative border-r border-[#333333]">
                                <div className="absolute top-0 left-0 bg-[#2d2d2d] px-3 py-1 text-[10px] text-zinc-500 font-bold uppercase tracking-widest z-10 border-r border-b border-[#333333]">
                                    Source Code
                                </div>
                                <Editor
                                    height="100%"
                                    defaultLanguage="python"
                                    theme="vs-dark"
                                    value={selectedSubmission.code}
                                    options={{
                                        readOnly: true,
                                        fontSize: 14,
                                        minimap: { enabled: true },
                                        automaticLayout: true,
                                        scrollBeyondLastLine: false,
                                        padding: { top: 40 },
                                        fontFamily: "'Fira Code', 'Courier New', monospace",
                                    }}
                                />
                            </div>
                            
                            <div className="w-80 bg-[#1e1e1e] flex flex-col overflow-hidden">
                                <div className="bg-[#2d2d2d] px-4 py-2 border-b border-[#333333] flex items-center justify-between">
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Aktivitas Anti-Cheat</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cheatLogs.length > 0 ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'}`}>
                                        {cheatLogs.length} Events
                                    </span>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {isLoadingLogs ? (
                                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-500">
                                            <span className="material-symbols-outlined animate-spin">sync</span>
                                            <span className="text-[10px] uppercase font-bold tracking-widest">Memuat log...</span>
                                        </div>
                                    ) : cheatLogs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-600 italic">
                                            <span className="material-symbols-outlined text-3xl">check_circle</span>
                                            <span className="text-xs">Tidak ada aktivitas mencurigakan.</span>
                                        </div>
                                    ) : (
                                        cheatLogs.map((log) => (
                                            <div key={log.id} className="bg-[#252526] border border-[#333333] rounded p-3 text-xs">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`font-bold uppercase tracking-tighter ${log.eventType === 'blur' ? 'text-orange-400' : 'text-amber-400'}`}>
                                                        {log.eventType}
                                                    </span>
                                                    <span className="text-[9px] text-zinc-500">
                                                        {new Date(log.createdAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <p className="text-zinc-400 text-[11px] leading-tight whitespace-pre-wrap">{log.description}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                                
                                <div className="p-4 bg-red-900/10 border-t border-red-900/20">
                                    <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest leading-tight">
                                        💡 Admin Note: Fokuskan pada log "blur" yang berulang saat pengerjaan soal.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[#252526] px-6 py-3 border-t border-[#333333] text-right">
                             <button 
                                onClick={() => setSelectedSubmission(null)}
                                className="px-6 py-2 bg-[#007acc] text-white rounded font-bold hover:bg-[#005f9e]"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

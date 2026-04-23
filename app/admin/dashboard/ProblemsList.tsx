'use client';

import Link from "next/link";
import { deleteProblem } from "@/app/actions/problem";

interface Problem {
    id: number;
    title: string;
    isPublic: boolean;
    startTime: Date | null;
    endTime: Date | null;
    duration: number | null;
}

interface ProblemsListProps {
    problems: Problem[];
}

export default function ProblemsList({ problems }: ProblemsListProps) {
    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this problem?")) {
            await deleteProblem(id);
        }
    };

    return (
        <div className="bg-[#252526] border border-[#333333] rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Problems List</h2>
            <div className="space-y-4">
                {problems.length === 0 ? (
                    <p className="text-zinc-500">No problems created yet.</p>
                ) : (
                    problems.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-4 bg-[#1e1e1e] border border-[#333333] rounded hover:border-zinc-500 transition-colors group">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-white font-bold">{p.title}</h3>
                                    {!p.isPublic && (
                                        <span className="text-[9px] bg-orange-900/40 text-orange-400 px-1.5 py-0.5 rounded border border-orange-900/50 font-bold uppercase tracking-wider">Private</span>
                                    )}
                                </div>
                                <div className="flex gap-4 text-[10px] uppercase font-bold text-zinc-500">
                                    <span>ID: {p.id}</span>
                                    {p.startTime && <span>Start: {new Date(p.startTime).toLocaleString()}</span>}
                                    {p.endTime && <span>End: {new Date(p.endTime).toLocaleString()}</span>}
                                    {p.duration && <span>Duration: {p.duration}m</span>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Link 
                                    href={`/admin/problem/${p.id}/edit`}
                                    className="p-2 text-zinc-400 hover:text-[#007acc] transition-colors"
                                    title="Edit Problem"
                                >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                </Link>
                                <button 
                                    onClick={() => handleDelete(p.id)}
                                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                    title="Delete Problem"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

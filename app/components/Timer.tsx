'use client';

import { useState, useEffect } from 'react';

interface TimerProps {
  endTime?: Date | null;
  startTime?: Date | null;
  mode?: 'countdown-to-end' | 'countdown-to-start';
  onExpire?: () => void;
}

export default function Timer({ endTime, startTime, mode = 'countdown-to-end', onExpire }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const targetTime = mode === 'countdown-to-start' ? startTime : endTime;
    if (!targetTime) return;

    const target = new Date(targetTime).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft(mode === 'countdown-to-start' ? 'DIMULAI' : 'HABIS');
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (mode === 'countdown-to-end') {
        setIsUrgent(distance < 5 * 60 * 1000);
      }

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, startTime, mode, onExpire]);

  const targetTime = mode === 'countdown-to-start' ? startTime : endTime;
  if (!targetTime) return null;

  if (mode === 'countdown-to-start') {
    return (
      <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-700/50 px-3 py-1 rounded text-amber-400 font-mono text-sm font-bold">
        <span className="material-symbols-outlined text-sm">schedule</span>
        <span className="text-[10px] uppercase tracking-widest mr-1 font-bold">Mulai dalam</span>
        {timeLeft}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded font-mono text-lg font-bold transition-colors ${
      isUrgent
        ? 'bg-red-900/30 border border-red-700/50 text-red-400 animate-pulse'
        : 'bg-[#1e1e1e] border border-[#333333] text-[#007acc]'
    }`}>
      <span className="material-symbols-outlined text-sm">schedule</span>
      {timeLeft}
    </div>
  );
}

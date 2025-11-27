// src/utils/helpers.ts
import type { Driver } from '../types';

export const formatTime = (s: number) => {
    if(isNaN(s) || s < 0) return "00:00:00";
    const h = Math.floor(s/3600).toString().padStart(2,'0');
    const m = Math.floor((s%3600)/60).toString().padStart(2,'0');
    const sec = (s%60).toString().padStart(2,'0');
    return `${h}:${m}:${sec}`;
};

export const formatLapTime = (s: number) => {
    if (isNaN(s) || s <= 0) return "---";
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`; 
};

export const getSafeDriver = (driver: Driver | undefined): Driver => {
  return driver || { id: 'unknown', name: "---", phone: "", color: "#3b82f6", text: "text-slate-500" };
};

export const getLapTimeDelta = (estimatedTime: number, realTimeAvg: number) => {
    const delta = realTimeAvg - estimatedTime;
    let colorClass = 'text-white';
    let deltaSign = '';
    if (delta > 0.5) { 
        colorClass = 'text-red-500';
        deltaSign = '+';
    } else if (delta < -0.5) { 
        colorClass = 'text-emerald-500';
        deltaSign = '-'; 
    } else if (delta !== 0) { 
        colorClass = 'text-amber-500';
        deltaSign = delta > 0 ? '+' : '';
    }
    const displayDelta = delta !== 0 ? `${deltaSign}${Math.abs(delta).toFixed(2)}s` : '±0.0s';
    return { colorClass, displayDelta, realTimeAvg };
};
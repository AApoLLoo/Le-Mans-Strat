import React, { useState } from 'react';
import type { RawVehicle, TelemetryData } from '../../types';

interface LiveTimingViewProps {
    telemetryData: TelemetryData;
    isHypercar: boolean;
    vehicles?: RawVehicle[];
}

// Couleurs des catégories (WEC style)
const CLASS_COLORS: Record<string, string> = {
    'hypercar': 'border-l-4 border-l-red-600',
    'lmp2': 'border-l-4 border-l-blue-600',
    'gt3': 'border-l-4 border-l-orange-500',
    'lmgt3': 'border-l-4 border-l-orange-500',
    'default': 'border-l-4 border-l-slate-500'
};

const LiveTimingView: React.FC<LiveTimingViewProps> = ({ vehicles = [] }) => {
    const [filterClass, setFilterClass] = useState<string>('ALL');

    // Tri par position
    const sortedVehicles = [...vehicles].sort((a, b) => (a.position || 999) - (b.position || 999));

    // Filtrage CORRIGÉ
    const filteredVehicles = sortedVehicles.filter(v => {
        if (filterClass === 'ALL') return true;

        const c = (v.class || "").toLowerCase();
        const f = filterClass.toLowerCase();

        if (f === 'hypercar') {
            return c.includes('hyper') || c.includes('lmh') || c.includes('lmdh') || c.includes('gtop');
        }
        if (f === 'gt3') {
            return c.includes('gt3') || c.includes('lmgt3') || c.includes('gte');
        }
        return c.includes(f);
    });

    // Helpers de formatage
    const formatLap = (seconds?: number) => {
        if (!seconds || seconds <= 0) return "-:--.---";
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return `${mins}:${secs.padStart(6, '0')}`;
    };

    const formatGap = (gap?: number) => {
        if (gap === undefined || gap === null) return "";
        if (gap === 0) return "-";
        return `+${gap.toFixed(1)}`;
    };

    return (
        <div className="h-full flex flex-col bg-[#0b0f19] overflow-hidden">

            {/* --- FILTRES --- */}
            <div className="flex gap-2 p-2 border-b border-white/10 bg-slate-900/50 shrink-0">
                {['ALL', 'HYPERCAR', 'LMP2', 'GT3'].map(cls => (
                    <button
                        key={cls}
                        onClick={() => setFilterClass(cls)}
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${filterClass === cls ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        {cls}
                    </button>
                ))}
            </div>

            {/* --- TABLEAU --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-bold text-slate-500 uppercase sticky top-0 z-10 shadow-md">
                    <tr>
                        <th className="p-2 w-12 text-center">Pos</th>
                        <th className="p-2">Driver / Team</th>
                        <th className="p-2 w-20 text-right">Gap</th>
                        <th className="p-2 w-20 text-right">Int.</th>
                        <th className="p-2 w-24 text-right">Last Lap</th>
                        <th className="p-2 w-24 text-right">Best Lap</th>
                        <th className="p-2 w-14 text-center">S1</th>
                        <th className="p-2 w-14 text-center">S2</th>
                        <th className="p-2 w-14 text-center">S3</th>
                        <th className="p-2 w-16 text-center">Stint</th>
                        <th className="p-2 w-16 text-center">Fuel</th>
                        <th className="p-2 w-10 text-center">Pit</th>
                    </tr>
                    </thead>
                    <tbody className="text-xs font-mono text-slate-300">
                    {filteredVehicles.map((v) => {
                        const isMe = v.is_player === 1;

                        // Style de ligne
                        let rowClass = "border-b border-white/5 hover:bg-white/5 transition-colors";
                        if (isMe) rowClass += " bg-indigo-900/20";
                        if (v.in_pits) rowClass += " text-purple-300";
                        if (v.status === 2) rowClass += " text-red-500 line-through opacity-50";

                        // Style catégorie
                        let catKey = 'default';
                        const cStr = (v.class || "").toLowerCase();
                        if (cStr.includes('hyper') || cStr.includes('lmh') || cStr.includes('lmdh')) catKey = 'hypercar';
                        else if (cStr.includes('lmp2')) catKey = 'lmp2';
                        else if (cStr.includes('gt3')) catKey = 'gt3';

                        // Calcul Secteurs Courants
                        const s1 = v.sectors_cur?.[0] || 0;
                        const s2_cumul = v.sectors_cur?.[1] || 0;
                        const s2 = (s2_cumul > s1) ? s2_cumul - s1 : 0;
                        const s2_best_cumul = v.sectors_best?.[1] || 0;
                        const s3_best = (v.best_lap && s2_best_cumul) ? v.best_lap - s2_best_cumul : 0;

                        // Barre de fuel estimée
                        const maxLaps = v.class?.includes('Hyper') ? 13 : 12;
                        const fuelPct = Math.max(0, 100 - ((v.stint_laps || 0) / maxLaps * 100));
                        let fuelColor = 'bg-emerald-500';
                        if (fuelPct < 30) fuelColor = 'bg-yellow-500';
                        if (fuelPct < 10) fuelColor = 'bg-red-500 animate-pulse';

                        // Détection Secteur Actif (v.sector : 1, 2 ou 3)
                        const activeSectorBg = "bg-yellow-500/20 text-yellow-200 font-bold";

                        return (
                            <tr key={v.id || Math.random()} className={`${rowClass} ${CLASS_COLORS[catKey]}`}>
                                <td className="p-2 text-center font-bold text-white text-sm">{v.position}</td>
                                <td className="p-2">
                                    <div className="font-bold truncate max-w-[150px]">{v.driver}</div>
                                    <div className="text-[9px] text-slate-500 truncate">{v.vehicle}</div>
                                </td>
                                <td className="p-2 text-right text-yellow-400">{v.position === 1 ? 'Leader' : formatGap(v.gap_leader)}</td>
                                <td className="p-2 text-right text-slate-400">{formatGap(v.gap_next)}</td>
                                <td className="p-2 text-right font-bold">{formatLap(v.last_lap)}</td>
                                <td className="p-2 text-right text-purple-400">{formatLap(v.best_lap)}</td>

                                <td className={`p-2 text-center text-[10px] ${v.sector === 1 ? activeSectorBg : 'text-slate-500'}`}>
                                    {s1 > 0 ? s1.toFixed(1) : '-'}
                                </td>

                                <td className={`p-2 text-center text-[10px] ${v.sector === 2 ? activeSectorBg : 'text-slate-500'}`}>
                                    {s2 > 0 ? s2.toFixed(1) : '-'}
                                </td>

                                <td className={`p-2 text-center text-[10px] ${v.sector === 3 ? activeSectorBg : 'text-purple-400/70'}`}>
                                    {s3_best > 0 ? s3_best.toFixed(1) : '-'}
                                </td>

                                <td className="p-2 text-center text-slate-300">{v.stint_laps || 0}L</td>

                                <td className="p-2 align-middle">
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${fuelColor}`} style={{ width: `${fuelPct}%` }}></div>
                                    </div>
                                </td>

                                <td className="p-2 text-center">
                                    {v.in_pits ? (
                                        <span className="bg-purple-600 text-white px-1 rounded text-[9px] font-bold animate-pulse">IN</span>
                                    ) : (
                                        <span className="text-slate-600">{v.pit_stops}</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LiveTimingView;
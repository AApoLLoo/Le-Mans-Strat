import React, { useState } from 'react';
// import { Clock, Flag, AlertTriangle } from 'lucide-react';
import type { RawVehicle, TelemetryData } from '../../types';
// import { formatTime } from '../../utils/helpers';

interface LiveTimingViewProps {
    telemetryData: TelemetryData;
    isHypercar: boolean; // Pour filtrer ou mettre en avant (optionnel)
    vehicles?: RawVehicle[]; // On récupère la liste complète
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

    // Fonction de tri (Position)
    const sortedVehicles = [...vehicles].sort((a, b) => (a.position || 999) - (b.position || 999));

    // Filtrage
    const filteredVehicles = sortedVehicles.filter(v => {
        if (filterClass === 'ALL') return true;
        const c = (v.class || "").toLowerCase();
        return c.includes(filterClass.toLowerCase());
    });

    // Fonction pour formater les chronos (1:23.456)
    const formatLap = (seconds?: number) => {
        if (!seconds || seconds <= 0) return "-:--.---";
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return `${mins}:${secs.padStart(6, '0')}`;
    };

    // Fonction pour formater les écarts (+1.234 ou +1L)
    const formatGap = (gap?: number) => {
        if (gap === undefined || gap === null) return "";
        if (gap === 0) return "-";
        // Si l'écart est très grand (> 1 tour environ 200s+ sur certains circuits), c'est souvent un tour de retard
        // Note: Le jeu envoie parfois le gap en temps même pour les retardataires, parfois non.
        return `+${gap.toFixed(1)}`;
    };

    return (
        <div className="h-full flex flex-col bg-[#0b0f19] overflow-hidden">

            {/* --- FILTRES --- */}
            <div className="flex gap-2 p-2 border-b border-white/10 bg-slate-900/50">
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
                    <thead className="bg-slate-900 text-[10px] font-bold text-slate-500 uppercase sticky top-0 z-10">
                    <tr>
                        <th className="p-2 w-12 text-center">Pos</th>
                        <th className="p-2">Driver / Team</th>
                        <th className="p-2 w-20 text-right">Gap</th>
                        <th className="p-2 w-20 text-right">Int.</th>
                        <th className="p-2 w-24 text-right">Last Lap</th>
                        <th className="p-2 w-24 text-right">Best Lap</th>
                        <th className="p-2 w-16 text-center">S1</th>
                        <th className="p-2 w-16 text-center">S2</th>
                        <th className="p-2 w-16 text-center">S3</th>
                        <th className="p-2 w-10 text-center">Pit</th>
                    </tr>
                    </thead>
                    <tbody className="text-xs font-mono text-slate-300">
                    {filteredVehicles.map((v) => {
                        const isMe = v.is_player === 1;

                        // Style de ligne
                        let rowClass = "border-b border-white/5 hover:bg-white/5 transition-colors";
                        if (isMe) rowClass += " bg-indigo-900/20";
                        if (v.in_pits) rowClass += " text-purple-300"; // En violet si au stand
                        if (v.status === 2) rowClass += " text-red-500 line-through opacity-50"; // DNF

                        // Style catégorie
                        let catKey = 'default';
                        const cStr = (v.class || "").toLowerCase();
                        if (cStr.includes('hyper')) catKey = 'hypercar';
                        else if (cStr.includes('lmp2')) catKey = 'lmp2';
                        else if (cStr.includes('gt3')) catKey = 'gt3';

                        // Calcul Secteurs (Simplifié)
                        // Le jeu envoie les temps cumulés (Split 1, Split 2).
                        // S1 = Split1. S2 = Split2 - Split1. S3 = LastLap - Split2 (Approximatif pour le tour précédent)
                        const s1 = v.sectors_cur?.[0] || 0;
                        const s2_cumul = v.sectors_cur?.[1] || 0;
                        const s2 = (s2_cumul > s1) ? s2_cumul - s1 : 0;

                        return (
                            <tr key={v.id || Math.random()} className={`${rowClass} ${CLASS_COLORS[catKey]}`}>
                                {/* POS */}
                                <td className="p-2 text-center font-bold text-white text-sm">
                                    {v.position}
                                </td>

                                {/* PILOTE */}
                                <td className="p-2">
                                    <div className="font-bold truncate max-w-[150px]">{v.driver}</div>
                                    <div className="text-[9px] text-slate-500 truncate">{v.vehicle}</div>
                                </td>

                                {/* GAP LEADER */}
                                <td className="p-2 text-right text-yellow-400">
                                    {v.position === 1 ? 'Leader' : formatGap(v.gap_leader)}
                                </td>

                                {/* INTERVAL (Gap Next) */}
                                <td className="p-2 text-right text-slate-400">
                                    {formatGap(v.gap_next)}
                                </td>

                                {/* LAST LAP */}
                                <td className="p-2 text-right font-bold">
                                    {formatLap(v.last_lap)}
                                </td>

                                {/* BEST LAP */}
                                <td className="p-2 text-right text-purple-400">
                                    {formatLap(v.best_lap)}
                                </td>

                                {/* SECTEURS */}
                                <td className="p-2 text-center text-[10px] text-slate-500">
                                    {s1 > 0 ? s1.toFixed(1) : '-'}
                                </td>
                                <td className="p-2 text-center text-[10px] text-slate-500">
                                    {s2 > 0 ? s2.toFixed(1) : '-'}
                                </td>
                                <td className="p-2 text-center text-[10px] text-slate-500">
                                    -
                                </td>

                                {/* PITS */}
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
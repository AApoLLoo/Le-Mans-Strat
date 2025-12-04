import React, { useMemo } from 'react';
import { TrendingUp, Activity, Droplet, Zap } from 'lucide-react';
import type { LapData } from '../../types';
import { formatTime } from '../../utils/helpers';

interface AnalysisViewProps {
    history: LapData[];
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ history }) => {
    // Inverser pour avoir le plus récent à droite, ou garder l'ordre chronologique
    // Ici on garde l'ordre chrono (Tour 1 -> Tour N)
    const data = useMemo(() => history.sort((a, b) => a.lapNumber - b.lapNumber), [history]);

    if (data.length === 0) return (
        <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-2">
            <Activity size={48} className="opacity-20"/>
            <span>NO LAP DATA YET</span>
            <span className="text-xs">Complete a lap to see analysis</span>
        </div>
    );

    // Calcul des échelles pour les graphiques
    const maxLapTime = Math.max(...data.map(d => d.lapTime));
    const minLapTime = Math.min(...data.map(d => d.lapTime > 0 ? d.lapTime : 999));
    const maxFuel = Math.max(...data.map(d => d.fuelUsed));
    const maxVE = Math.max(...data.map(d => d.veUsed));

    return (
        <div className="h-full bg-[#0b0f19] p-6 overflow-y-auto flex flex-col gap-6">

            {/* --- GRAPHIQUE 1 : TEMPS AU TOUR --- */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col h-64">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                        <TrendingUp size={14} className="text-indigo-400"/> Lap Time Consistency
                    </h3>
                    <div className="text-xs font-mono text-indigo-400">Best: {formatTime(minLapTime)}</div>
                </div>

                <div className="flex-1 flex items-end gap-1 relative border-b border-slate-700 pb-1">
                    {data.map((lap, i) => {
                        if (lap.lapTime <= 0) return null;
                        // Normalisation pour l'affichage (le plus rapide en haut, plus lent en bas)
                        // On amplifie les variations pour que ce soit lisible
                        const range = maxLapTime - minLapTime || 1;
                        const heightPct = 100 - ((lap.lapTime - minLapTime) / range * 80);

                        return (
                            <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/20">
                                    L{lap.lapNumber}: {formatTime(lap.lapTime)}
                                </div>

                                {/* Barre/Point */}
                                <div
                                    className="w-full bg-indigo-500/50 hover:bg-indigo-400 transition-all rounded-t-sm relative"
                                    style={{ height: `${heightPct}%`, minHeight: '4px' }}
                                >
                                    <div className="absolute top-0 w-full h-0.5 bg-indigo-300 shadow-[0_0_5px_indigo]"></div>
                                </div>

                                <span className="text-[8px] text-slate-600 mt-1">{lap.lapNumber}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- GRAPHIQUE 2 : CONSOMMATION --- */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col h-64">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                        <Activity size={14} className="text-emerald-400"/> Consumption per Lap
                    </h3>
                    <div className="flex gap-4 text-[10px]">
                        <span className="flex items-center gap-1 text-blue-400"><Droplet size={10}/> Fuel (L)</span>
                        <span className="flex items-center gap-1 text-cyan-400"><Zap size={10}/> Energy (%)</span>
                    </div>
                </div>

                <div className="flex-1 flex items-end gap-2 relative border-b border-slate-700 pb-1">
                    {data.map((lap, i) => {
                        const fuelH = (lap.fuelUsed / (maxFuel || 1)) * 80;
                        const veH = (lap.veUsed / (maxVE || 1)) * 80;

                        return (
                            <div key={i} className="flex-1 flex flex-col justify-end items-center group relative gap-0.5">
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/20">
                                    L{lap.lapNumber} | Fuel: {lap.fuelUsed.toFixed(2)}L | VE: {lap.veUsed.toFixed(2)}%
                                </div>

                                {/* Barres cote à cote ou superposées */}
                                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                                    {/* Fuel */}
                                    <div className="w-1/2 bg-blue-600 hover:bg-blue-500 transition-all rounded-t-sm" style={{ height: `${fuelH}%` }}></div>
                                    {/* VE */}
                                    <div className="w-1/2 bg-cyan-600 hover:bg-cyan-500 transition-all rounded-t-sm" style={{ height: `${veH}%` }}></div>
                                </div>

                                <span className="text-[8px] text-slate-600 mt-1">{lap.lapNumber}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- TABLEAU RECAP RAPIDE --- */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-400">
                    <thead className="bg-slate-800 uppercase font-bold text-[10px]">
                    <tr>
                        <th className="p-2 rounded-l">Lap</th>
                        <th className="p-2">Time</th>
                        <th className="p-2">Fuel</th>
                        <th className="p-2">Energy</th>
                        <th className="p-2 rounded-r">Tires (FL/RL)</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                    {/* On affiche les 5 derniers tours seulement */}
                    {[...data].reverse().slice(0, 5).map(lap => (
                        <tr key={lap.lapNumber} className="hover:bg-white/5">
                            <td className="p-2 font-bold text-white">{lap.lapNumber}</td>
                            <td className="p-2 font-mono text-indigo-300">{formatTime(lap.lapTime)}</td>
                            <td className="p-2">{lap.fuelUsed.toFixed(2)} L</td>
                            <td className="p-2">{lap.veUsed.toFixed(2)} %</td>
                            <td className="p-2">
                                <span className={lap.tireWearFL < 40 ? 'text-red-500' : 'text-emerald-500'}>{lap.tireWearFL.toFixed(0)}%</span>
                                {' / '}
                                <span className={lap.tireWearRL < 40 ? 'text-red-500' : 'text-emerald-500'}>{lap.tireWearRL.toFixed(0)}%</span>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default AnalysisView;
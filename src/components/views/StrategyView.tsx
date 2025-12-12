import React from 'react';
/* AJOUT DE 'Zap' DANS LES IMPORTS */
import { Timer, Activity, User, Disc, Fuel, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import type { StrategyData, TelemetryData, Driver } from '../../types';

interface StrategyViewProps {
    strategyData: StrategyData;
    currentLap: number;
    telemetry: TelemetryData;
    drivers: Driver[];
    onUpdateStint: (idx: number, key: string, val: any) => void;
    onUpdateNote: (idx: number, val: string) => void;
}

const StrategyView: React.FC<StrategyViewProps> = ({
                                                       strategyData, telemetry, drivers, onUpdateStint, onUpdateNote
                                                   }) => {
    const { pitPrediction, stints } = strategyData;

    // Couleurs trafic
    const trafficColor = pitPrediction ? {
        'CLEAR': 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
        'BUSY': 'text-yellow-400 border-yellow-500/30 bg-yellow-950/20',
        'TRAFFIC': 'text-red-500 border-red-500/30 bg-red-950/20 animate-pulse'
    }[pitPrediction.trafficLevel] : '';

    // Calcul temps perdu total (Voie + Arrêt)
    const pitLaneLoss = 28; // Est. Loss LMU
    const estStop = telemetry.strategyEstPitTime || 35;
    const totalLoss = pitLaneLoss + estStop;

    // --- LOGIQUE ÉNERGIE ---
    // On cherche le prochain relais (celui qui n'est pas "done" et pas "current", ou marqué "isNext")
    // Ou simplement le relais suivant l'actuel.
    const nextStint = stints.find(s => s.isNext) || stints.find(s => !s.isDone && !s.isCurrent);
    // On regarde si on a une info d'énergie pertinente (différente de "-" ou vide.)
    const showEnergy = nextStint?.virtualEnergy && nextStint.virtualEnergy !== "-" && nextStint.virtualEnergy !== undefined;
    const energyTarget = nextStint?.virtualEnergy || "100%";

    return (
        <div className="h-full bg-[#050a10] p-4 flex flex-col gap-4 font-display text-white overflow-y-auto">

            {/* --- BLOC 1 : PRÉDICTION TRAFIC & ARRÊT --- */}
            {pitPrediction && (
                <div className={`rounded-xl border p-4 flex flex-col gap-2 ${trafficColor}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-widest opacity-70 flex items-center gap-2">
                                <Timer size={14}/> Pit Exit Prediction
                            </h2>
                            <div className="text-4xl font-black mt-1">
                                P{pitPrediction.predictedPosition}
                                <span className="text-sm font-medium opacity-60 ml-2">
                                    (Current: P{telemetry.position})
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-bold uppercase opacity-70">Traffic</div>
                            <div className="text-xl font-black">{pitPrediction.trafficLevel}</div>
                        </div>
                    </div>

                    {/* Détail Trafic */}
                    <div className="flex flex-col gap-1 mt-2 bg-black/40 rounded-lg p-3">
                        <div className="flex justify-between items-center text-sm opacity-60">
                            <span className="flex items-center gap-2"><ArrowUp size={12}/> {pitPrediction.carAhead || 'Clean Air'}</span>
                            <span className="font-mono">+{pitPrediction.gapToAhead.toFixed(1)}s</span>
                        </div>
                        <div className="flex justify-between items-center text-base font-bold text-white py-1 border-y border-white/10 my-1">
                            <span className="text-emerald-400">YOU (PIT EXIT)</span>
                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded">Total Loss: {totalLoss.toFixed(0)}s</span>
                        </div>
                        <div className="flex justify-between items-center text-sm opacity-60">
                            <span className="flex items-center gap-2"><ArrowDown size={12}/> {pitPrediction.carBehind || 'Clear'}</span>
                            <span className="font-mono">-{pitPrediction.gapToBehind.toFixed(1)}s</span>
                        </div>
                    </div>
                </div>
            )}

            {/* --- BLOC 2 : DÉTAILS DU PROCHAIN ARRÊT (INFO JEU) --- */}
            {/* Modification de la grille : 3 colonnes si Énergie présente, sinon 2 */}
            <div className={`grid gap-4 ${showEnergy ? 'grid-cols-3' : 'grid-cols-2'}`}>

                {/* 1. CARBURANT */}
                <div className="bg-slate-900/50 rounded-xl border border-white/5 p-3">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <Fuel size={10}/> Refuel
                    </div>
                    <div className="text-2xl font-black text-blue-400">
                        {telemetry.strategyPitFuel?.toFixed(1) || "0.0"} <span className="text-sm text-slate-500">L</span>
                    </div>
                    <div className="text-xs text-slate-400">+{telemetry.strategyPitLaps?.toFixed(1) || "0"} Laps</div>
                </div>

                {/* 2. ÉNERGIE VIRTUELLE (NOUVEAU) */}
                {showEnergy && (
                    <div className="bg-slate-900/50 rounded-xl border border-white/5 p-3 relative overflow-hidden">
                        {/* Petit effet de fond pour distinguer l'électrique */}
                        <div className="absolute -right-2 -top-2 text-cyan-500/10 rotate-12">
                            <Zap size={48} />
                        </div>
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                            <Zap size={10} className="text-cyan-400"/> Recharge
                        </div>
                        <div className="text-2xl font-black text-cyan-400">
                            {energyTarget}
                        </div>
                        <div className="text-xs text-slate-400">Target Level</div>
                    </div>
                )}

                {/* 3. TEMPS D'ARRÊT */}
                <div className="bg-slate-900/50 rounded-xl border border-white/5 p-3">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <Timer size={10}/> Est. Time
                    </div>
                    <div className="text-2xl font-black text-amber-400">
                        {estStop.toFixed(1)} <span className="text-sm text-slate-500">s</span>
                    </div>
                    <div className="text-xs text-slate-400">Stop Only</div>
                </div>
            </div>

            {/* --- BLOC 3 : TABLEAU ÉDITEUR DE STRATÉGIE --- */}
            <div className="flex-1 bg-slate-900/30 rounded-xl border border-white/5 p-4 overflow-hidden flex flex-col">
                {/* ... (Reste du code inchangé pour le tableau) ... */}
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                    <Activity size={14}/> Race Strategy
                </h3>

                <div className="flex-1 overflow-x-auto custom-scrollbar">
                    <div className="min-w-[600px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 sticky top-0 bg-[#090c13] z-10">
                            <tr>
                                <th className="p-3 w-12 text-center">#</th>
                                <th className="p-3 w-28">Window</th>
                                <th className="p-3">Driver</th>
                                <th className="p-3 w-24">Tyres</th>
                                <th className="p-3 w-20 text-center">Fuel</th>
                                <th className="p-3 w-20 text-center">NRG</th>
                                <th className="p-3">Notes</th>
                            </tr>
                            </thead>
                            <tbody className="text-sm">
                            {stints.map((stint, index) => {
                                const isDone = stint.isDone;
                                let rowClass = "border-b border-white/5 transition-colors";
                                if (stint.isCurrent) rowClass += " bg-indigo-900/20 border-l-4 border-l-indigo-500";
                                else if (isDone) rowClass += " opacity-40 grayscale";
                                else rowClass += " hover:bg-white/5";

                                return (
                                    <tr key={stint.id} className={rowClass}>
                                        <td className="p-3 text-center font-black text-slate-600">{stint.stopNum}</td>

                                        <td className="p-3 font-mono text-xs text-slate-400">
                                            L{stint.startLap} <span className="text-slate-600">➔</span> L{stint.endLap}
                                        </td>

                                        {/* Driver Select */}
                                        <td className="p-3">
                                            <div className="relative flex items-center">
                                                <User size={12} className="absolute left-2 text-slate-500"/>
                                                <select
                                                    value={stint.driverId}
                                                    onChange={(e) => onUpdateStint(index, 'driverId', Number(e.target.value))}
                                                    disabled={isDone}
                                                    className="bg-slate-800/50 border border-white/10 rounded py-1 pl-7 pr-2 text-xs font-bold text-white outline-none focus:border-indigo-500 w-full appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                                                >
                                                    {drivers.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </td>

                                        {/* Tires Select */}
                                        <td className="p-3">
                                            <div className="relative flex items-center">
                                                <Disc size={12} className="absolute left-2 text-slate-500"/>
                                                <select
                                                    value={stint.tyres || 'AUTO'}
                                                    onChange={(e) => onUpdateStint(index, 'tyres', e.target.value)}
                                                    disabled={isDone}
                                                    className={`bg-slate-800/50 border border-white/10 rounded py-1 pl-7 pr-2 text-xs font-bold outline-none focus:border-indigo-500 w-full appearance-none cursor-pointer transition-colors
                                                            ${stint.tyres === 'SOFT' ? 'text-red-400' :
                                                        stint.tyres === 'MEDIUM' ? 'text-yellow-400' :
                                                            stint.tyres === 'HARD' ? 'text-white' :
                                                                stint.tyres === 'WET' ? 'text-blue-400' : 'text-slate-400'}
                                                        `}
                                                >
                                                    <option value="AUTO">AUTO</option>
                                                    <option value="SOFT">SOFT</option>
                                                    <option value="MEDIUM">MEDIUM</option>
                                                    <option value="HARD">HARD</option>
                                                    <option value="WET">WET</option>
                                                </select>
                                            </div>
                                        </td>

                                        {/* Fuel Display */}
                                        <td className="p-3 text-center">
                                                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${stint.fuel.includes('NRG') ? 'bg-cyan-900/50 text-cyan-300' : 'bg-slate-700 text-slate-300'}`}>
                                                    {stint.fuel}
                                                </span>
                                        </td>

                                        {/* NOUVELLE COLONNE : Virtual Energy Display */}
                                        <td className="p-3 text-center">
                                            {stint.virtualEnergy && stint.virtualEnergy !== "-" && (
                                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-500/30">
                                                    {stint.virtualEnergy}
                                                </span>
                                            )}
                                        </td>

                                        {/* Notes Input */}
                                        <td className="p-3">
                                            <input
                                                type="text"
                                                value={stint.note}
                                                onChange={(e) => onUpdateNote(index + 1, e.target.value)}
                                                placeholder="..."
                                                disabled={isDone}
                                                className="bg-transparent border-b border-transparent focus:border-indigo-500 w-full text-xs text-slate-300 placeholder-slate-700 outline-none transition-colors focus:bg-slate-900/50 px-1"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StrategyView;
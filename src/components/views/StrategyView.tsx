import React, { useMemo } from 'react';
import { Timer, Activity, User, Disc, Fuel, ArrowUp, ArrowDown, Zap, Settings2 } from 'lucide-react';
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
    const { pitPrediction, stints, totalLaps, activeLapTime } = strategyData;

    // --- LOGIQUE D'AFFICHAGE ROBUSTE ---
    // On affiche les colonnes Énergie/Ratio si AU MOINS UN relais utilise l'énergie virtuelle.
    const showEnergy = useMemo(() => {
        return stints.some(s => s.virtualEnergy && s.virtualEnergy !== "-" && s.virtualEnergy !== undefined);
    }, [stints]);

    // Calcul du temps total de course estimé
    const estimatedRaceEndTime = useMemo(() => {
        const remainingLaps = Math.max(0, totalLaps - telemetry.laps);
        const remainingTimeSeconds = remainingLaps * activeLapTime;
        const now = new Date();
        now.setSeconds(now.getSeconds() + remainingTimeSeconds);
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, [totalLaps, telemetry.laps, activeLapTime]);

    // Prochain relais pour le panneau de gauche
    const nextStint = stints.find(s => s.isNext) || stints.find(s => !s.isDone && !s.isCurrent);

    return (
        <div className="h-full bg-[#050a10] flex flex-col font-display text-white overflow-hidden">

            {/* --- HEADER : TIMELINE VISUELLE --- */}
            <div className="h-16 shrink-0 bg-[#090c13] border-b border-white/10 px-4 flex items-center relative overflow-hidden">
                <div className="absolute inset-0 flex items-center px-4 opacity-50 pointer-events-none">
                    <div className="w-full h-2 bg-slate-800 rounded-full flex overflow-hidden">
                        {stints.map((stint) => {
                            const widthPct = totalLaps > 0 ? (stint.lapsCount / totalLaps) * 100 : 0;
                            const driverColor = stint.driver.color || '#666';
                            return (
                                <div
                                    key={stint.id}
                                    style={{ width: `${widthPct}%`, backgroundColor: driverColor }}
                                    className={`h-full border-r border-black/50 ${stint.isCurrent ? 'animate-pulse brightness-125' : 'opacity-80'}`}
                                />
                            );
                        })}
                    </div>
                </div>
                <div className="relative z-10 w-full flex justify-between text-xs font-bold text-shadow">
                    <span className="text-slate-400">START</span>
                    <span className="text-white bg-black/50 px-2 rounded">FINISH ~ {estimatedRaceEndTime}</span>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">

                {/* --- PANNEAU GAUCHE : PRÉDICTIONS & PIT INFO --- */}
                <div className="w-80 shrink-0 border-r border-white/5 p-4 flex flex-col gap-4 overflow-y-auto bg-[#0b1018]">

                    {/* 1. TRAFIC PREDICTION */}
                    {pitPrediction && (
                        <div className={`rounded-xl border p-4 flex flex-col gap-2 bg-gradient-to-br from-slate-900 to-slate-950 border-white/10 relative overflow-hidden group`}>
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Activity size={64} />
                            </div>
                            <div className="flex justify-between items-start z-10">
                                <div>
                                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                                        Pit Exit
                                    </h2>
                                    <div className="text-4xl font-black mt-1 text-white">
                                        P{pitPrediction.predictedPosition}
                                    </div>
                                </div>
                                <div className={`text-right px-2 py-1 rounded text-xs font-bold ${
                                    pitPrediction.trafficLevel === 'CLEAR' ? 'bg-emerald-500/20 text-emerald-400' :
                                        pitPrediction.trafficLevel === 'BUSY' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400 animate-pulse'
                                }`}>
                                    {pitPrediction.trafficLevel}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 mt-2 text-xs font-medium z-10">
                                <div className="flex justify-between text-slate-400">
                                    <span className="flex items-center gap-1"><ArrowUp size={10}/> Ahead</span>
                                    <span>{pitPrediction.carAhead || '-'} (+{pitPrediction.gapToAhead.toFixed(1)}s)</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span className="flex items-center gap-1"><ArrowDown size={10}/> Behind</span>
                                    <span>{pitPrediction.carBehind || '-'} (-{pitPrediction.gapToBehind.toFixed(1)}s)</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. NEXT STOP INFO */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-900 border border-white/5 rounded-lg p-3">
                            <div className="text-[10px] text-slate-500 font-bold mb-1 flex items-center gap-1"><Fuel size={10}/> FUEL ADD</div>
                            <div className="text-xl font-black text-blue-400">{telemetry.strategyPitFuel?.toFixed(1) || "0.0"} <span className="text-xs">L</span></div>
                        </div>
                        <div className="bg-slate-900 border border-white/5 rounded-lg p-3">
                            <div className="text-[10px] text-slate-500 font-bold mb-1 flex items-center gap-1"><Timer size={10}/> STOP TIME</div>
                            <div className="text-xl font-black text-amber-400">{(telemetry.strategyEstPitTime || 35).toFixed(1)} <span className="text-xs">s</span></div>
                        </div>
                    </div>

                    {/* 3. ENERGY INFO */}
                    {showEnergy && (
                        <div className="bg-slate-900 border border-white/5 rounded-lg p-3 relative overflow-hidden">
                            <div className="absolute -right-2 -bottom-2 text-cyan-500/5 rotate-12"><Zap size={64}/></div>
                            <div className="text-[10px] text-slate-500 font-bold mb-1 flex items-center gap-1"><Zap size={10} className="text-cyan-400"/> VIRTUAL ENERGY</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-cyan-400">{nextStint?.virtualEnergy || "-"}</span>
                                <span className="text-xs text-slate-500">Target</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- PANNEAU CENTRAL : PLANIFICATEUR --- */}
                <div className="flex-1 bg-[#050a10] p-4 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <Settings2 size={16} className="text-indigo-500"/> Strategy Planner
                        </h3>
                        <div className="text-xs text-slate-500 font-mono">
                            Total Laps: <span className="text-white">{totalLaps}</span> • Stints: <span className="text-white">{stints.length}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <table className="w-full text-left border-collapse">
                            <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 sticky top-0 bg-[#050a10] z-20">
                            <tr>
                                <th className="p-3 w-10 text-center">#</th>
                                <th className="p-3 w-24">Laps</th>
                                <th className="p-3 w-20">Length</th>
                                <th className="p-3">Driver</th>
                                <th className="p-3 w-28">Tyres</th>
                                {showEnergy && <th className="p-3 w-16 text-center text-cyan-400" title="Ratio Fuel/Energy">F/E</th>}
                                <th className="p-3 w-20 text-center">Fuel</th>
                                {showEnergy && <th className="p-3 w-20 text-center">NRG</th>}
                                <th className="p-3">Notes</th>
                            </tr>
                            </thead>
                            <tbody className="text-sm">
                            {stints.map((stint, index) => {
                                const isDone = stint.isDone;
                                const isCurrent = stint.isCurrent;

                                return (
                                    <tr key={stint.id} className={`border-b border-white/5 transition-all hover:bg-white/5 group ${isCurrent ? 'bg-indigo-500/10' : isDone ? 'opacity-40 grayscale' : ''}`}>

                                        {/* # Stint */}
                                        <td className="p-2 text-center">
                                            <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold mx-auto ${isCurrent ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                {stint.stopNum}
                                            </div>
                                        </td>

                                        {/* Window */}
                                        <td className="p-2 font-mono text-xs text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <span className={isCurrent ? "text-indigo-400 font-bold" : ""}>{stint.startLap}</span>
                                                <span className="text-slate-600">➔</span>
                                                <span>{stint.endLap}</span>
                                            </div>
                                        </td>

                                        {/* LENGTH (EDITABLE) */}
                                        <td className="p-2">
                                            {isDone ? (
                                                <span className="text-xs font-mono text-slate-500">{stint.lapsCount} L</span>
                                            ) : (
                                                <div className="relative group/input">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={100}
                                                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-white focus:border-indigo-500 focus:outline-none text-xs"
                                                        value={stint.lapsCount || ''}
                                                        placeholder="Auto"
                                                        onChange={(e) => onUpdateStint(index, 'laps', e.target.value === '' ? 0 : parseInt(e.target.value))}
                                                    />
                                                    <span className="absolute right-4 top-1.5 text-[9px] text-slate-600 pointer-events-none">L</span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Driver Select */}
                                        <td className="p-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: stint.driver.color }} />
                                                <select
                                                    value={stint.driverId}
                                                    onChange={(e) => onUpdateStint(index, 'driverId', Number(e.target.value))}
                                                    disabled={isDone}
                                                    className="bg-transparent text-xs font-bold text-white outline-none w-full cursor-pointer hover:text-indigo-400 transition-colors appearance-none"
                                                >
                                                    {drivers.map(d => (
                                                        <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </td>

                                        {/* Tyres Select */}
                                        <td className="p-2">
                                            <div className="flex items-center gap-2">
                                                <Disc size={14} className={`
                                                        ${stint.tyres === 'SOFT' ? 'text-red-500' :
                                                    stint.tyres === 'MEDIUM' ? 'text-yellow-500' :
                                                        stint.tyres === 'HARD' ? 'text-slate-200' :
                                                            stint.tyres === 'WET' ? 'text-blue-400' : 'text-slate-500'}
                                                    `}/>
                                                <select
                                                    value={stint.tyres || 'AUTO'}
                                                    onChange={(e) => onUpdateStint(index, 'tyres', e.target.value)}
                                                    disabled={isDone}
                                                    className="bg-transparent text-xs font-bold outline-none cursor-pointer uppercase text-slate-300 hover:text-white appearance-none"
                                                >
                                                    <option className="bg-slate-900" value="AUTO">Auto</option>
                                                    <option className="bg-slate-900 text-red-400" value="SOFT">Soft</option>
                                                    <option className="bg-slate-900 text-yellow-400" value="MEDIUM">Medium</option>
                                                    <option className="bg-slate-900 text-white" value="HARD">Hard</option>
                                                    <option className="bg-slate-900 text-blue-400" value="WET">Wet</option>
                                                </select>
                                            </div>
                                        </td>

                                        {/* RATIO F/E (EDITABLE) - Affiché uniquement si showEnergy est true */}
                                        {showEnergy && (
                                            <td className="p-2 text-center">
                                                {!isDone ? (
                                                    <input
                                                        type="number"
                                                        min={0.5}
                                                        max={1.5}
                                                        step={0.01}
                                                        className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-center font-mono font-bold text-cyan-300 focus:border-cyan-500 focus:outline-none text-[10px]"
                                                        value={stint.fuelEnergyRatio ?? 1.0}
                                                        onChange={(e) => onUpdateStint(index, 'fuelEnergyRatio', e.target.value === '' ? 1.0 : parseFloat(e.target.value))}
                                                    />
                                                ) : (
                                                    <span className="text-slate-600 text-xs">-</span>
                                                )}
                                            </td>
                                        )}

                                        {/* Fuel */}
                                        <td className="p-2 text-center">
                                                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                                    stint.fuel === 'FULL' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20' :
                                                        'bg-slate-800 text-slate-300'
                                                }`}>
                                                    {stint.fuel}
                                                </span>
                                        </td>

                                        {/* NRG - Affiché uniquement si showEnergy est true */}
                                        {showEnergy && (
                                            <td className="p-2 text-center">
                                                    <span className="text-xs font-mono font-bold text-cyan-400">
                                                        {stint.virtualEnergy || "-"}
                                                    </span>
                                            </td>
                                        )}

                                        {/* Notes */}
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={stint.note}
                                                onChange={(e) => onUpdateNote(index + 1, e.target.value)}
                                                placeholder="..."
                                                disabled={isDone}
                                                className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 text-xs text-slate-300 placeholder-slate-700 outline-none transition-colors px-1 py-0.5"
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
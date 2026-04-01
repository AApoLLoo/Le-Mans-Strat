import React, { useEffect, useMemo, useState } from 'react';
import { Timer, Activity, Disc, Fuel, ArrowUp, ArrowDown, Zap, Settings2 } from 'lucide-react';
import type { StrategyData, TelemetryData, Driver, SessionMode, RestApiData } from '../../types';

/* eslint-disable no-unused-vars */
interface StrategyViewProps {
    strategyData: StrategyData;
    sessionMode: SessionMode;
    currentLap: number;
    telemetry: TelemetryData;
    restApiData?: RestApiData;
    drivers: Driver[];
    onUpdateStint: (...args: [number, string, unknown]) => void;
    onUpdateStintBulk?: (...args: [number, Record<string, unknown>]) => void;
    onUpdateNote: (...args: [number, string]) => void;
}
/* eslint-enable no-unused-vars */

type StrategyStintWithSource = StrategyData['stints'][number] & {
    driverSource?: 'config' | 'legacy' | 'auto';
};

const StrategyView: React.FC<StrategyViewProps> = ({
                                                       strategyData, sessionMode, telemetry, restApiData, drivers, onUpdateStint, onUpdateStintBulk, onUpdateNote
                                                   }) => {
    const { pitPrediction, totalLaps, activeLapTime, activeVECons } = strategyData;
    const stints = strategyData.stints as StrategyStintWithSource[];
    const [showDriverSource, setShowDriverSource] = useState(false);
    const [selectedStintId, setSelectedStintId] = useState<number | null>(null);
    const [pitStopEstimateIndex, setPitStopEstimateIndex] = useState(0);

    // --- LOGIQUE D'AFFICHAGE ROBUSTE ---
    // On affiche les colonnes Énergie/Ratio si AU MOINS UN relais utilise l'énergie virtuelle.
    const showEnergy = useMemo(() => {
        return activeVECons > 0 || stints.some(s => s.virtualEnergy && s.virtualEnergy !== "-" && s.virtualEnergy !== undefined);
    }, [activeVECons, stints]);

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

    const calculateDisplayFuel = (stint: StrategyStintWithSource): string => {
        if (stint.virtualEnergy && stint.virtualEnergy !== "-") {
            const veNeeded = parseFloat(stint.virtualEnergy) || 0;
            const ratio = stint.fuelEnergyRatio ?? 1.0;
            return (veNeeded * ratio).toFixed(1);
        }
        return stint.fuel;
    };

    const currentStint = stints.find(s => s.isCurrent);
    const stopEstimateFallback = useMemo(() => {
        const values = Array.isArray(restApiData?.pit_stop_estimate)
            ? restApiData!.pit_stop_estimate.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
            : [];
        if (!values.length) return 0;
        if (values[pitStopEstimateIndex] !== undefined) return values[pitStopEstimateIndex];
        return values[0];
    }, [restApiData, pitStopEstimateIndex]);
    const updateBulk = (id: number, patch: Record<string, unknown>) => {
        if (onUpdateStintBulk) {
            onUpdateStintBulk(id, patch);
            return;
        }
        Object.entries(patch).forEach(([k, v]) => onUpdateStint(id, k, v));
    };

    useEffect(() => {
        if (selectedStintId === null) return;

        const selectedStint = stints.find((s) => s.id === selectedStintId);
        if (!selectedStint || selectedStint.isDone) return;

        const onKeyDown = (evt: KeyboardEvent) => {
            const target = evt.target as HTMLElement | null;
            const tag = (target?.tagName || '').toUpperCase();
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;

            if (evt.key === 'ArrowUp') {
                evt.preventDefault();
                updateBulk(selectedStint.id, { laps: Math.min(100, (selectedStint.lapsCount || 1) + 1) });
            } else if (evt.key === 'ArrowDown') {
                evt.preventDefault();
                updateBulk(selectedStint.id, { laps: Math.max(1, (selectedStint.lapsCount || 1) - 1) });
            } else if (evt.key === '8') {
                evt.preventDefault();
                updateBulk(selectedStint.id, { fuelEnergyRatio: 0.8 });
            } else if (evt.key === '0') {
                evt.preventDefault();
                updateBulk(selectedStint.id, { fuelEnergyRatio: 1.0 });
            } else if (evt.key === '2') {
                evt.preventDefault();
                updateBulk(selectedStint.id, { fuelEnergyRatio: 1.2 });
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedStintId, stints]);

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
                    {pitPrediction && sessionMode === 'RACE' && (
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
                            <div className="text-[10px] text-slate-500 font-bold mb-1 flex items-center justify-between gap-1">
                                <span className="flex items-center gap-1"><Timer size={10}/> STOP TIME</span>
                                <select
                                    value={pitStopEstimateIndex}
                                    onChange={(e) => setPitStopEstimateIndex(Number(e.target.value))}
                                    className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300"
                                    title="Index pit_stop_estimate"
                                >
                                    {[0, 1, 2, 3, 4].map((idx) => (
                                        <option key={idx} value={idx}>Idx {idx}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="text-xl font-black text-amber-400">{(telemetry.strategyEstPitTime || stopEstimateFallback || 35).toFixed(1)} <span className="text-xs">s</span></div>
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
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                            <button
                                onClick={() => setShowDriverSource((v) => !v)}
                                className={`px-2 py-1 rounded border font-bold ${showDriverSource ? 'text-emerald-300 border-emerald-500/40 bg-emerald-900/30' : 'text-slate-400 border-slate-700 bg-slate-900/40'}`}
                                title="Afficher/masquer la source driver (config/legacy/auto)"
                            >
                                SRC
                            </button>
                            <span>
                                Total Laps: <span className="text-white">{totalLaps}</span> • Stints: <span className="text-white">{stints.length}</span>
                            </span>
                        </div>
                    </div>

                    <div className="mb-3 rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-300">
                        Session: <span className="font-bold text-white">{sessionMode}</span>
                        {showEnergy && (
                            <span className="ml-3 text-cyan-300">VE active: la durée de relais est contrainte par la ressource la plus limitante (fuel/VE).</span>
                        )}
                    </div>

                    <div className="mb-3 rounded-lg border border-indigo-500/20 bg-indigo-950/20 px-3 py-2 text-[10px] text-slate-300 font-mono">
                        Shortcuts: <span className="text-white">P</span> pit stop • <span className="text-white">U</span> undo • <span className="text-white">↑/↓</span> laps • <span className="text-white">8/0/2</span> VE/F 80/100/120
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <table className="w-full text-left border-collapse">
                            <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 sticky top-0 bg-[#050a10] z-20">
                            <tr>
                                <th className="p-3 w-10 text-center">#</th>
                                <th className="p-3 w-24">Laps</th>
                                <th className="p-3 w-20">Length</th>
                                <th className="p-3">Driver</th>
                                <th className="p-3 w-20 text-center">Fuel</th>
                                {showEnergy && <th className="p-3 w-20 text-center text-cyan-400" title="Fuel/VE ratio: fuel = 100 * ratio (e.g., 0.80 = 80L)">VE/F</th>}
                                {showEnergy && <th className="p-3 w-16 text-center text-cyan-400">VE</th>}
                                <th className="p-3">Notes</th>
                            </tr>
                            </thead>
                            <tbody className="text-sm">
                            {stints.map((stint) => {
                                const isDone = stint.isDone;
                                const isCurrent = stint.isCurrent;

                                return (
                                    <tr
                                        key={stint.id}
                                        onClick={() => setSelectedStintId(stint.id)}
                                        className={`border-b border-white/5 transition-all hover:bg-white/5 group cursor-pointer ${selectedStintId === stint.id ? 'bg-cyan-500/10 ring-1 ring-cyan-500/40' : ''} ${isCurrent ? 'bg-indigo-500/10' : isDone ? 'opacity-40 grayscale' : ''}`}
                                    >

                                        {/* # Stint */}
                                        <td className="p-2 text-center">
                                            <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold mx-auto ${selectedStintId === stint.id ? 'bg-cyan-500 text-white' : isCurrent ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
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
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => updateBulk(stint.id, { laps: Math.max(1, (stint.lapsCount || 1) - 1) })}
                                                        className="h-6 w-6 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                                                        title="-1 lap"
                                                    >
                                                        -
                                                    </button>
                                                    <div className="relative group/input">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={100}
                                                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-white focus:border-indigo-500 focus:outline-none text-xs"
                                                        value={stint.lapsCount || ''}
                                                        placeholder="Auto"
                                                        onChange={(e) => onUpdateStint(stint.id, 'laps', e.target.value === '' ? 0 : parseInt(e.target.value))}
                                                    />
                                                    <span className="absolute right-4 top-1.5 text-[9px] text-slate-600 pointer-events-none">L</span>
                                                    </div>
                                                    <button
                                                        onClick={() => updateBulk(stint.id, { laps: Math.min(100, (stint.lapsCount || 1) + 1) })}
                                                        className="h-6 w-6 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                                                        title="+1 lap"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )}
                                        </td>

                                        {/* Driver Select */}
                                        <td className="p-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: stint.driver.color }} />
                                                <select
                                                    value={String(stint.driverId)}
                                                    onChange={(e) => {
                                                        const selected = drivers.find((d) => String(d.id) === e.target.value);
                                                        onUpdateStint(stint.id, 'driverId', selected ? selected.id : e.target.value);
                                                    }}
                                                    disabled={isDone}
                                                    className="bg-transparent text-xs font-bold text-white outline-none w-full cursor-pointer hover:text-indigo-400 transition-colors appearance-none"
                                                >
                                                    {drivers.map(d => (
                                                        <option key={d.id} value={String(d.id)} className="bg-slate-900">{d.name}</option>
                                                    ))}
                                                </select>
                                                {showDriverSource && (
                                                    <span
                                                        title={`Driver source: ${stint.driverSource || 'auto'}`}
                                                        className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                                            stint.driverSource === 'config'
                                                                ? 'text-emerald-300 border-emerald-500/30 bg-emerald-900/30'
                                                                : stint.driverSource === 'legacy'
                                                                    ? 'text-amber-300 border-amber-500/30 bg-amber-900/30'
                                                                    : 'text-slate-400 border-slate-700/50 bg-slate-900/40'
                                                        }`}
                                                    >
                                                        {stint.driverSource === 'config' ? 'CFG' : stint.driverSource === 'legacy' ? 'LEG' : 'AUTO'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Fuel */}
                                        <td className="p-2 text-center">
                                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                                showEnergy && stint.virtualEnergy && stint.virtualEnergy !== "-" ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/20' :
                                                    stint.fuel === 'FULL' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20' :
                                                        'bg-slate-800 text-slate-300'
                                            }`}>
                                                {isCurrent && showEnergy && stint.virtualEnergy && stint.virtualEnergy !== "-"
                                                    ? `${calculateDisplayFuel(stint)} (Rest)`
                                                    : calculateDisplayFuel(stint)}
                                            </span>
                                        </td>

                                        {/* VE/F RATIO (EDITABLE) - Fuel/VE ratio */}
                                        {showEnergy && (
                                            <td className="p-2 text-center">
                                                {!isDone ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input
                                                            type="number"
                                                            min={0.5}
                                                            max={2.0}
                                                            step={0.01}
                                                            className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-center font-mono font-bold text-cyan-300 focus:border-cyan-500 focus:outline-none text-[10px]"
                                                            value={stint.fuelEnergyRatio ?? 1.0}
                                                            onChange={(e) => onUpdateStint(stint.id, 'fuelEnergyRatio', e.target.value === '' ? 1.0 : parseFloat(e.target.value))}
                                                        />
                                                        <button onClick={() => updateBulk(stint.id, { fuelEnergyRatio: 0.8 })} className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] text-slate-400 hover:text-cyan-300">80</button>
                                                        <button onClick={() => updateBulk(stint.id, { fuelEnergyRatio: 1.0 })} className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] text-slate-400 hover:text-cyan-300">100</button>
                                                        <button onClick={() => updateBulk(stint.id, { fuelEnergyRatio: 1.2 })} className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] text-slate-400 hover:text-cyan-300">120</button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600 text-xs">-</span>
                                                )}
                                            </td>
                                        )}

                                        {/* VE - Affichage direct si showEnergy */}
                                        {showEnergy && (
                                            <td className="p-2 text-center">
                                                {isCurrent ? (
                                                    <span className="text-xs font-mono font-bold text-emerald-400">{telemetry.VE?.VEcurrent.toFixed(0) || '--'}% (Now)</span>
                                                ) : (
                                                    <span className="text-xs font-mono font-bold text-cyan-400">
                                                        {stint.virtualEnergy || "-"}
                                                    </span>
                                                )}
                                            </td>
                                        )}

                                        {/* Notes */}
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={stint.note}
                                                onChange={(e) => onUpdateNote(stint.stopNum, e.target.value)}
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
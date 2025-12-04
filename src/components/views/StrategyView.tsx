import React from 'react';
import { ArrowDown, ArrowUp, Activity, Timer, Fuel, Disc } from 'lucide-react'; // Ajout icônes
import type { StrategyData, TelemetryData } from '../../types';

interface StrategyViewProps {
    strategyData: StrategyData;
    currentLap: number;
    telemetry: TelemetryData;
}

const StrategyView: React.FC<StrategyViewProps> = ({ strategyData, currentLap, telemetry }) => {
    const { pitPrediction, stints } = strategyData;

    if (!pitPrediction) return <div className="p-4 text-white">Calcul en cours...</div>;

    const trafficColor = {
        'CLEAR': 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
        'BUSY': 'text-yellow-400 border-yellow-500/30 bg-yellow-950/20',
        'TRAFFIC': 'text-red-500 border-red-500/30 bg-red-950/20 animate-pulse'
    }[pitPrediction.trafficLevel];

    // Temps total perdu (Roulement + Arrêt)
    const pitLaneLoss = 28;
    const estStop = telemetry.strategyEstPitTime || 35;
    const totalLoss = pitLaneLoss + estStop;

    return (
        <div className="h-full bg-[#050a10] p-4 flex flex-col gap-4 font-display text-white overflow-y-auto">

            {/* --- BLOC 1 : PRÉDICTION SORTIE (Inchangé) --- */}
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

            {/* --- BLOC 2 : DÉTAILS DU PROCHAIN ARRÊT (Réintégré !) --- */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-xl border border-white/5 p-3">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <Fuel size={10}/> Refuel
                    </div>
                    <div className="text-2xl font-black text-blue-400">
                        {telemetry.strategyPitFuel.toFixed(1)} <span className="text-sm text-slate-500">L</span>
                    </div>
                    <div className="text-xs text-slate-400">+{telemetry.strategyPitLaps.toFixed(1)} Laps</div>
                </div>

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

            {/* --- BLOC 3 : STRATÉGIE (Inchangé) --- */}
            <div className="flex-1 bg-slate-900/30 rounded-xl border border-white/5 p-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity size={14}/> Stint Plan
                </h3>
                <div className="space-y-2">
                    {stints.map((stint, index) => {
                        const isDone = stint.isDone;
                        const isCurrent = stint.isCurrent;
                        return (
                            <div key={stint.id} className={`flex items-center p-3 rounded-lg border transition-all ${isCurrent ? 'bg-indigo-600/20 border-indigo-500' : (isDone ? 'opacity-50 bg-slate-900 border-transparent' : 'bg-slate-800/40 border-slate-700')}`}>
                                <div className="w-8 text-center font-black text-xl opacity-50">{stint.stopNum}</div>
                                <div className="flex-1 px-4">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-bold text-sm text-slate-200">{isCurrent ? 'CURRENT' : `STINT ${index + 1}`}</span>
                                        <span className="font-mono text-xs text-slate-400">Laps {stint.startLap}-{stint.endLap}</span>
                                    </div>
                                    <div className="flex gap-4 text-xs">
                                        <div className={`px-2 py-0.5 rounded ${stint.fuel === 'NRG RESET' ? 'bg-cyan-900 text-cyan-200' : 'bg-slate-700 text-slate-300'}`}>{stint.fuel}</div>
                                        <div className="text-slate-400 flex items-center gap-1"><span>👤 {stint.driver?.name}</span></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default StrategyView;
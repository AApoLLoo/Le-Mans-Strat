// src/components/views/StrategyView.tsx

import React from 'react';
import { Clock, Fuel, Zap, AlertTriangle, Flag, ChevronRight, User, Edit3 } from 'lucide-react';
import type { StrategyData, Driver, TelemetryData } from '../../types';

interface StrategyViewProps {
    strategyData: StrategyData;
    drivers: Driver[];
    stintNotes: Record<string, string>;
    onAssignDriver: (stintId: number, driverId: string) => void;
    onUpdateNote: (stopNum: number, note: string) => void;
    isHypercar: boolean;
    isLMGT3: boolean;
    telemetryData: TelemetryData;
}

const StrategyView: React.FC<StrategyViewProps> = ({ 
    strategyData, 
    drivers = [], 
    stintNotes, 
    onAssignDriver, 
    onUpdateNote, 
    isHypercar, 
    isLMGT3, 
    telemetryData 
}) => {
  
  const { 
      activeFuelCons = 0, 
      activeVECons = 0, 
      pitStopsRemaining = 0, 
      totalLaps = 0, 
      stints = [] 
  } = strategyData || {};

  const useVE = isHypercar || isLMGT3;
  const consValue = useVE ? activeVECons : activeFuelCons;
  const consUnit = useVE ? '%/Lap' : 'L/Lap';
  const iconColor = useVE ? "text-cyan-400" : "text-amber-400";
  const Icon = useVE ? Zap : Fuel;

  return (
    <div className="flex flex-col h-full bg-[#050a10] relative text-white font-sans">
      
      {/* HEADER : KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-white/10 bg-slate-900/50 shrink-0">
          
          <div className="bg-slate-800/60 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <Icon size={12} className={iconColor}/> Consumption
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-2xl font-black font-mono ${iconColor}`}>{consValue.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 font-bold">{consUnit}</span>
              </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <Flag size={12} className="text-indigo-400"/> Est. Total Laps
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black font-mono text-white">{totalLaps}</span>
                  <span className="text-xs text-slate-500 font-bold">Laps</span>
              </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={12} className="text-orange-400"/> Stops Left
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black font-mono text-orange-400">{pitStopsRemaining}</span>
                  <span className="text-xs text-slate-500 font-bold">Stops</span>
              </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <Clock size={12} className="text-emerald-400"/> Est. Pit Time
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {telemetryData?.strategyEstPitTime?.toFixed(1) || "--"}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">Sec</span>
              </div>
          </div>
      </div>

      {/* TABLEAU DES RELAIS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {stints.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                <AlertTriangle size={48} className="mb-2"/>
                <span className="text-sm font-bold uppercase">Waiting for telemetry data...</span>
            </div>
        ) : (
            <div className="space-y-2">
                {stints.map((stint) => (
                    <div 
                        key={stint.id} 
                        className={`
                            relative grid grid-cols-12 gap-2 items-center p-3 rounded-lg border transition-all duration-300
                            ${stint.isCurrent 
                                ? 'bg-indigo-900/20 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                                : stint.isDone 
                                    ? 'bg-slate-900/30 border-white/5 opacity-60 grayscale-[0.5]' 
                                    : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60'
                            }
                        `}
                    >
                        {/* Indicateur État */}
                        <div className="col-span-1 flex justify-center">
                            {stint.isCurrent ? (
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_#6366f1]"></div>
                            ) : stint.isDone ? (
                                <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                            ) : (
                                <div className="w-2 h-2 border-2 border-slate-600 rounded-full"></div>
                            )}
                        </div>

                        {/* Numéro */}
                        <div className="col-span-1 text-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stint</span>
                            <div className="text-lg font-bold text-white leading-none">{stint.stopNum}</div>
                        </div>

                        {/* Pilote */}
                        <div className="col-span-3">
                            <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded border border-white/5">
                                <User size={12} className="text-slate-500"/>
                                <select 
                                    value={stint.driverId || ""} 
                                    onChange={(e) => onAssignDriver(stint.id, e.target.value)} 
                                    className="bg-transparent border-none text-xs font-bold text-white w-full outline-none cursor-pointer hover:text-indigo-400 transition-colors"
                                    disabled={stint.isDone}
                                >
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Tours */}
                        <div className="col-span-2 text-center">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Window</span>
                            <div className="text-sm font-mono font-bold text-white flex items-center justify-center gap-1">
                                {stint.startLap} <ChevronRight size={10} className="text-slate-600"/> {stint.endLap}
                            </div>
                        </div>

                        {/* Target */}
                        <div className="col-span-2 text-center">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Fuel/Energy</span>
                            <div className={`text-xs font-bold px-2 py-0.5 rounded border ${stint.fuel.includes('FULL') || stint.fuel.includes('RESET') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-700/30 text-slate-300 border-slate-600/30'} inline-block`}>
                                {stint.fuel}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="col-span-3">
                            <div className="flex items-center gap-2 bg-slate-950/30 p-1.5 rounded border border-white/5 focus-within:border-indigo-500/50 transition-colors">
                                <Edit3 size={10} className="text-slate-600"/>
                                <input 
                                    type="text" 
                                    value={stint.note} 
                                    onChange={(e) => onUpdateNote(stint.stopNum, e.target.value)} 
                                    className="bg-transparent border-none text-xs text-slate-300 w-full outline-none placeholder:text-slate-700" 
                                    placeholder={stint.isCurrent ? "Current instructions..." : "Note..."}
                                />
                            </div>
                        </div>

                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default StrategyView;
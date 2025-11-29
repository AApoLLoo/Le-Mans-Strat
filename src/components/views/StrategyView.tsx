import React from 'react';
import { ChevronRight, Fuel, Timer, Clock, AlertTriangle } from 'lucide-react';

// --- TYPES (Ajoutez ceci pour corriger les erreurs TS) ---
interface Driver {
    id: string | number;
    name: string;
    color?: string;
}

interface Stint {
    id: number;
    stopNum: number;
    startLap: number;
    endLap: number;
    isCurrent: boolean;
    isDone: boolean;
    fuel: string;
    driver: Driver;
    driverId?: string | number;
    lapsCount: number;
}

interface StrategyData {
    activeFuelCons?: number;
    activeVECons?: number;
    activeLapTime?: number;
    pitStopsRemaining?: number;
    totalLaps?: number;
    stints?: Stint[];
}

interface StrategyViewProps {
    strategyData: StrategyData;
    drivers: Driver[];
    stintNotes: Record<string, string>;
    onAssignDriver: (stintId: number, driverId: string) => void;
    onUpdateNote: (stopNum: number, note: string) => void;
    isHypercar: boolean;
    isLMGT3: boolean;
    telemetryData: any; // Vous pouvez préciser le type si vous l'avez
}

// --- COMPOSANT ---
const StrategyView: React.FC<StrategyViewProps> = ({ 
    strategyData, 
    drivers = [], // Valeur par défaut pour éviter le crash
    stintNotes, 
    onAssignDriver, 
    onUpdateNote, 
    isHypercar, 
    isLMGT3, 
    telemetryData 
}) => {
  
  // Protection par défaut
  const { activeFuelCons = 0, activeVECons = 0, pitStopsRemaining = 0, totalLaps = 0 } = strategyData || {};
  
  // Temps de pit estimé
  const estPitTime = telemetryData?.strategyEstPitTime || 0;
  const useVE = isHypercar || isLMGT3;
  const displayConsValue = useVE ? activeVECons : activeFuelCons;
  const displayConsUnit = useVE ? '%/Lap' : 'L/Lap';
  const displayConsIconClass = useVE ? "text-cyan-400" : "text-blue-400";
  // Récupération de l'état "Au stand"
  const inPitLane = telemetryData?.inPitLane || false;
  
  return (
    <div className="flex flex-col h-full bg-[#050a10] relative">
      
      {/* --- ALERTE PIT STOP --- */}
      {inPitLane && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 flex items-center justify-center gap-4 animate-pulse shadow-2xl border-b-4 border-yellow-400">
              <AlertTriangle size={32} className="text-yellow-300"/>
              <div className="text-center">
                  <h1 className="text-4xl font-black italic tracking-tighter uppercase">PIT ENTRY DETECTED</h1>
                  <p className="text-sm font-mono font-bold text-red-200">PERFORMING STINT CHANGE...</p>
              </div>
              <AlertTriangle size={32} className="text-yellow-300"/>
          </div>
      )}

      {/* --- BANDEAU RÉCAPITULATIF LIVE --- */}
      <div className="grid grid-cols-4 gap-2 p-4 border-b border-slate-800 bg-slate-900/50 shrink-0 pt-6">
          
            <div className="bg-slate-800 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Fuel size={10}/> Avg Cons.
              </div>
              <div className={`text-xl font-mono font-black ${displayConsIconClass}`}>
                  {displayConsValue.toFixed(2)} <span className="text-xs text-slate-500">{displayConsUnit}</span>
              </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Timer size={10}/> Est. Pit Time
              </div>
              <div className="text-xl font-mono font-black text-amber-400">
                  {estPitTime > 0 ? estPitTime.toFixed(1) + 's' : '--'}
              </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <AlertTriangle size={10}/> Stops Left
              </div>
              <div className="text-xl font-mono font-black text-white">
                  {pitStopsRemaining}
              </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Clock size={10}/> Total Laps
              </div>
              <div className="text-xl font-mono font-black text-emerald-400">
                  {totalLaps}
              </div>
          </div>
      </div>

      {/* --- TABLEAU DES RELAIS --- */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left text-sm border-collapse">
           <thead className="sticky top-0 bg-[#050a10] z-10 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 shadow-lg">
             <tr>
               <th className="p-3 w-10 text-center">Stint</th>
               <th className="p-3">Driver</th>
               <th className="p-3 text-center">Laps</th>
               <th className="p-3 text-center">Pit Window</th>
               <th className="p-3 text-right">Refuel</th>
               <th className="p-3">Strategy Notes</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-white/5">
             {strategyData?.stints?.map((stint) => (
               <tr key={stint.id} className={`group hover:bg-white/[0.02] transition-colors ${stint.isCurrent ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : ''} ${stint.isDone ? 'row-done' : ''}`}>
                 
                 <td className="p-3 text-center font-mono font-bold text-xs text-slate-600">
                    {stint.isCurrent ? <span className="animate-pulse text-emerald-500">▶</span> : stint.stopNum}
                 </td>

                 <td className="p-3">
                   {stint.isDone ? (
                       <span className="text-slate-500 text-xs">{stint.driver.name}</span>
                   ) : (
                       <select 
                         value={stint.driverId || ""} 
                         onChange={(e) => onAssignDriver(stint.id, e.target.value)} 
                         className="bg-transparent border border-slate-700 rounded px-2 py-1 text-xs font-bold text-white focus:border-indigo-500 focus:bg-slate-900 outline-none w-full max-w-[140px]"
                       >
                         {/* Protection ici : drivers?.map ou utilisation de la props par défaut */}
                         {drivers?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </select>
                   )}
                 </td>

                 <td className="p-3 text-center font-mono text-xs text-slate-400">
                    {stint.isCurrent ? (
                        <span className="text-emerald-400 font-bold">IN PROG.</span>
                    ) : (
                        <span>{stint.lapsCount} Laps</span>
                    )}
                 </td>

                 <td className="p-3 text-center font-mono text-sm font-bold text-white flex items-center justify-center gap-2">
                   <span className="text-slate-400 text-xs">L</span>
                   {stint.startLap} 
                   <ChevronRight size={12} className="text-slate-600"/> 
                   {stint.endLap}
                 </td>

                 <td className="p-3 text-right font-mono text-xs font-bold">
                    <span className={stint.fuel.includes("FULL") ? "text-amber-400" : (stint.fuel.includes("NRG") ? "text-cyan-400" : "text-blue-300")}>
                        {stint.fuel}
                    </span>
                 </td>
                 
                 <td className="p-3">
                   <input 
                     type="text" 
                     value={stintNotes[stint.stopNum] || ""} 
                     onChange={(e) => onUpdateNote(stint.stopNum, e.target.value)} 
                     className="bg-transparent border-b border-transparent focus:border-indigo-500 w-full text-xs text-slate-300 outline-none placeholder-slate-800 focus:bg-slate-900/50 px-1 transition-all" 
                     placeholder={stint.isCurrent ? "Current Stint Plan..." : "Box instructions..."}
                   />
                 </td>
               </tr>
             ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default StrategyView;
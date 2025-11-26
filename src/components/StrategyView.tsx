import React from 'react';
import { ChevronRight, Battery, Zap } from 'lucide-react'; // Ajout de Zap pour plus de clarté

// Fonctions utilitaires du parent (réimplémentées ici pour l'affichage uniquement)
const formatLapTime = (s) => {
    if (isNaN(s) || s <= 0) return "---";
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`; 
};

const getLapTimeDelta = (estimatedTime, realTimeAvg) => {
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
    
    return { colorClass, displayDelta };
};


// On passe maintenant telemetryData pour lire la VE en temps réel
const StrategyView = ({ strategyData, drivers, stintNotes, onAssignDriver, onUpdateNote, estimatedTime, realTimeAvg, isHypercar, telemetryData }) => {
  
  // Calcul du différentiel de temps pour l'affichage conditionnel
  const lapTimeDeltaInfo = getLapTimeDelta(estimatedTime, realTimeAvg);
  
  // Lecture de la VE actuelle
  const currentVE = telemetryData?.virtualEnergy || 0;

  return (
    <div className="flex-1 overflow-auto custom-scrollbar bg-[#050a10]">
      <table className="w-full text-left text-sm border-collapse">
         <thead className="sticky top-0 bg-[#050a10] z-10 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
           <tr>
             <th className="p-3 w-10 text-center">#</th>
             <th className="p-3">Driver Selection</th>
             <th className="p-3">Window</th>
             <th className="p-3 text-right">Refuel</th>
             {/* TITRE MODIFIÉ : Affiche la VE actuelle */}
             {isHypercar && <th className="p-3 text-center flex items-center justify-center gap-1"><Zap size={10} className="text-cyan-400"/> VE Current</th>} 
             <th className="p-3 text-center">Time Diff</th>
             <th className="p-3">Notes</th>
           </tr>
         </thead>
         <tbody className="divide-y divide-white/5">
           {strategyData.stints.map((stint) => (
             <tr key={stint.id} className={`group hover:bg-white/[0.02] ${stint.isCurrent ? 'row-current' : ''} ${stint.isNext ? 'row-next' : ''} ${stint.isDone ? 'row-done' : ''}`}>
               <td className="p-3 text-center font-mono font-bold text-xs text-slate-600">{stint.stopNum}</td>
               <td className="p-3">
                 <select 
                   value={stint.driverId || ""} 
                   onChange={(e) => onAssignDriver(stint.id, e.target.value)} 
                   className="bg-transparent border border-slate-700 rounded px-2 py-1 text-xs font-bold text-white focus:border-indigo-500 focus:bg-slate-900 outline-none w-full max-w-[150px]"
                 >
                   {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                 </select>
               </td>
               <td className="p-3 font-mono text-xs text-slate-300 flex items-center gap-1">
                 {stint.startLap} <ChevronRight size={10} className="text-slate-600"/> {stint.endLap}
               </td>
               <td className="p-3 text-right font-mono text-xs text-slate-300 font-bold">{stint.fuel}</td>
               
               {/* AFFICHAGE DE LA VIRTUAL ENERGY EN TEMPS RÉEL (si stint actuel) */}
               {isHypercar && (
                   <td className="p-3 text-center">
                       {stint.isCurrent ? (
                           <span className="font-mono text-sm font-bold text-cyan-400">
                               {currentVE}%
                           </span>
                       ) : (
                           <span className="text-slate-700">---</span>
                       )}
                   </td>
               )}
               
               {/* AFFICHAGE DU DIFFÉRENTIEL */}
               <td className="p-3 text-center font-mono font-bold text-xs">
                 {stint.isCurrent ? ( 
                    <span className={lapTimeDeltaInfo.colorClass}>
                        {lapTimeDeltaInfo.displayDelta}
                    </span>
                 ) : (
                    <span className="text-slate-700">---</span>
                 )}
               </td>
               
               <td className="p-3">
                 <input 
                   type="text" 
                   value={stintNotes[stint.stopNum] || ""} 
                   onChange={(e) => onUpdateNote(stint.stopNum, e.target.value)} 
                   className="bg-transparent border-b border-transparent focus:border-indigo-500 w-full text-xs text-slate-300 outline-none font-mono placeholder-slate-800" 
                   placeholder="..."
                 />
               </td>
             </tr>
           ))}
         </tbody>
      </table>
    </div>
  );
};

export default StrategyView;
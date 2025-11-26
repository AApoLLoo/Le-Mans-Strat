import React from 'react';
import { ChevronRight } from 'lucide-react';

// On définit les props attendues pour que TypeScript soit content (ou on reste souple)
const StrategyView = ({ strategyData, drivers, stintNotes, onAssignDriver, onUpdateNote }) => {
  return (
    <div className="flex-1 overflow-auto custom-scrollbar bg-[#050a10]">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="sticky top-0 bg-[#050a10] z-10 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
          <tr>
            <th className="p-3 w-10 text-center">#</th>
            <th className="p-3">Driver Selection</th>
            <th className="p-3">Window</th>
            <th className="p-3 text-right">Refuel</th>
            <th className="p-3 text-center">Status</th>
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
              <td className="p-3 text-center">
                {stint.isCurrent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">CURRENT</span>}
                {stint.isNext && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1">NEXT STOP</span>}
                {!stint.isCurrent && !stint.isNext && <span className="text-[9px] text-slate-600 border border-slate-800 px-1 rounded">{stint.note}</span>}
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
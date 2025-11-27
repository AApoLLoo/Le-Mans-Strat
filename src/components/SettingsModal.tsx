import React from 'react';
import { X, RotateCcw, Plus, Trash2 } from 'lucide-react';
import type { GameState } from '../types'; // Notez le "import type"

interface SettingsModalProps {
    gameState: GameState;
    syncUpdate: (data: Partial<GameState>) => void;
    onClose: () => void;
    onReset: () => void;
    onAddDriver: () => void;
    onRemoveDriver: (id: number | string) => void;
    onUpdateDriver: (id: number | string, field: string, val: any) => void;
    isHypercar: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    gameState, syncUpdate, onClose, onReset, onAddDriver, onRemoveDriver, onUpdateDriver, isHypercar 
}) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="glass-panel w-full max-w-lg rounded-xl p-6 border border-slate-700 space-y-4 bg-slate-900/90">
              <div className="flex justify-between items-center"><h2 className="text-lg font-bold text-white">SETTINGS</h2><button onClick={onClose}><X className="text-slate-400"/></button></div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] text-slate-500 font-bold">RACE DURATION (Hours)</label><input type="number" value={gameState.raceDurationHours} onChange={(e)=>syncUpdate({raceDurationHours: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                 <div><label className="text-[10px] text-slate-500 font-bold">AVG LAP TIME (Seconds)</label><input type="number" value={gameState.avgLapTimeSeconds} onChange={(e)=>syncUpdate({avgLapTimeSeconds: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                 <div><label className="text-[10px] text-slate-500 font-bold">TANK (L)</label><input type="number" value={gameState.tankCapacity} onChange={(e)=>syncUpdate({tankCapacity: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                 <div>
                    <label className={`${isHypercar ? 'text-cyan-500' : 'text-slate-500'} text-[10px] font-bold`}>
                        {isHypercar ? 'VE CONS (%/Lap)' : 'FUEL CONS (L/Lap)'}
                    </label>
                    <input 
                        type="number" 
                        step="0.01" 
                        value={isHypercar ? gameState.veCons : gameState.fuelCons} 
                        onChange={(e)=> syncUpdate(isHypercar ? {veCons: Number(e.target.value)} : {fuelCons: Number(e.target.value)})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    />
                 </div>
              </div>
              
              <div className="space-y-2 pt-2">
                 <div className="flex justify-between items-center"><label className="text-[10px] text-slate-500 font-bold">DRIVERS MANAGEMENT</label><button onClick={onAddDriver} className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded font-bold flex items-center gap-1"><Plus size={10}/> ADD</button></div>
                 <div className="max-h-60 overflow-y-auto space-y-2">
                    {gameState.drivers && gameState.drivers.map((d) => (
                        <div key={d.id} className="flex gap-2 items-center">
                           <input type="color" value={d.color || "#3b82f6"} onChange={(e) => onUpdateDriver(d.id, 'color', e.target.value)} className="w-8 h-8 bg-transparent border-none cursor-pointer rounded"/>
                           <input type="text" value={d.name} onChange={(e) => onUpdateDriver(d.id, 'name', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder="Name"/>
                           <button onClick={() => onRemoveDriver(d.id)} className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                 </div>
                 <button onClick={onReset} className="w-full py-2 border border-red-900 text-red-500 hover:bg-red-900/20 rounded text-xs uppercase font-bold mt-4 flex items-center justify-center gap-2"><RotateCcw size={14}/> RESET RACE</button>
              </div>
           </div>
        </div>
    );
};

export default SettingsModal;
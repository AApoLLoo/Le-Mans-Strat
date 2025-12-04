import React from 'react';
import { X, Trash2 } from 'lucide-react';
import type { GameState } from '../types';

interface SettingsModalProps {
    gameState: GameState;
    syncUpdate: (data: any) => void;
    onClose: () => void;
    isHypercar: boolean;
    isLMGT3: boolean;
    onAddDriver: () => void;
    onRemoveDriver: (id: number | string) => void;
    onUpdateDriver: (id: number | string, field: string, val: string | number) => void;
    onReset: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
                                                         gameState, syncUpdate, onClose, onAddDriver, onRemoveDriver, onUpdateDriver, onReset, isHypercar, isLMGT3
                                                     }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

                <div className="flex justify-between items-center p-6 border-b border-white/5">
                    <h2 className="text-xl font-black italic text-white">TEAM SETTINGS</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} className="text-slate-400"/></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8">

                    {/* --- RACE PARAMS --- */}
                    <section>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Race Parameters</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] text-slate-500 font-bold">RACE DURATION (Hours)</label><input type="number" value={gameState.raceDurationHours} onChange={(e)=>syncUpdate({raceDurationHours: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"/></div>
                            <div>
                                <label className={`${(isHypercar || isLMGT3) ? 'text-cyan-500' : 'text-slate-500'} text-[10px] font-bold`}>
                                    {(isHypercar || isLMGT3) ? 'VE CONS (%/Lap)' : 'FUEL CONS (L/Lap)'}
                                </label>
                                <input type="number" step="0.01" value={(isHypercar || isLMGT3) ? gameState.veCons : gameState.fuelCons} onChange={(e)=> syncUpdate((isHypercar || isLMGT3) ? {veCons: Number(e.target.value)} : {fuelCons: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"/>
                            </div>
                        </div>
                    </section>
                    {/* Input Temps Total (en minutes pour simplifier l'édition) */}
                    <div className="flex flex-col items-end w-20">
                        <label className="text-[8px] text-slate-500">MINS</label>
                        <input
                            type="number"
                            value={Math.floor((driver.totalDriveTime || 0) / 60)}
                            onChange={(e) => onUpdateDriver(driver.id, 'totalDriveTime', Number(e.target.value) * 60)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-right text-sm text-slate-300"
                        />
                    </div>
                    {/* --- DRIVERS --- */}
                    <section>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Driver Line-up</h3>
                            <button onClick={onAddDriver} className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded font-bold transition-colors">+ ADD DRIVER</button>
                        </div>
                        <div className="space-y-2">
                            {gameState.drivers.map((driver, idx) => (
                                <div key={driver.id} className="flex gap-2 items-center">
                                    <div className="w-6 text-center text-xs text-slate-600 font-mono">{idx + 1}</div>
                                    <input type="text" value={driver.name} onChange={(e) => onUpdateDriver(driver.id, 'name', e.target.value)} className="flex-1 bg-slate-800 border border-white/5 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"/>
                                    <input type="color" value={driver.color} onChange={(e) => onUpdateDriver(driver.id, 'color', e.target.value)} className="w-8 h-9 bg-transparent cursor-pointer rounded overflow-hidden"/>
                                    <button onClick={() => onRemoveDriver(driver.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="pt-4 border-t border-white/5">
                        <button onClick={onReset} className="text-red-500 text-xs font-bold hover:underline flex items-center gap-2"><Trash2 size={12}/> RESET RACE DATA</button>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Car, Users, Crown, Shield } from 'lucide-react';
import type { GameState, Driver } from '../types';

interface SettingsModalProps {
    gameState: GameState;
    syncUpdate: (changes: Partial<GameState>) => void;
    onClose: () => void;
    isHypercar: boolean;
    isLMGT3: boolean;
    onAddDriver: () => void;
    onRemoveDriver: (id: number | string) => void;
    onUpdateDriver: (id: number | string, field: string, val: any) => void;
    onReset: () => void;
    canManageLineup: boolean; // <--- Permission reçue
}

export default function SettingsModal({
                                          gameState, syncUpdate, onClose, isHypercar, isLMGT3,
                                          onAddDriver, onRemoveDriver, onUpdateDriver, onReset, canManageLineup
                                      }: SettingsModalProps) {

    const [activeTab, setActiveTab] = useState<'DRIVERS' | 'CAR' | 'ADMIN'>('DRIVERS');

    // Sauvegarde des paramètres voiture
    const handleSaveCar = () => {
        // Logique de sauvegarde API si nécessaire
        onClose();
    };

    const handleDeleteLineup = async () => {
        // Logique de suppression via API (DELETE /api/lineups/:id)
        if(confirm("⚠️ ARE YOU SURE? This will delete the entire strategy and history!")) {
            // Appel API à implémenter ici ou passer en prop
            alert("Delete requested (Check API implementation)");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f172a] w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* HEADER */}
                <div className="flex justify-between items-center p-4 border-b border-white/5 bg-slate-900/50">
                    <h2 className="text-xl font-black italic text-white tracking-wider flex items-center gap-2">
                        <Shield size={20} className="text-indigo-500"/> RACE SETTINGS
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-white/5">
                    <button onClick={() => setActiveTab('DRIVERS')} className={`flex-1 p-3 text-xs font-bold uppercase tracking-widest ${activeTab === 'DRIVERS' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}>
                        Drivers
                    </button>
                    <button onClick={() => setActiveTab('CAR')} className={`flex-1 p-3 text-xs font-bold uppercase tracking-widest ${activeTab === 'CAR' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}>
                        Car & Data
                    </button>
                    {canManageLineup && (
                        <button onClick={() => setActiveTab('ADMIN')} className={`flex-1 p-3 text-xs font-bold uppercase tracking-widest ${activeTab === 'ADMIN' ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}>
                            Management
                        </button>
                    )}
                </div>

                {/* CONTENT */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                    {/* --- DRIVERS TAB --- */}
                    {activeTab === 'DRIVERS' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Driver List</label>
                                {canManageLineup && (
                                    <button onClick={onAddDriver} className="text-[10px] bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded text-white font-bold flex items-center gap-1">
                                        <Plus size={12}/> ADD DRIVER
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                {gameState.drivers.map((d, idx) => (
                                    <div key={d.id} className="flex gap-2 items-center bg-slate-900 p-2 rounded border border-white/5">
                                        <div className="w-6 text-center text-xs font-mono text-slate-500">{idx+1}</div>
                                        <input
                                            type="text"
                                            value={d.name}
                                            onChange={(e) => onUpdateDriver(d.id, 'name', e.target.value)}
                                            disabled={!canManageLineup}
                                            className="flex-1 bg-transparent border-b border-transparent focus:border-indigo-500 text-sm text-white font-bold outline-none px-2"
                                        />
                                        <input
                                            type="color"
                                            value={d.color}
                                            onChange={(e) => onUpdateDriver(d.id, 'color', e.target.value)}
                                            disabled={!canManageLineup}
                                            className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
                                        />
                                        {canManageLineup && gameState.drivers.length > 1 && (
                                            <button onClick={() => onRemoveDriver(d.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                                                <Trash2 size={16}/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- CAR TAB --- */}
                    {activeTab === 'CAR' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tank Capacity (L)</label>
                                    <input type="number" value={gameState.tankCapacity} onChange={(e) => syncUpdate({tankCapacity: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-bold"/>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Fuel Cons (L/Lap)</label>
                                    <input type="number" step="0.01" value={gameState.fuelCons} onChange={(e) => syncUpdate({fuelCons: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-bold"/>
                                </div>
                            </div>

                            {(isHypercar || isLMGT3) && (
                                <div className="space-y-2 p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-lg">
                                    <label className="text-[10px] font-bold text-indigo-400 uppercase">Virtual Energy Cons (%/Lap)</label>
                                    <input type="number" step="0.1" value={gameState.veCons} onChange={(e) => syncUpdate({veCons: Number(e.target.value)})} className="w-full bg-slate-900 border border-indigo-500/50 rounded p-2 text-white font-bold"/>
                                </div>
                            )}

                            <div className="pt-4 border-t border-white/5">
                                <button onClick={handleSaveCar} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold flex items-center justify-center gap-2">
                                    <Save size={16}/> SAVE CONFIGURATION
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- MANAGEMENT TAB (Leader Only) --- */}
                    {activeTab === 'ADMIN' && canManageLineup && (
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Users size={14}/> Permissions
                                </h3>
                                <p className="text-xs text-slate-500 italic mb-4">
                                    Manage who can edit the lineup structure. (Member list implementation pending)
                                </p>
                                {/* Placeholder pour la liste des membres à promouvoir */}
                                <div className="text-center p-4 border border-dashed border-slate-700 rounded">
                                    <span className="text-xs text-slate-600">Member List & Promotion UI</span>
                                </div>
                            </div>

                            <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-4">
                                <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Crown size={14}/> Danger Zone
                                </h3>
                                <div className="flex justify-between items-center mt-4">
                                    <div>
                                        <div className="text-white font-bold text-sm">Delete Lineup</div>
                                        <div className="text-slate-500 text-xs">Permanently delete strategy and history.</div>
                                    </div>
                                    <button onClick={handleDeleteLineup} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-xs font-bold shadow-lg shadow-red-900/20">
                                        DELETE
                                    </button>
                                </div>
                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-red-500/10">
                                    <div>
                                        <div className="text-white font-bold text-sm">Reset Race Data</div>
                                        <div className="text-slate-500 text-xs">Clear laps, incidents, and timers.</div>
                                    </div>
                                    <button onClick={onReset} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-xs font-bold">
                                        RESET
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
import React from 'react';
import { X, RotateCcw, Plus, Trash2 } from 'lucide-react';
import type { GameState } from '../types';

interface SettingsModalProps {
    gameState: GameState;
    syncUpdate: (data: Partial<GameState>) => void;
    onClose: () => void;
    onReset: () => void;
    onAddDriver: () => void;
    onRemoveDriver: (id: any) => void;
    onUpdateDriver: (id: any, field: string, val: any) => void;
    isHypercar: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    gameState, syncUpdate, onClose, onReset, onAddDriver, onRemoveDriver, onUpdateDriver, isHypercar 
}) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="glass-panel w-full max-w-lg rounded-xl p-6 border border-slate-700 space-y-4">
              <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white">SETTINGS</h2>
                  <button onClick={onClose}><X className="text-slate-400"/></button>
              </div>
              
              {/* ... Le reste du formulaire settings ... */}
              
              <button onClick={onReset} className="w-full py-2 border border-red-900 text-red-500 hover:bg-red-900/20 rounded text-xs uppercase font-bold mt-4 flex items-center justify-center gap-2">
                  <RotateCcw size={14}/> RESET RACE
              </button>
           </div>
        </div>
    );
};

export default SettingsModal;
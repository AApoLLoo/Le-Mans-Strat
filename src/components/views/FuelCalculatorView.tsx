import React, { useState, useEffect } from 'react';
import { Calculator, Clock, Fuel, Flag, RotateCcw } from 'lucide-react';
import type { GameState } from '../../types';
import { formatTime } from '../../utils/helpers';

interface FuelCalculatorProps {
    gameState: GameState;
}

const FuelCalculatorView: React.FC<FuelCalculatorProps> = ({ gameState }) => {
    // --- ÉTATS LOCAUX (Initialisés avec les données réelles) ---
    const [timeRemaining, setTimeRemaining] = useState(gameState.sessionTimeRemaining || 3600);
    const [lapTime, setLapTime] = useState(gameState.avgLapTimeSeconds || 210);
    const [fuelCons, setFuelCons] = useState(gameState.fuelCons || 3.5);
    const [tankCap, setTankCap] = useState(gameState.tankCapacity || 100);
    const [currentFuel, setCurrentFuel] = useState(gameState.telemetry.fuel.current || 0);

    // Mettre à jour les valeurs si le jeu change (optionnel, pour garder la synchro)
    useEffect(() => {
        if (gameState.isRaceRunning) {
            setTimeRemaining(gameState.sessionTimeRemaining);
            setCurrentFuel(gameState.telemetry.fuel.current);
        }
    }, [gameState.sessionTimeRemaining, gameState.telemetry.fuel.current, gameState.isRaceRunning]);

    // --- CALCULS ---
    // 1. Combien de tours restants ? (Temps restant / Temps au tour)
    // On ajoute une marge de sécurité (ex: +1 tour si on passe la ligne juste avant la fin)
    const lapsRemainingExact = timeRemaining / lapTime;
    const lapsRemainingSafe = Math.ceil(lapsRemainingExact + 0.2); // +0.2 pour la sécurité passage de ligne

    // 2. Carburant Total nécessaire
    const totalFuelNeeded = lapsRemainingSafe * fuelCons;

    // 3. Carburant à ajouter (Delta)
    const fuelToAdd = Math.max(0, totalFuelNeeded - currentFuel);

    // 4. Nombre d'arrêts restants (Splash inclus)
    const stopsRemaining = Math.ceil(Math.max(0, totalFuelNeeded - currentFuel) / tankCap);

    // 5. Est-ce que c'est un Splash ? (Si < 20% du réservoir)
    const isSplash = fuelToAdd > 0 && fuelToAdd < (tankCap * 0.2);

    return (
        <div className="h-full bg-[#0b0f19] p-6 overflow-y-auto font-display text-white flex flex-col gap-6">

            {/* HEADER */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-900/20">
                    <Calculator size={24} className="text-white"/>
                </div>
                <div>
                    <h2 className="text-xl font-black italic">SPLASH CALCULATOR</h2>
                    <div className="text-xs text-slate-400 font-mono">END OF RACE STRATEGY</div>
                </div>
            </div>

            {/* --- INPUTS (PARAMÈTRES) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Temps Restant */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <Clock size={12}/> Time Remaining
                    </div>
                    <div className="font-mono text-2xl font-bold text-white mb-2">
                        {formatTime(timeRemaining)}
                    </div>
                    <input
                        type="range" min="0" max="86400" step="60"
                        value={timeRemaining}
                        onChange={(e) => setTimeRemaining(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                {/* Temps au Tour */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <RotateCcw size={12}/> Avg Lap Time
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="number" step="0.1"
                            value={lapTime}
                            onChange={(e) => setLapTime(Number(e.target.value))}
                            className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xl font-mono font-bold w-24 text-center outline-none focus:border-indigo-500"
                        />
                        <span className="text-xs text-slate-500">sec</span>
                    </div>
                    <div className="text-xs text-slate-400">Target pace for end of race</div>
                </div>

                {/* Conso */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <Fuel size={12}/> Fuel Cons.
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="number" step="0.01"
                            value={fuelCons}
                            onChange={(e) => setFuelCons(Number(e.target.value))}
                            className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xl font-mono font-bold w-24 text-center outline-none focus:border-indigo-500"
                        />
                        <span className="text-xs text-slate-500">L/Lap</span>
                    </div>
                </div>

                {/* Fuel Actuel */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <Fuel size={12}/> Current Fuel
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="number" step="0.1"
                            value={currentFuel}
                            onChange={(e) => setCurrentFuel(Number(e.target.value))}
                            className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xl font-mono font-bold w-24 text-center outline-none focus:border-indigo-500"
                        />
                        <span className="text-xs text-slate-500">Liters</span>
                    </div>
                </div>

            </div>

            {/* --- RÉSULTATS --- */}
            <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-900/50 rounded-2xl border border-white/10 p-8 flex flex-col justify-center items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-4xl text-center relative z-10">

                    {/* Tours Restants */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Laps Remaining</span>
                        <span className="text-6xl font-black text-white">{lapsRemainingSafe}</span>
                        <span className="text-sm text-slate-400 font-mono">({lapsRemainingExact.toFixed(1)})</span>
                    </div>

                    {/* Fuel Nécessaire */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Fuel Needed</span>
                        <span className="text-6xl font-black text-blue-400">{totalFuelNeeded.toFixed(1)}<span className="text-2xl text-slate-500 ml-1">L</span></span>
                    </div>

                    {/* Fuel à Ajouter */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fuel To Add</span>
                        {fuelToAdd <= 0 ? (
                            <span className="text-5xl font-black text-emerald-500">NO STOP</span>
                        ) : (
                            <div className="flex flex-col items-center">
                                <span className={`text-6xl font-black ${isSplash ? 'text-yellow-400' : 'text-red-500'}`}>
                                    +{fuelToAdd.toFixed(1)}<span className="text-2xl text-slate-500 ml-1">L</span>
                                </span>
                                {isSplash && <span className="text-xs font-bold bg-yellow-500/20 text-yellow-200 px-2 py-1 rounded mt-2 border border-yellow-500/30">SPLASH & DASH</span>}
                            </div>
                        )}
                    </div>

                </div>

                {/* Warning si pas assez de temps */}
                {fuelToAdd > 0 && timeRemaining < 300 && (
                    <div className="mt-12 flex items-center gap-2 text-red-500 font-bold animate-pulse bg-red-950/30 px-6 py-3 rounded-xl border border-red-500/30">
                        <Flag size={20}/> CRITICAL: BOX NOW FOR {fuelToAdd.toFixed(1)}L
                    </div>
                )}
            </div>

        </div>
    );
};

export default FuelCalculatorView;
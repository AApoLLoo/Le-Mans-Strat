// src/utils/helpers.ts
import type { Driver } from '../types';

export const formatTime = (s: number) => {
    if(isNaN(s) || s < 0) return "00:00:00";
    
    // On s'assure de travailler sur des entiers pour l'affichage
    const val = Math.floor(s);
    
    const h = Math.floor(val / 3600).toString().padStart(2, '0');
    const m = Math.floor((val % 3600) / 60).toString().padStart(2, '0');
    const sec = (val % 60).toString().padStart(2, '0'); // Math.floor(s % 60) est aussi valide
    
    return `${h}:${m}:${sec}`;
};

/** Format lap time with 1 decimal (e.g. "3:24.5") — for strategy/summary displays */
export const formatLapTime = (s: number) => {
    if (isNaN(s) || s <= 0) return "---";
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
};

/** Format lap time with milliseconds (e.g. "3:24.512") — for telemetry/timing displays */
export const formatLapTimePrecise = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return "--:--.---";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

/** Format lap time for timing tables (e.g. "3:24.512" or "-:--.---") */
export const formatLapTimeForTable = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "-:--.---";
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
};

export const getSafeDriver = (driver: Driver | undefined): Driver => {
  return driver || { id: 'unknown', name: "---", phone: "", color: "#3b82f6", text: "text-slate-500" };
};

export const getLapTimeDelta = (estimatedTime: number, realTimeAvg: number) => {
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
    return { colorClass, displayDelta, realTimeAvg };
};
export const calculateRefillStrategy = (
    currentFuel: number,
    avgConsumption: number,
    lapsCompleted: number,
    totalLaps: number, // Si course aux tours
    timeLeft: number,  // Si course au temps (en secondes)
    avgLapTime: number // Temps au tour moyen (en secondes)
) => {
    // 1. Estimer le nombre de tours restants
    let lapsRemaining = 0;

    if (totalLaps > 0) {
        // Course au nombre de tours
        lapsRemaining = totalLaps - lapsCompleted;
    } else if (timeLeft > 0 && avgLapTime > 0) {
        // Course au temps : (Temps restant / Temps au tour) + 1 tour de sécurité (souvent la règle)
        lapsRemaining = Math.ceil(timeLeft / avgLapTime);
    }

    // 2. Calcul du carburant nécessaire pour finir
    const fuelNeededToEnd = lapsRemaining * avgConsumption;

    // 3. Calcul du "Refill" (ce qu'il faut ajouter)
    // Si on a 20L et qu'il en faut 50L, Refill = 30L. Si on a 60L, Refill = 0.
    const refillNeeded = Math.max(0, fuelNeededToEnd - currentFuel);

    // 4. Status (Logique Vroom : Vert = OK, Orange = Juste, Rouge = Manque)
    // On considère "Safe" si on a 1 tour de marge en plus dans le réservoir actuel
    const fuelDelta = currentFuel - fuelNeededToEnd;
    let status = 'CRITICAL'; // Manque beaucoup
    let statusColor = 'text-red-500';

    if (fuelDelta >= avgConsumption) {
        status = 'OK'; // On a plus d'un tour de marge
        statusColor = 'text-emerald-500'; // Vert (Vroom style)
    } else if (fuelDelta >= 0) {
        status = 'TIGHT'; // On finit mais c'est juste (< 1 tour marge)
        statusColor = 'text-amber-500'; // Orange (Vroom style)
    }

    return {
        lapsRemaining,
        fuelNeededToEnd,
        refillNeeded,
        status,
        statusColor
    };
};
// src/hooks/useRaceData.ts
import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from '../lib/firebase';
import type { GameState, Driver, StrategyData } from '../types';

export const useRaceData = (teamId: string, sessionId: string) => {
    const [status, setStatus] = useState("CONNECTING...");
    const [localRaceTime, setLocalRaceTime] = useState(24 * 3600);
    const [localStintTime, setLocalStintTime] = useState(0);
    
    // Initial State (copie ton état initial ici)
    const [gameState, setGameState] = useState<GameState>({
        currentStint: 0,
        raceTime: 24 * 60 * 60,
        stintDuration: 0,
        isRaceRunning: false,
        weather: "SUNNY",
        airTemp: 25,
        trackWetness: 0,
        fuelCons: 3.65,
        veCons: 2.5,
        tankCapacity: 105,
        raceDurationHours: 24,
        avgLapTimeSeconds: 210,
        isEmergency: false,
        drivers: [],
        activeDriverId: 0,
        incidents: [],
        chatMessages: [],
        stintNotes: {},
        stintAssignments: {},
        position: 4,
        telemetry: {
            laps: 0,
            fuel: { current: 100, max: 105, lastLapCons: 0, averageCons: 0 },
            virtualEnergy: 100,
            tires: { fl: 100, fr: 100, rl: 100, rr: 100 },
            currentLapTimeSeconds: 0,
            last3LapAvgSeconds: 0,
            brakeTemps: { flc: 0, frc: 0, rlc: 0, rrc: 0 },
            tireTemps: { flc: 0, frc: 0, rlc: 0, rrc: 0 },
            strategyEstPitTime: 0,
            inPitLane: null
        },
        stintVirtualEnergy: {}
    });

    const syncUpdate = (data: Partial<GameState>) => {
        if (!db) { setGameState(prev => ({...prev, ...data})); return; }
        updateDoc(doc(db, "strategies", sessionId), data).catch(e => console.error("Update Error", e));
    };

    // ... ICI : Copie tes useEffects de sync Firebase, Reset Timer, etc.
    // Adapte les appels à setGameState pour utiliser la variable locale de ce hook.

    return {
        gameState,
        syncUpdate,
        status,
        localRaceTime,
        localStintTime,
        setLocalRaceTime,
        setLocalStintTime
    };
};
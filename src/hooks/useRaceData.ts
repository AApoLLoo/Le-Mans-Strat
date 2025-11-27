// src/hooks/useRaceData.ts
import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from '../lib/firebase';
import type { GameState, StrategyData, Stint } from '../types';
import { getSafeDriver } from '../utils/helpers';

export const useRaceData = (teamId: string) => {
    const SESSION_ID = `lemans-2025-${teamId}`;
    const CHAT_ID = "lemans-2025-global-radio";
    const isHypercar = teamId === 'hypercar';

    const [status, setStatus] = useState("CONNECTING...");
    const [localRaceTime, setLocalRaceTime] = useState(24 * 3600);
    const [localStintTime, setLocalStintTime] = useState(0);
    
    // État initial
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
        drivers: [{id: 1, name: "Driver 1", color: isHypercar ? '#ef4444' : '#3b82f6', phone: ""}],
        activeDriverId: 1,
        incidents: [],
        chatMessages: [],
        stintNotes: {},
        stintAssignments: {},
        position: 4,
        // Structure de télémétrie par défaut
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
        updateDoc(doc(db, "strategies", SESSION_ID), data).catch(e => console.error("Update Error", e));
    };

    // Sync Firebase
    useEffect(() => {
        if (!db) { setStatus("LOCAL MODE"); return; }
        const docRef = doc(db, "strategies", SESSION_ID);
        
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // --- CORRECTION : Reconstruire l'objet telemetry manuellement ---
                // On utilise une fonction de mise à jour pour avoir accès à 'prev' (l'état précédent)
                // et éviter d'écraser des données avec des valeurs vides.
                setGameState(prev => {
                    const liveTelemetry = {
                        ...prev.telemetry, // On garde les anciennes valeurs par défaut
                        laps: data.currentLap ?? prev.telemetry.laps,
                        
                        fuel: {
                            current: data.fuelRemainingL ?? prev.telemetry.fuel.current,
                            max: data.fuelTankCapacityL ?? prev.telemetry.fuel.max,
                            averageCons: data.averageConsumptionFuel ?? prev.telemetry.fuel.averageCons,
                            lastLapCons: data.fuelConsumptionLastLapL ?? prev.telemetry.fuel.lastLapCons,
                        },
                        
                        virtualEnergy: data.engineMode === 3 ? 99 : (data.engineMode === 2 ? 1 : (data.virtualEnergy ?? prev.telemetry.virtualEnergy)),
                        
                        tires: {
                            fl: data.tireWearFL ?? prev.telemetry.tires.fl,
                            fr: data.tireWearFR ?? prev.telemetry.tires.fr,
                            rl: data.tireWearRL ?? prev.telemetry.tires.rl,
                            rr: data.tireWearRR ?? prev.telemetry.tires.rr,
                        },
                        
                        brakeTemps: {
                            flc: data.brakeTempFLC ?? prev.telemetry.brakeTemps.flc,
                            frc: data.brakeTempFRC ?? prev.telemetry.brakeTemps.frc,
                            rlc: data.brakeTempRLC ?? prev.telemetry.brakeTemps.rlc,
                            rrc: data.brakeTempRRC ?? prev.telemetry.brakeTemps.rrc,
                        },
                        
                        tireTemps: {
                            flc: data.tireTempCenterFLC ?? prev.telemetry.tireTemps.flc,
                            frc: data.tireTempCenterFRC ?? prev.telemetry.tireTemps.frc,
                            rlc: data.tireTempCenterRLC ?? prev.telemetry.tireTemps.rlc,
                            rrc: data.tireTempCenterRRC ?? prev.telemetry.tireTemps.rrc,
                        },
                        
                        currentLapTimeSeconds: data.lapTimeLast ?? prev.telemetry.currentLapTimeSeconds,
                        last3LapAvgSeconds: data.averageLapTime ?? prev.telemetry.last3LapAvgSeconds,
                        strategyEstPitTime: data.strategyEstPitTime ?? prev.telemetry.strategyEstPitTime,
                        inPitLane: data.inPitLane ?? prev.telemetry.inPitLane
                    };

                    return {
                        ...prev,
                        ...data, // On fusionne les champs racines (comme raceTime, weather...)
                        telemetry: liveTelemetry, // On injecte notre objet telemetry bien rangé
                        // Sécurités pour les objets
                        stintAssignments: data.stintAssignments || prev.stintAssignments || {},
                        stintNotes: data.stintNotes || prev.stintNotes || {},
                        drivers: data.drivers || prev.drivers
                    };
                });

                if (data.isRaceRunning && typeof data.sessionTimeRemainingSeconds === 'number') {
                    setLocalRaceTime(data.sessionTimeRemainingSeconds);
                }
                if (typeof data.stintDuration === 'number') {
                    setLocalStintTime(data.stintDuration);
                }
                setStatus("LIVE SYNC");
            } else {
                // Création du document s'il n'existe pas
                const initialData = { ...gameState, raceTime: 24 * 3600 };
                setDoc(docRef, initialData).then(() => setStatus("CREATED"));
            }
        });
        return () => unsubscribe();
    }, [teamId]);

    // Timer
    useEffect(() => {
        let interval: any = null;
        if (gameState.isRaceRunning && localRaceTime > 0) {
            interval = setInterval(() => {
                setLocalRaceTime(prev => Math.max(0, prev - 1));
                setLocalStintTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameState.isRaceRunning]);

    // --- STRATÉGIE ---
    const strategyData: StrategyData = useMemo(() => {
        const activeDriver = getSafeDriver(gameState.drivers.find(d => d.id === gameState.activeDriverId));
        const activeLapTime = gameState.telemetry.last3LapAvgSeconds || gameState.avgLapTimeSeconds;
        const activeFuelCons = gameState.telemetry.fuel.averageCons || gameState.fuelCons;
        const activeVECons = gameState.veCons;
        const tankCapacity = gameState.telemetry.fuel.max || gameState.tankCapacity;

        const lapsPerTank = Math.floor(tankCapacity / activeFuelCons);
        const lapsPerVE = Math.floor(100 / activeVECons);
        const lapsPerStint = isHypercar ? Math.min(lapsPerVE, lapsPerTank) : lapsPerTank;
        
        const lapsRemaining = Math.max(1, Math.ceil(localRaceTime / activeLapTime));
        const currentLap = gameState.telemetry.laps;
        const totalLapsTarget = currentLap + lapsRemaining;

        const stints: Stint[] = [];
        const currentStintIndex = gameState.currentStint;

        // 1. Stints Passés
        const lapsDone = Math.max(0, currentLap - (lapsPerStint * 0.5));
        const avgPastStintLen = currentStintIndex > 0 ? lapsDone / currentStintIndex : lapsPerStint;

        for (let i = 0; i < currentStintIndex; i++) {
            let driverId = gameState.stintAssignments[i];
            if (!driverId) driverId = gameState.drivers[i % gameState.drivers.length]?.id;
            const d = getSafeDriver(gameState.drivers.find(drv => drv.id === driverId));
            
            stints.push({
                id: i, stopNum: i + 1, startLap: Math.floor(i * avgPastStintLen), endLap: Math.floor((i + 1) * avgPastStintLen),
                fuel: "DONE", driver: d, driverId: d.id, isCurrent: false, isNext: false, isDone: true, note: "Done", lapsCount: Math.floor(avgPastStintLen)
            });
        }

        // 2. Stint Actuel
        stints.push({
            id: currentStintIndex, stopNum: currentStintIndex + 1, startLap: currentLap, endLap: currentLap + lapsPerStint,
            fuel: "CURRENT", driver: activeDriver, driverId: activeDriver.id, isCurrent: true, isNext: false, isDone: false, note: "NOW", lapsCount: lapsPerStint
        });

        // 3. Stints Futurs
        let lapCounter = currentLap + lapsPerStint;
        let nextIdx = currentStintIndex + 1;
        while(lapCounter < totalLapsTarget) {
            let dId = gameState.stintAssignments[nextIdx];
            if (!dId) {
                const prevDId = stints[stints.length-1].driverId;
                const prevDIdx = gameState.drivers.findIndex(d => d.id === prevDId);
                dId = gameState.drivers[(prevDIdx + 1) % gameState.drivers.length]?.id;
            }
            const d = getSafeDriver(gameState.drivers.find(drv => drv.id === dId));
            
            const isLast = (lapCounter + lapsPerStint) >= totalLapsTarget;
            const lapsThisStint = isLast ? (totalLapsTarget - lapCounter) : lapsPerStint;
            
            stints.push({
                id: nextIdx, stopNum: nextIdx + 1, startLap: lapCounter, endLap: lapCounter + lapsThisStint,
                fuel: isLast ? ((lapsThisStint+1)*activeFuelCons).toFixed(1)+"L" : "FULL", 
                driver: d, driverId: dId, isCurrent: false, isNext: nextIdx === currentStintIndex + 1, isDone: false, note: isLast ? "FINISH" : "BOX", lapsCount: lapsThisStint
            });
            lapCounter += lapsThisStint;
            nextIdx++;
        }

        return { stints, totalLaps: totalLapsTarget, lapsPerTank: lapsPerStint, activeCons: activeFuelCons, activeLapTime, pitStopsRemaining: Math.max(0, stints.length - 1 - currentStintIndex) };
    }, [gameState, localRaceTime, isHypercar]);

    // --- ACTIONS ---

    const confirmPitStop = () => {
        const nextStint = gameState.currentStint + 1;
        const newAssignments = { ...gameState.stintAssignments, [gameState.currentStint]: gameState.activeDriverId };
        
        let nextDriverId = gameState.stintAssignments[nextStint];
        if (!nextDriverId && gameState.drivers.length > 0) {
             const currentIdx = gameState.drivers.findIndex(d => d.id === gameState.activeDriverId);
             nextDriverId = gameState.drivers[(currentIdx + 1) % gameState.drivers.length].id;
        }

        syncUpdate({ 
            currentStint: nextStint, 
            activeDriverId: nextDriverId,
            stintDuration: 0,
            stintAssignments: newAssignments
        });
        setLocalStintTime(0);
    };

    const undoPitStop = () => {
        if (gameState.currentStint > 0) {
            const prevStint = gameState.currentStint - 1;
            const prevDriverId = gameState.stintAssignments[prevStint] || gameState.drivers[0].id;
            
            syncUpdate({
                currentStint: prevStint,
                activeDriverId: prevDriverId,
            });
        }
    };

    const resetRace = () => {
        const initialRaceTime = gameState.raceDurationHours * 3600;
        syncUpdate({ 
            isRaceRunning: false, 
            raceTime: initialRaceTime, 
            stintDuration: 0, 
            currentStint: 0, 
            activeDriverId: gameState.drivers[0]?.id || 1,
            incidents: [], 
            chatMessages: [],
            stintAssignments: {},
            stintNotes: {} 
        });
        setLocalRaceTime(initialRaceTime);
        setLocalStintTime(0);
    };

    return {
        gameState,
        syncUpdate,
        status,
        localRaceTime,
        localStintTime,
        strategyData,
        confirmPitStop,
        undoPitStop,
        resetRace,
        db,
        CHAT_ID
    };
};
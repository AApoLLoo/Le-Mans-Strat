import { useState, useEffect, useMemo, useRef } from 'react'; 
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from '../lib/firebase';
import type { GameState, StrategyData, Stint } from '../types';
import { getSafeDriver } from '../utils/helpers';

export const useRaceData = (teamId: string) => {
    const SESSION_ID = teamId; 
    const CHAT_ID = "global-radio"; 
    
    const tId = teamId.toLowerCase();
    const isHypercar = tId.includes('hyper') || tId.includes('red');
    const isLMGT3 = tId.includes('gt3') || tId.includes('lmgt3');
    const isLMP3 = tId.includes('lmp3');
    const isLMP2ELMS = tId.includes('elms') || (tId.includes('lmp2') && tId.includes('elms'));

    const [status, setStatus] = useState("CONNECTING...");
    const [localRaceTime, setLocalRaceTime] = useState(24 * 3600);
    const [localStintTime, setLocalStintTime] = useState(0);
    
    // --- CORRECTION DANS L'ÉTAT INITIAL ---
    const [gameState, setGameState] = useState<GameState>({
        currentStint: 0,
        raceTime: 24 * 60 * 60,
        stintDuration: 0,
        isRaceRunning: false,
        trackName: "WAITING...",
        sessionType: "-",
        weather: "SUNNY",
        airTemp: 25,
        trackWetness: 0,
        fuelCons: 3.65,
        veCons: 2.5,
        tankCapacity: 105,
        raceDurationHours: 24,
        avgLapTimeSeconds: 210,
        isEmergency: false,
        drivers: [{id: 1, name: "Driver 1", color: '#3b82f6'}],
        activeDriverId: 1,
        incidents: [],
        chatMessages: [],
        stintNotes: {},
        stintAssignments: {},
        position: 0,
        telemetry: {
            throttle: 0, brake: 0, speed: 0, rpm: 0, maxRpm: 8000,
            waterTemp: 0, oilTemp: 0, laps: 0,
            fuel: { current: 0, max: 100, lastLapCons: 0, averageCons: 0 },
            virtualEnergy: 0, batterySoc: 0,
            virtualEnergyLastLapCons: 0, virtualEnergyAvgCons: 0,
            tires: { fl: 100, fr: 100, rl: 100, rr: 100 },
            
            // --- AJOUT OBLIGATOIRE ICI ---
            tireCompounds: { fl: "---", fr: "---", rl: "---", rr: "---" },
            // -----------------------------
            
            brakeTemps: { flc: 0, frc: 0, rlc: 0, rrc: 0 },
            tireTemps: { flc: 0, frc: 0, rlc: 0, rrc: 0 },
            currentLapTimeSeconds: 0, last3LapAvgSeconds: 0,
            strategyEstPitTime: 0, inPitLane: false, inGarage: true,
        },
        stintVirtualEnergy: {}
    });

    const syncUpdate = (data: Partial<GameState>) => {
        if (!db) return;
        updateDoc(doc(db, "strategies", SESSION_ID), data).catch(e => console.error("Update Error", e));
    };

    useEffect(() => {
        if (!db || !teamId) return;
        
        const docRef = doc(db, "strategies", SESSION_ID);
        
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                let adjustedRaceTime = data.sessionTimeRemainingSeconds;

                if (data.isRaceRunning && data.lastPacketTime) {
                    const now = Date.now();
                    const timeDiffSeconds = (now - data.lastPacketTime) / 1000;
                    if (timeDiffSeconds > 0 && timeDiffSeconds < 86400) {
                        adjustedRaceTime = Math.max(0, data.sessionTimeRemainingSeconds - timeDiffSeconds);
                    }
                }

                setGameState(prev => {
                    const liveTelemetry = {
                        ...prev.telemetry,
                        ...data, 
                        fuel: data.fuelRemainingL !== undefined ? {
                            current: data.fuelRemainingL,
                            max: data.fuelTankCapacityL || prev.telemetry.fuel.max,
                            averageCons: data.averageConsumptionFuel || 0,
                            lastLapCons: data.lastLapFuelConsumption ?? prev.telemetry.fuel.lastLapCons
                        } : prev.telemetry.fuel,
                        
                        tires: {
                            fl: data.tireWearFL ?? prev.telemetry.tires.fl,
                            fr: data.tireWearFR ?? prev.telemetry.tires.fr,
                            rl: data.tireWearRL ?? prev.telemetry.tires.rl,
                            rr: data.tireWearRR ?? prev.telemetry.tires.rr,
                        },

                        // Le crash venait probablement d'ici si vous utilisiez 'prev.telemetry.tireCompounds'
                        // alors que c'était undefined
                        tireCompounds: {
                            fl: data.tireCompoundFL ?? prev.telemetry.tireCompounds.fl,
                            fr: data.tireCompoundFR ?? prev.telemetry.tireCompounds.fr,
                            rl: data.tireCompoundRL ?? prev.telemetry.tireCompounds.rl,
                            rr: data.tireCompoundRR ?? prev.telemetry.tireCompounds.rr,
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
                        
                        laps: data.currentLap ?? prev.telemetry.laps,
                        speed: data.speedKmh ?? prev.telemetry.speed,
                        throttle: data.throttle ?? 0,
                        brake: data.brake ?? 0,
                        rpm: data.rpm ?? 0,
                        maxRpm: data.maxRpm ?? 8000,
                        waterTemp: data.waterTemp ?? 0,
                        oilTemp: data.oilTemp ?? 0,
                        inGarage: data.inGarage ?? false,
                        inPitLane: data.inPitLane ?? false
                    };

                    return {
                        ...prev,
                        ...data,
                        telemetry: liveTelemetry,
                        drivers: data.drivers || prev.drivers,
                        incidents: data.incidents || prev.incidents
                    };
                });

                if (data.isRaceRunning && typeof adjustedRaceTime === 'number') {
                    setLocalRaceTime(adjustedRaceTime);
                }
                setStatus("LIVE DATA");
            } else {
                setDoc(docRef, { 
                    createdAt: new Date(),
                    trackName: "WAITING FOR CONNECTION..." 
                }, { merge: true });
                setStatus("WAITING BRIDGE");
            }
        }, (error) => {
            console.error("Erreur Firebase:", error);
            setStatus("ERROR");
        });

        return () => unsubscribe();
    }, [teamId]);

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

    const strategyData: StrategyData = useMemo(() => {
        const activeDriver = getSafeDriver(gameState.drivers.find(d => d.id === gameState.activeDriverId));
        const activeLapTime = Math.max(1, gameState.telemetry.last3LapAvgSeconds || gameState.avgLapTimeSeconds || 210);
        const activeFuelCons = Math.max(0.1, gameState.telemetry.fuel.averageCons || gameState.fuelCons);
        const activeVECons = Math.max(0.1, gameState.telemetry.virtualEnergyAvgCons || gameState.veCons);
        const tankCapacity = Math.max(1, gameState.telemetry.fuel.max || gameState.tankCapacity);

        const lapsPerTank = Math.floor(tankCapacity / activeFuelCons);
        const lapsPerVE = Math.floor(100 / activeVECons);
        
        const useVE = isHypercar || isLMGT3;
        const lapsPerStint = Math.max(1, useVE ? lapsPerVE : lapsPerTank);
        
        const lapsRemaining = Math.max(1, Math.ceil(localRaceTime / activeLapTime));
        const currentLap = gameState.telemetry.laps;
        const totalLapsTarget = currentLap + lapsRemaining;

        const stints: Stint[] = [];
        const currentStintIndex = gameState.currentStint;

        const avgPastStintLen = currentStintIndex > 0 ? Math.max(0, currentLap - (lapsPerStint * 0.5)) / currentStintIndex : lapsPerStint;
        for (let i = 0; i < currentStintIndex; i++) {
            let driverId = gameState.stintAssignments[i];
            if (!driverId) driverId = gameState.drivers[i % gameState.drivers.length]?.id;
            const d = getSafeDriver(gameState.drivers.find(drv => drv.id === driverId));
            
            stints.push({
                id: i, stopNum: i + 1, startLap: Math.floor(i * avgPastStintLen), endLap: Math.floor((i + 1) * avgPastStintLen),
                fuel: "DONE", driver: d, driverId: d.id, isCurrent: false, isNext: false, isDone: true, note: "Done", lapsCount: Math.floor(avgPastStintLen)
            });
        }

        stints.push({
            id: currentStintIndex, stopNum: currentStintIndex + 1, startLap: currentLap, endLap: currentLap + lapsPerStint,
            fuel: "CURRENT", driver: activeDriver, driverId: activeDriver.id, isCurrent: true, isNext: false, isDone: false, note: "NOW", lapsCount: lapsPerStint
        });

        let lapCounter = currentLap + lapsPerStint;
        let nextIdx = currentStintIndex + 1;
        let safetyBreak = 0;
        while(lapCounter < totalLapsTarget && safetyBreak < 200) {
            let dId = gameState.stintAssignments[nextIdx];
            if (!dId) {
                const prevDId = stints[stints.length-1].driverId;
                const prevDIdx = gameState.drivers.findIndex(d => d.id === prevDId);
                dId = gameState.drivers[(prevDIdx + 1) % gameState.drivers.length]?.id;
            }
            const d = getSafeDriver(gameState.drivers.find(drv => drv.id === dId));
            const isLast = (lapCounter + lapsPerStint) >= totalLapsTarget;
            const lapsThisStint = isLast ? (totalLapsTarget - lapCounter) : lapsPerStint;
            const safeLapsThisStint = Math.max(1, lapsThisStint);

            stints.push({
                id: nextIdx, stopNum: nextIdx + 1, startLap: lapCounter, endLap: lapCounter + safeLapsThisStint,
                fuel: isLast ? ((safeLapsThisStint+1)*activeFuelCons).toFixed(1)+"L" : (useVE ? "NRG RESET" : "FULL"), 
                driver: d, driverId: dId, isCurrent: false, isNext: nextIdx === currentStintIndex + 1, isDone: false, note: isLast ? "FINISH" : "BOX", lapsCount: safeLapsThisStint
            });
            lapCounter += safeLapsThisStint;
            nextIdx++;
            safetyBreak++;
        }

        return { stints, totalLaps: totalLapsTarget, lapsPerTank: lapsPerStint, activeCons: activeFuelCons, activeLapTime, pitStopsRemaining: Math.max(0, stints.length - 1 - currentStintIndex) };
    }, [gameState, localRaceTime, isHypercar, isLMGT3, isLMP3, isLMP2ELMS]);

    const confirmPitStop = () => {
        const nextStint = gameState.currentStint + 1;
        const newAssignments = { ...gameState.stintAssignments, [gameState.currentStint]: gameState.activeDriverId };
        let nextDriverId = gameState.stintAssignments[nextStint];
        if (!nextDriverId && gameState.drivers.length > 0) {
             const currentIdx = gameState.drivers.findIndex(d => d.id === gameState.activeDriverId);
             nextDriverId = gameState.drivers[(currentIdx + 1) % gameState.drivers.length].id;
        }
        syncUpdate({ currentStint: nextStint, activeDriverId: nextDriverId, stintDuration: 0, stintAssignments: newAssignments });
        setLocalStintTime(0);
    };

    const undoPitStop = () => {
        if (gameState.currentStint > 0) {
            const prevStint = gameState.currentStint - 1;
            const prevDriverId = gameState.stintAssignments[prevStint] || gameState.drivers[0].id;
            syncUpdate({ currentStint: prevStint, activeDriverId: prevDriverId });
        }
    };

    const resetRace = () => {
        const initialRaceTime = gameState.raceDurationHours * 3600;
        syncUpdate({ 
            isRaceRunning: false, raceTime: initialRaceTime, stintDuration: 0, currentStint: 0, 
            activeDriverId: gameState.drivers[0]?.id || 1, incidents: [], chatMessages: [], stintAssignments: {}, stintNotes: {} 
        });
        setLocalRaceTime(initialRaceTime);
        setLocalStintTime(0);
    };

    return {
        gameState, syncUpdate, status, localRaceTime, localStintTime, strategyData,
        confirmPitStop, undoPitStop, resetRace, db, CHAT_ID,
        isHypercar, isLMGT3, isLMP3, isLMP2ELMS
    };
};
import { useState, useEffect, useMemo } from 'react'; 
import { doc, onSnapshot, updateDoc, arrayUnion, setDoc } from "firebase/firestore"; 
import { db } from '../lib/firebase';
import type { GameState, StrategyData, Stint } from '../types';
import { getSafeDriver } from '../utils/helpers';

export const useRaceData = (teamId: string) => {
    const SESSION_ID = teamId; 
    const CHAT_ID = "global-radio"; 
    
    const [gameState, setGameState] = useState<GameState>({
        currentStint: 0,
        raceTime: 24 * 3600,
        sessionTimeRemaining: 0,
        stintDuration: 0,
        isRaceRunning: false,
        trackName: "WAITING...",
        sessionType: "-",
        weather: "SUNNY",
        airTemp: 25, trackTemp: 25, trackWetness: 0, rainIntensity: 0,
        fuelCons: 3.65, veCons: 2.5, tankCapacity: 105,
        raceDurationHours: 24, avgLapTimeSeconds: 210,
        drivers: [{id: 1, name: "Driver 1", color: '#3b82f6'}],
        activeDriverId: 1,
        incidents: [], chatMessages: [], stintNotes: {}, stintAssignments: {}, position: 0,
        telemetry: {
            laps: 0, curLap: 0, lastLap: 0, bestLap: 0, position: 0, speed: 0, rpm: 0, maxRpm: 8000, gear: 0,
            throttle: 0, brake: 0, clutch: 0, steering: 0, waterTemp: 0, oilTemp: 0,
            fuel: { current: 0, max: 100, lastLapCons: 0, averageCons: 0 },
            VE: { VEcurrent: 100, VElastLapCons: 0, VEaverageCons: 0 },
            batterySoc: 0,
            tires: { fl: 100, fr: 100, rl: 100, rr: 100 },
            tirePressures: { fl: 0, fr: 0, rl: 0, rr: 0 },
            tireTemps: { flc: 0, frc: 0, rlc: 0, rrc: 0 },
            brakeTemps: { flc: 0, frc: 0, rlc: 0, rrc: 0 },
            tireCompounds: { fl: "---", fr: "---", rl: "---", rr: "---" },
            leaderLaps: 0, leaderAvgLapTime: 0, strategyEstPitTime: 0,
            inPitLane: false, inGarage: true, pitLimiter: false, damageIndex: 0, isOverheating: false
        }
    });

    const [status, setStatus] = useState("CONNECTING...");
    const [localRaceTime, setLocalRaceTime] = useState(24 * 3600);
    const [localStintTime, setLocalStintTime] = useState(0);

    const tId = teamId.toLowerCase();
    const isHypercar = tId.includes('hyper') || tId.includes('red');
    const isLMGT3 = tId.includes('gt3') || tId.includes('lmgt3');
    const isLMP3 = tId.includes('lmp3');
    const isLMP2ELMS = tId.includes('elms');

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
                
                const tele = data.telemetry || {};
                const scoring = data.scoring || {};
                const pit = data.pit || {};
                const weather = data.weather_det || {};
                const rules = data.rules || {};
                const extended = data.extended || {};

                let sessionTimeRem = scoring.time?.end - scoring.time?.current;
                if (isNaN(sessionTimeRem) || sessionTimeRem < 0) sessionTimeRem = data.sessionTimeRemainingSeconds || 0;

                setGameState(prev => {
                    // Sécurisation
                    const tireWear = tele.tires?.wear || [0,0,0,0];
                    const tirePress = tele.tires?.press || [0,0,0,0];
                    // Température pneus: [FL, FR, RL, RR] (Tableau simple car corrigé dans le bridge)
                    const tTemps = tele.tires?.temp || [0,0,0,0]; 
                    
                    let lLaps = prev.telemetry.leaderLaps;
                    let lAvg = prev.telemetry.leaderAvgLapTime;
                    if (scoring.vehicles && Array.isArray(scoring.vehicles)) {
                        const leader = scoring.vehicles.find((v: any) => v.position === 1);
                        if (leader) {
                            lLaps = leader.laps;
                            if (leader.best_lap > 0) lAvg = leader.best_lap * 1.05; 
                        }
                    }

                    const newTelemetry = {
                        laps: tele.laps || scoring.vehicle_data?.laps || prev.telemetry.laps,
                        curLap: tele.times?.current || 0,
                        lastLap: scoring.vehicle_data?.last_lap || prev.telemetry.lastLap,
                        bestLap: scoring.vehicle_data?.best_lap || prev.telemetry.bestLap,
                        position: scoring.vehicle_data?.position || prev.telemetry.position,
                        
                        speed: tele.speed || 0, 
                        rpm: tele.rpm || 0, 
                        maxRpm: 8000, 
                        gear: tele.gear || 0,
                        
                        throttle: tele.inputs?.thr || 0, 
                        brake: tele.inputs?.brk || 0, 
                        clutch: tele.inputs?.clt || 0, 
                        steering: tele.inputs?.str || 0,
                        
                        waterTemp: tele.temps?.water || 0, 
                        oilTemp: tele.temps?.oil || 0,
                        
                        fuel: { 
                            current: tele.fuel || 0, 
                            max: tele.fuelCapacity || prev.telemetry.fuel.max, 
                            lastLapCons: data.lastLapFuelConsumption || 0, 
                            // Correction ici: on prend la moyenne envoyée ou la conso de base
                            averageCons: data.averageConsumptionFuel || prev.fuelCons 
                        },
                        VE: { 
                            VEcurrent: (tele.electric?.charge || 0) * 100, 
                            VElastLapCons: 0, 
                            VEaverageCons: 0 
                        },
                        batterySoc: (tele.electric?.charge || 0) * 100,

                        tires: { 
                            fl: (1-(tireWear[0]||0))*100, fr: (1-(tireWear[1]||0))*100, 
                            rl: (1-(tireWear[2]||0))*100, rr: (1-(tireWear[3]||0))*100 
                        },
                        tirePressures: { 
                            fl: tirePress[0]||0, fr: tirePress[1]||0, rl: tirePress[2]||0, rr: tirePress[3]||0 
                        },
                        // Correction ici pour lire le tableau simple [FL, FR, RL, RR]
                        tireTemps: { 
                            flc: tTemps[0]||0, frc: tTemps[1]||0, 
                            rlc: tTemps[2]||0, rrc: tTemps[3]||0 
                        },
                        brakeTemps: { 
                            flc: tele.tires?.brake_temp?.[0]||0, frc: tele.tires?.brake_temp?.[1]||0, 
                            rlc: tele.tires?.brake_temp?.[2]||0, rrc: tele.tires?.brake_temp?.[3]||0 
                        },
                        tireCompounds: { fl: "---", fr: "---", rl: "---", rr: "---" },

                        leaderLaps: lLaps, leaderAvgLapTime: lAvg,
                        strategyEstPitTime: pit.strategy?.time_min || 0,
                        inPitLane: scoring.vehicle_data?.in_pits || false,
                        inGarage: rules.my_status?.pits_open === false, 
                        pitLimiter: extended.pit_limit > 0, // Déduction
                        damageIndex: 0, isOverheating: false
                    };

                    return {
                        ...prev,
                        ...data,
                        isRaceRunning: scoring.time?.current > 0,
                        trackName: scoring.track || prev.trackName,
                        sessionType: String(scoring.time?.session || ""),
                        sessionTimeRemaining: sessionTimeRem,
                        weather: weather.rain_intensity > 0.1 ? "RAIN" : (weather.cloudiness > 0.5 ? "CLOUDY" : "SUNNY"),
                        airTemp: weather.ambient_temp || prev.airTemp,
                        trackWetness: scoring.weather?.wetness_path?.[1] * 100 || 0,
                        rainIntensity: weather.rain_intensity || 0,
                        telemetry: newTelemetry,
                        drivers: data.drivers || prev.drivers
                    };
                });
                
                if (sessionTimeRem > 0) setLocalRaceTime(sessionTimeRem);
                setStatus("LIVE DATA");
            } else {
                setDoc(docRef, { createdAt: new Date() }, { merge: true });
                setStatus("WAITING BRIDGE");
            }
        }, (err) => {
            console.error(err);
            setStatus("ERROR");
        });
        return () => unsubscribe();
    }, [teamId]);

    useEffect(() => {
        let interval: any;
        if (localRaceTime > 0) {
            interval = setInterval(() => {
                setLocalRaceTime(p => Math.max(0, p - 1));
                setLocalStintTime(p => p + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [localRaceTime]);

    const strategyData: StrategyData = useMemo(() => {
        const activeDriver = getSafeDriver(gameState.drivers.find(d => d.id === gameState.activeDriverId));
        
        let totalLapsTarget = 300;
        const leaderLaps = gameState.telemetry.leaderLaps || 0;
        const leaderAvg = gameState.telemetry.leaderAvgLapTime || 210;
        const myLaps = gameState.telemetry.laps || 0;
        const myAvg = gameState.avgLapTimeSeconds || 210;
        
        if (leaderLaps > 0 && leaderAvg > 0) {
            totalLapsTarget = Math.floor(leaderLaps + (localRaceTime / leaderAvg));
        } else {
            totalLapsTarget = Math.floor(myLaps + (localRaceTime / myAvg));
        }

        const useVE = isHypercar || isLMGT3;
        const activeFuelCons = Math.max(0.1, gameState.telemetry.fuel.averageCons || gameState.fuelCons);
        const activeVECons = Math.max(0.1, gameState.telemetry.VE.VEaverageCons || gameState.veCons);
        const tankCapacity = Math.max(1, gameState.telemetry.fuel.max || gameState.tankCapacity);

        const lapsPerTank = Math.floor(tankCapacity / activeFuelCons);
        const lapsPerVE = activeVECons > 0 ? Math.floor(100 / activeVECons) : 999;
        const lapsPerStint = Math.max(1, useVE ? Math.min(lapsPerVE, lapsPerTank) : lapsPerTank);

        const stints: Stint[] = [];
        const currentLap = gameState.telemetry.laps;
        const currentStintIndex = gameState.currentStint;

        for (let i = 0; i < currentStintIndex; i++) {
            let driverId = gameState.stintAssignments[i] || gameState.drivers[i % gameState.drivers.length]?.id;
            const d = getSafeDriver(gameState.drivers.find(drv => drv.id === driverId));
            stints.push({
                id: i, stopNum: i + 1, startLap: i * lapsPerStint, endLap: (i + 1) * lapsPerStint,
                lapsCount: lapsPerStint, fuel: "DONE", driver: d, driverId: d.id, 
                isCurrent: false, isNext: false, isDone: true, note: gameState.stintNotes[i+1] || ""
            });
        }

        stints.push({
            id: currentStintIndex, stopNum: currentStintIndex + 1, startLap: currentLap, 
            endLap: Math.min(totalLapsTarget, (currentStintIndex + 1) * lapsPerStint),
            lapsCount: lapsPerStint, fuel: "CURRENT", driver: activeDriver, driverId: activeDriver.id,
            isCurrent: true, isNext: false, isDone: false, note: gameState.stintNotes[currentStintIndex+1] || ""
        });

        let nextStartLap = (currentStintIndex + 1) * lapsPerStint;
        let nextIdx = currentStintIndex + 1;
        
        while (nextStartLap < totalLapsTarget) {
            let driverId = gameState.stintAssignments[nextIdx];
            if (!driverId && gameState.drivers.length > 0) {
                const prevDriverId = stints[stints.length - 1].driverId;
                const prevIdx = gameState.drivers.findIndex(d => d.id === prevDriverId);
                driverId = gameState.drivers[(prevIdx + 1) % gameState.drivers.length].id;
            }
            const d = getSafeDriver(gameState.drivers.find(drv => drv.id === driverId));
            const isLast = (nextStartLap + lapsPerStint) >= totalLapsTarget;
            const lapsThisStint = isLast ? (totalLapsTarget - nextStartLap) : lapsPerStint;

            let fuelInfo = "FULL";
            if (useVE) fuelInfo = "NRG RESET";
            if (isLast) fuelInfo = (lapsThisStint * activeFuelCons).toFixed(1) + "L";

            stints.push({
                id: nextIdx, stopNum: nextIdx + 1, startLap: Math.floor(nextStartLap), 
                endLap: Math.floor(nextStartLap + lapsThisStint), lapsCount: Math.floor(lapsThisStint),
                fuel: fuelInfo, driver: d, driverId: d.id, isCurrent: false, isNext: nextIdx === currentStintIndex + 1, 
                isDone: false, note: gameState.stintNotes[nextIdx+1] || ""
            });

            nextStartLap += lapsPerStint;
            nextIdx++;
            if (nextIdx > 100) break;
        }

        return { stints, totalLaps: totalLapsTarget, lapsPerTank: lapsPerStint, activeFuelCons, activeVECons, activeLapTime: myAvg, pitStopsRemaining: Math.max(0, stints.length - 1 - currentStintIndex) };
    }, [gameState, localRaceTime, isHypercar, isLMGT3]);

    const confirmPitStop = () => {
        const nextStint = gameState.currentStint + 1;
        const newAssign = { ...gameState.stintAssignments, [gameState.currentStint]: gameState.activeDriverId };
        let nextDriverId = gameState.stintAssignments[nextStint];
        if (!nextDriverId && gameState.drivers.length > 0) {
             const currentIdx = gameState.drivers.findIndex(d => d.id === gameState.activeDriverId);
             nextDriverId = gameState.drivers[(currentIdx + 1) % gameState.drivers.length].id;
        }
        syncUpdate({ currentStint: nextStint, activeDriverId: nextDriverId, stintDuration: 0, stintAssignments: newAssign });
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
        syncUpdate({ 
            isRaceRunning: false, raceTime: gameState.raceDurationHours * 3600, stintDuration: 0, currentStint: 0, 
            activeDriverId: gameState.drivers[0]?.id || 1, incidents: [], chatMessages: [], stintAssignments: {}, stintNotes: {} 
        });
        setLocalStintTime(0);
    };

    return {
        gameState, syncUpdate, status, localRaceTime, localStintTime, strategyData,
        confirmPitStop, undoPitStop, resetRace, db, CHAT_ID, isHypercar, isLMGT3, isLMP3, isLMP2ELMS
    };
};
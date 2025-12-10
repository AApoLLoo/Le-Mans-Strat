import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, StrategyData, Stint, TelemetryData, LapData } from '../types';
import { getSafeDriver } from '../utils/helpers';

// Adresse de votre VPS OVH
const VPS_URL = "http://51.178.87.25:5000";

export const useRaceData = (teamId: string) => {
    const SESSION_ID = teamId;
    const CHAT_ID = "global-radio";

    const [manualFuelTarget, setManualFuelTarget] = useState<number | null>(null);
    const [manualVETarget, setManualVETarget] = useState<number | null>(null);

    // --- ÉTAT INITIAL (VOTRE ANCIEN CODE) ---
    const [gameState, setGameState] = useState<GameState>({
        currentStint: 0,
        raceTime: 24 * 3600,
        sessionTimeRemaining: 0,
        stintDuration: 0,
        isRaceRunning: false,
        trackName: "WAITING...",
        sessionType: "-",
        weather: "SUNNY",
        trackMap: [],
        // NOUVEAUX ETATS FLAGS
        scActive: false,
        yellowFlag: false,
        isRain: false,

        weatherForecast: [],
        allVehicles: [],
        lapHistory: [],
        stintConfig: {},

        airTemp: 25, trackTemp: 25, trackWetness: 0, rainIntensity: 0,
        fuelCons: 3.65, veCons: 2.5, tankCapacity: 105,
        raceDurationHours: 24, avgLapTimeSeconds: 210,
        drivers: [{id: 1, name: "Driver 1", color: '#3b82f6'}],
        activeDriverId: 1,
        incidents: [], chatMessages: [], stintNotes: {}, stintAssignments: {}, position: 0,
        telemetry: {
            laps: 0, curLap: 0, lastLap: 0, bestLap: 0, position: 0, speed: 0, rpm: 0, maxRpm: 8000, gear: 0,
            carCategory: "Unknown",
            throttle: 0, brake: 0, clutch: 0, steering: 0, waterTemp: 0, oilTemp: 0,
            fuel: { current: 0, max: 100, lastLapCons: 0, averageCons: 0 },
            VE: { VEcurrent: 100, VElastLapCons: 0, VEaverageCons: 0 },
            batterySoc: 0,
            electric: { charge: 0, torque: 0, rpm: 0, motorTemp: 0, waterTemp: 0, state: 0 },
            tires: { fl: 100, fr: 100, rl: 100, rr: 100 },
            tirePressures: { fl: 0, fr: 0, rl: 0, rr: 0 },
            tireTemps: { fl: [], fr: [], rl: [], rr: [] },
            brakeTemps: { flc: 0, frc: 0, rlc: 0, rrc: 0 },
            tireCompounds: { fl: "---", fr: "---", rl: "---", rr: "---" },
            leaderLaps: 0, leaderAvgLapTime: 0,
            strategyEstPitTime: 0, strategyPitFuel: 0, strategyPitLaps: 0,
            inPitLane: false, inGarage: true, pitLimiter: false, damageIndex: 0, isOverheating: false
        }
    });

    const [status, setStatus] = useState("CONNECTING...");
    const [localRaceTime, setLocalRaceTime] = useState(24 * 3600);
    const [localStintTime, setLocalStintTime] = useState(0);

    const lastProcessedLapRef = useRef<number>(-1);
    const prevStatusRef = useRef({ inPit: false, sc: false, yellow: false, rain: false });

    // Référence pour garder la socket active
    const socketRef = useRef<Socket | null>(null);

    const tId = teamId.toLowerCase();
    const isHypercar = tId.includes('hyper') || tId.includes('red');
    const isLMGT3 = tId.includes('gt3') || tId.includes('lmgt3');
    const isLMP3 = tId.includes('lmp3');
    const isLMP2ELMS = tId.includes('elms');

    // --- NOUVELLE FONCTION DE SYNCHRONISATION (VERS LE VPS) ---
    const syncUpdate = useCallback((changes: Partial<GameState>) => {
        // 1. Mise à jour locale immédiate (Optimistic UI)
        setGameState(prev => ({ ...prev, ...changes }));

        // 2. Envoi au VPS pour sauvegarde DB et diffusion aux autres
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('update_strategy', {
                teamId: SESSION_ID,
                changes: changes
            });
        }
    }, [SESSION_ID]);

    // --- LOGIQUE DE TRAITEMENT DES DONNÉES (VOTRE ANCIEN CODE ADAPTÉ) ---
    const processGameUpdate = useCallback((prev: GameState, docData: Partial<GameState> & Record<string, unknown>): GameState => {
        const tele = (docData.telemetry || {}) as any;
        const scoring = (docData.scoring || {}) as any;
        const pit = (docData.pit || {}) as any;
        const weather = (docData.weather_det || {}) as any;
        const rules = (docData.rules || {}) as any;
        const extended = (docData.extended || {}) as any;

        let sessionTimeRem = Number((scoring.time?.end ?? 0) - (scoring.time?.current ?? 0));
        if (isNaN(sessionTimeRem) || sessionTimeRem < 0) sessionTimeRem = Number(docData.sessionTimeRemainingSeconds || 0);

        const tireWear = tele.tires?.wear || [0,0,0,0];
        const tirePress = tele.tires?.press || [0,0,0,0];
        const tTemps = tele.tires?.temp || {};
        const elec = tele.electric || {};

        let lLaps = prev.telemetry.leaderLaps;
        let lAvg = prev.telemetry.leaderAvgLapTime;
        if (Array.isArray(scoring.vehicles)) {
            const leader = (scoring.vehicles as any[]).find((v) => (v.position ?? 0) === 1);
            if (leader) {
                lLaps = leader.laps ?? lLaps;
                if ((leader.best_lap ?? 0) > 0) lAvg = (leader.best_lap ?? 0) * 1.05;
            }
        }

        const rawVE = tele.virtual_energy;
        let currentVEValue = 0;
        if (rawVE !== undefined && rawVE !== null) {
            currentVEValue = Number(rawVE);
        } else {
            currentVEValue = Number(elec.charge || 0) * 100;
        }

        const scActive = Boolean(rules.sc?.active);
        const yellowFlag = Boolean(scoring.flags?.yellow_global);
        const isRain = (weather.rain_intensity ?? 0) > 0.1;

        // Détection si c'est un packet de télémétrie ou juste une update de strat
        const hasNewTelemetry = tele.speed !== undefined || scoring.vehicle_data !== undefined;

        const newTelemetry: TelemetryData = hasNewTelemetry ? {
            ...prev.telemetry,
            laps: Number(tele.laps || scoring.vehicle_data?.laps || prev.telemetry.laps),
            curLap: Number(tele.times?.current || prev.telemetry.curLap),
            lastLap: Number(scoring.vehicle_data?.last_lap || prev.telemetry.lastLap),
            bestLap: Number(scoring.vehicle_data?.best_lap || prev.telemetry.bestLap),
            position: Number(scoring.vehicle_data?.position || prev.telemetry.position),
            speed: Number(tele.speed || prev.telemetry.speed),
            rpm: Number(tele.rpm || prev.telemetry.rpm),
            maxRpm: 8000,
            gear: Number(tele.gear !== undefined ? tele.gear : prev.telemetry.gear),
            carCategory: (Array.isArray(scoring.vehicles) ? scoring.vehicles[0]?.class : undefined) || prev.telemetry.carCategory,
            throttle: Number(tele.inputs?.thr !== undefined ? tele.inputs.thr : prev.telemetry.throttle),
            brake: Number(tele.inputs?.brk !== undefined ? tele.inputs.brk : prev.telemetry.brake),
            clutch: Number(tele.inputs?.clt !== undefined ? tele.inputs.clt : prev.telemetry.clutch),
            steering: Number(tele.inputs?.str !== undefined ? tele.inputs.str : prev.telemetry.steering),
            waterTemp: Number(tele.temps?.water || prev.telemetry.waterTemp),
            oilTemp: Number(tele.temps?.oil || prev.telemetry.oilTemp),
            fuel: {
                current: Number(tele.fuel || prev.telemetry.fuel.current),
                max: Number(tele.fuelCapacity || prev.telemetry.fuel.max),
                lastLapCons: Number(docData.lastLapFuelConsumption || prev.telemetry.fuel.lastLapCons),
                averageCons: Number(docData.averageConsumptionFuel || prev.fuelCons)
            },
            VE: {
                VEcurrent: currentVEValue,
                VElastLapCons: Number(docData.lastLapVEConsumption || prev.telemetry.VE.VElastLapCons),
                VEaverageCons: Number(docData.averageConsumptionVE || prev.veCons)
            },
            batterySoc: Number(elec.charge || prev.telemetry.batterySoc/100) * 100,
            electric: {
                charge: Number(elec.charge || prev.telemetry.electric.charge),
                torque: Number(elec.torque || prev.telemetry.electric.torque),
                rpm: Number(elec.rpm || prev.telemetry.electric.rpm),
                motorTemp: Number(elec.temp_motor || prev.telemetry.electric.motorTemp),
                waterTemp: Number(elec.temp_water || prev.telemetry.electric.waterTemp),
                state: Number(elec.state || prev.telemetry.electric.state)
            },
            tires: {
                fl: (tireWear[0] !== undefined ? tireWear[0]*100 : prev.telemetry.tires.fl),
                fr: (tireWear[1] !== undefined ? tireWear[1]*100 : prev.telemetry.tires.fr),
                rl: (tireWear[2] !== undefined ? tireWear[2]*100 : prev.telemetry.tires.rl),
                rr: (tireWear[3] !== undefined ? tireWear[3]*100 : prev.telemetry.tires.rr)
            },
            tirePressures: {
                fl: Number(tirePress[0]||prev.telemetry.tirePressures.fl),
                fr: Number(tirePress[1]||prev.telemetry.tirePressures.fr),
                rl: Number(tirePress[2]||prev.telemetry.tirePressures.rl),
                rr: Number(tirePress[3]||prev.telemetry.tirePressures.rr)
            },
            tireTemps: { fl: tTemps.fl || prev.telemetry.tireTemps.fl, fr: tTemps.fr || prev.telemetry.tireTemps.fr, rl: tTemps.rl || prev.telemetry.tireTemps.rl, rr: tTemps.rr || prev.telemetry.tireTemps.rr },
            brakeTemps: {
                flc: Number(tele.tires?.brake_temp?.[0]||prev.telemetry.brakeTemps.flc),
                frc: Number(tele.tires?.brake_temp?.[1]||prev.telemetry.brakeTemps.frc),
                rlc: Number(tele.tires?.brake_temp?.[2]||prev.telemetry.brakeTemps.rlc),
                rrc: Number(tele.tires?.brake_temp?.[3]||prev.telemetry.brakeTemps.rrc)
            },
            tireCompounds: tele.tires?.compounds || prev.telemetry.tireCompounds,
            leaderLaps: lLaps, leaderAvgLapTime: lAvg,
            strategyEstPitTime: Number(pit.strategy?.time_min || prev.telemetry.strategyEstPitTime),
            strategyPitFuel: Number(pit.strategy?.fuel_to_add || prev.telemetry.strategyPitFuel),
            strategyPitLaps: Number(pit.strategy?.laps_to_add || prev.telemetry.strategyPitLaps),
            inPitLane: Boolean(scoring.vehicle_data?.in_pits ?? prev.telemetry.inPitLane),
            inGarage: (rules.my_status?.pits_open === false),
            pitLimiter: (extended.pit_limit ?? 0) > 0,
        } : prev.telemetry;

        return {
            ...prev,
            ...docData, // Écrase les champs de base (ex: drivers, incidents) s'ils sont présents dans le payload

            weatherForecast: (docData.weatherForecast as any[]) || prev.weatherForecast || [],
            allVehicles: (scoring.vehicles as import('../types').RawVehicle[]) || prev.allVehicles || [],
            lapHistory: (docData.lapHistory as LapData[]) || prev.lapHistory || [],
            stintConfig: (docData.stintConfig as Record<string, import('../types').StintConfig>) || prev.stintConfig || {},
            stintNotes: (docData.stintNotes as Record<string, string>) || prev.stintNotes || {},
            trackMap: (docData.trackMap as MapPoint[]) || prev.trackMap || [],

            scActive: rules.sc ? scActive : prev.scActive,
            yellowFlag: scoring.flags ? yellowFlag : prev.yellowFlag,
            isRain: weather.rain_intensity ? isRain : prev.isRain,

            isRaceRunning: scoring.time ? Boolean((scoring.time?.current ?? 0) > 0) : prev.isRaceRunning,
            trackName: scoring.track || prev.trackName,
            sessionType: scoring.time ? String(scoring.time?.session || "") : prev.sessionType,
            sessionTimeRemaining: sessionTimeRem > 0 ? sessionTimeRem : prev.sessionTimeRemaining,
            weather: weather.rain_intensity ? ((weather.rain_intensity ?? 0) > 0.1 ? "RAIN" : ((weather.cloudiness ?? 0) > 0.5 ? "CLOUDY" : "SUNNY")) : prev.weather,
            airTemp: (weather.ambient_temp ?? prev.airTemp),
            trackWetness: scoring.weather ? ((scoring.weather?.wetness_path?.[1] ?? 0) * 100) : prev.trackWetness,
            rainIntensity: (weather.rain_intensity ?? prev.rainIntensity),

            telemetry: newTelemetry,
            drivers: docData.drivers || prev.drivers
        };
    }, []);

    // --- CONNEXION SOCKET.IO (REMPLACE SUPABASE) ---
    useEffect(() => {
        console.log("🔌 Initialisation Socket.IO vers VPS:", VPS_URL);
        const socket = io(VPS_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 10
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("✅ CONNECTÉ AU VPS !");
            setStatus("LIVE (VPS)");
            // On demande à rejoindre la session pour recevoir l'état actuel (BDD)
            socket.emit('join_session', SESSION_ID);
        });

        socket.on('disconnect', () => {
            console.log("⚠️ DÉCONNECTÉ DU VPS");
            setStatus("RECONNECTING...");
        });

        // 1. Réception Télémétrie Rapide (Broadcast du Python)
        socket.on('race_update', (data) => {
            setGameState(prev => processGameUpdate(prev, data));
        });

        // 2. Réception Mise à jour Stratégie (Venant de la BDD ou d'un autre ingé)
        socket.on('strategy_update', (changes) => {
            console.log("Mise à jour stratégie reçue:", changes);
            // On fusionne simplement car processGameUpdate est surtout pour la télémétrie complexe
            // Mais on peut utiliser processGameUpdate si les données sont structurées pareil
            setGameState(prev => processGameUpdate(prev, changes));
        });

        return () => {
            socket.disconnect();
        };
    }, [SESSION_ID, processGameUpdate]);

    // --- HISTORIQUE DES TOURS ---
    useEffect(() => {
        const currentLap = gameState.telemetry.laps;
        if (lastProcessedLapRef.current === -1 && currentLap > 0) {
            lastProcessedLapRef.current = currentLap;
            return;
        }
        if (currentLap > lastProcessedLapRef.current && lastProcessedLapRef.current > 0) {
            const lastLapData: LapData = {
                lapNumber: lastProcessedLapRef.current,
                lapTime: gameState.telemetry.lastLap,
                fuelUsed: gameState.telemetry.fuel.lastLapCons,
                veUsed: gameState.telemetry.VE.VElastLapCons,
                tireWearFL: gameState.telemetry.tires.fl,
                tireWearRL: gameState.telemetry.tires.rl,
                driverName: gameState.drivers.find(d => d.id === gameState.activeDriverId)?.name || "Unknown",
                compound: gameState.telemetry.tireCompounds.fl
            };
            const newHistory = [...gameState.lapHistory, lastLapData];
            syncUpdate({ lapHistory: newHistory });
        }
        if (currentLap > 0) lastProcessedLapRef.current = currentLap;
    }, [gameState.telemetry.laps]);

    // --- AUTO-LOGGING INCIDENTS ---
    useEffect(() => {
        if (!gameState.isRaceRunning) return;
        const current = { inPit: gameState.telemetry.inPitLane, sc: gameState.scActive, yellow: gameState.yellowFlag, rain: gameState.isRain };
        const prev = prevStatusRef.current;
        const newIncidents: import('../types').Incident[] = [];
        const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const lap = `L${gameState.telemetry.laps}`;

        if (current.inPit && !prev.inPit) newIncidents.push({ id: Date.now(), time, lap, text: "PIT ENTRY" });
        if (!current.inPit && prev.inPit) newIncidents.push({ id: Date.now(), time, lap, text: "PIT EXIT" });
        if (current.sc && !prev.sc) newIncidents.push({ id: Date.now()+1, time, lap, text: "⚠️ SAFETY CAR DEPLOYED" });
        if (!current.sc && prev.sc) newIncidents.push({ id: Date.now()+1, time, lap, text: "🟢 SC ENDING" });
        if (current.rain && !prev.rain) newIncidents.push({ id: Date.now()+3, time, lap, text: "🌧️ RAIN STARTED" });

        if (newIncidents.length > 0) {
            const updatedIncidents = [...newIncidents, ...gameState.incidents].slice(0, 50);
            syncUpdate({ incidents: updatedIncidents });
        }
        prevStatusRef.current = current;
    }, [gameState.telemetry.inPitLane, gameState.scActive, gameState.yellowFlag, gameState.isRain, gameState.isRaceRunning]);

    // --- TIMER LOCAL ---
    useEffect(() => {
        let interval: number | undefined;
        if (localRaceTime > 0) {
            interval = setInterval(() => {
                setLocalRaceTime(p => Math.max(0, p - 1));
                setLocalStintTime(p => p + 1);
                setGameState(prev => {
                    if (!prev.isRaceRunning) return prev;
                    const activeId = prev.activeDriverId;
                    const drivers = prev.drivers.map(d => {
                        if (d.id === activeId) return { ...d, totalDriveTime: (d.totalDriveTime || 0) + 1 };
                        return d;
                    });
                    return { ...prev, drivers };
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [localRaceTime]);

    // --- SAUVEGARDE DRIVERS PÉRIODIQUE ---
    useEffect(() => {
        const saveInterval = setInterval(() => {
            if (gameState.isRaceRunning) syncUpdate({ drivers: gameState.drivers });
        }, 30000);
        return () => clearInterval(saveInterval);
    }, [gameState.drivers, gameState.isRaceRunning]);

    // --- SAUVEGARDE CARTE ---
    const saveTrackMap = useCallback((points: MapPoint[]) => {
        if (points.length > 50) { syncUpdate({ trackMap: points }); }
    }, [SESSION_ID]);

    // --- CALCULATEUR STRATÉGIQUE (VOTRE LOGIQUE INTACTE) ---
    const strategyData: StrategyData = useMemo(() => {
        const activeDriver = getSafeDriver(gameState.drivers.find(d => d.id === gameState.activeDriverId));
        let totalLapsTarget = 300;
        const leaderLaps = gameState.telemetry.leaderLaps || 0;
        const leaderAvg = gameState.telemetry.leaderAvgLapTime || 210;
        const myLaps = gameState.telemetry.laps || 0;
        const myAvg = gameState.avgLapTimeSeconds || 210;
        if (leaderLaps > 0 && leaderAvg > 0) { totalLapsTarget = Math.floor(leaderLaps + (localRaceTime / leaderAvg)); }
        else if (myLaps > 0) { totalLapsTarget = Math.floor(myLaps + (localRaceTime / myAvg)); }

        const useVE = isHypercar || isLMGT3;
        const veStats = gameState.telemetry.VE || { VEcurrent: 0, VElastLapCons: 0, VEaverageCons: 0 };
        const currentVE = veStats.VEcurrent;
        const activeFuelCons = Math.max(0.1, gameState.telemetry.fuel.averageCons || gameState.fuelCons);
        const activeVECons = Math.max(0.1, veStats.VEaverageCons || gameState.veCons);
        const tankCapacity = Math.max(1, gameState.telemetry.fuel.max || gameState.tankCapacity);
        const lapsPerTank = Math.floor(tankCapacity / activeFuelCons);
        const lapsPerVE = activeVECons > 0 ? Math.floor(100 / activeVECons) : 999;
        const lapsPerStint = Math.max(1, useVE ? Math.min(lapsPerVE, lapsPerTank) : lapsPerTank);

        const stints: Stint[] = [];
        const currentLap = gameState.telemetry.laps;
        const currentStintIndex = gameState.currentStint;
        let targetFuelCons = activeFuelCons;
        let targetVECons = activeVECons;

        for (let i = 0; i < currentStintIndex; i++) {
            const driverId = gameState.stintAssignments[i] || gameState.drivers[i % gameState.drivers.length]?.id;
            const d = getSafeDriver(gameState.drivers.find(drv => drv.id === driverId));
            stints.push({ id: i, stopNum: i + 1, startLap: i * lapsPerStint, endLap: (i + 1) * lapsPerStint, lapsCount: lapsPerStint, fuel: "DONE", driver: d, driverId: d.id, isCurrent: false, isNext: false, isDone: true, note: String(gameState.stintNotes[i+1] || "") });
        }
        const currentStintEndLap = Math.min(totalLapsTarget, (currentStintIndex + 1) * lapsPerStint);
        stints.push({ id: currentStintIndex, stopNum: currentStintIndex + 1, startLap: currentLap, endLap: currentStintEndLap, lapsCount: lapsPerStint, fuel: "CURRENT", driver: activeDriver, driverId: activeDriver.id, isCurrent: true, isNext: false, isDone: false, note: String(gameState.stintNotes[currentStintIndex+1] || "") });

        const fuelRemaining = gameState.telemetry.fuel.current;
        const lapsRemainingInStint = Math.max(1, currentStintEndLap - currentLap);
        if (manualFuelTarget !== null) { targetFuelCons = manualFuelTarget; } else if (fuelRemaining > 0) { targetFuelCons = (fuelRemaining - 0.5) / lapsRemainingInStint; }
        if (manualVETarget !== null) { targetVECons = manualVETarget; } else if (currentVE > 0 && useVE) { targetVECons = (currentVE - 2.0) / lapsRemainingInStint; }

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
            stints.push({ id: nextIdx, stopNum: nextIdx + 1, startLap: Math.floor(nextStartLap), endLap: Math.floor(nextStartLap + lapsThisStint), lapsCount: Math.floor(lapsThisStint), fuel: fuelInfo, driver: d, driverId: d.id, isCurrent: false, isNext: nextIdx === currentStintIndex + 1, isDone: false, note: String(gameState.stintNotes[nextIdx+1] || "") });
            nextStartLap += lapsPerStint; nextIdx++; if (nextIdx > 100) break;
        }

        const pitLaneLoss = 28;
        const stationaryTime = gameState.telemetry.strategyEstPitTime > 0 ? gameState.telemetry.strategyEstPitTime : 35;
        const totalPitLoss = pitLaneLoss + stationaryTime;
        const myCarScoring = ((gameState as any).scoring?.vehicles || []).find((v: any) => v.is_player === 1 || v.id === gameState.telemetry.position);
        const myGapToLeader = myCarScoring ? Number(myCarScoring.gap_leader || 0) : 0;
        const myProjectedGap = myGapToLeader + totalPitLoss;
        let predictedPos = 1; let carAhead = null; let carBehind = null; let minGapAhead = 9999; let minGapBehind = 9999; let trafficCount = 0;
        const sortedVehicles = [...gameState.allVehicles].sort((a, b) => Number(a.gap_leader) - Number(b.gap_leader));
        for (let i = 0; i < sortedVehicles.length; i++) {
            const v = sortedVehicles[i];
            if (v.is_player) continue;
            const vGap = Number(v.gap_leader || 0);
            if (vGap < myProjectedGap) { predictedPos++; const gap = myProjectedGap - vGap; if (gap < minGapAhead) { minGapAhead = gap; carAhead = v.driver || v.name || `Car #${v.id}`; } }
            else { const gap = vGap - myProjectedGap; if (gap < minGapBehind) { minGapBehind = gap; carBehind = v.driver || v.name || `Car #${v.id}`; } }
            if (Math.abs(vGap - myProjectedGap) < 3.0) trafficCount++;
        }
        let trafficLevel: 'CLEAR' | 'BUSY' | 'TRAFFIC' = 'CLEAR';
        if (trafficCount >= 1) trafficLevel = 'BUSY';
        if (trafficCount >= 3) trafficLevel = 'TRAFFIC';
        const pitPrediction = { predictedPosition: predictedPos, carAhead, carBehind, gapToAhead: minGapAhead === 9999 ? 0 : minGapAhead, gapToBehind: minGapBehind === 9999 ? 0 : minGapBehind, trafficLevel };

        return { stints, totalLaps: totalLapsTarget, lapsPerTank, activeFuelCons, activeVECons, activeLapTime: myAvg, pitStopsRemaining: Math.max(0, stints.length - 1 - currentStintIndex), targetFuelCons, targetVECons, pitPrediction };
    }, [gameState, localRaceTime, isHypercar, isLMGT3, manualFuelTarget, manualVETarget]);

    // --- HELPER FUNCTIONS ---
    const confirmPitStop = () => {
        const nextStint = (gameState.currentStint || 0) + 1;
        let nextDriverId = gameState.stintAssignments[nextStint];
        if (!nextDriverId && gameState.drivers.length > 0) {
            const currentIdx = gameState.drivers.findIndex(d => d.id === gameState.activeDriverId);
            nextDriverId = gameState.drivers[(currentIdx + 1) % gameState.drivers.length].id;
        }
        syncUpdate({ currentStint: nextStint, activeDriverId: nextDriverId, stintDuration: 0 });
        setLocalStintTime(0);
    };

    const undoPitStop = () => {
        if(gameState.currentStint > 0) {
            const prevStint = gameState.currentStint - 1;
            const prevDriverId = gameState.stintAssignments[prevStint] || (gameState.drivers[0]?.id);
            syncUpdate({ currentStint: prevStint, activeDriverId: prevDriverId });
        }
    };

    const resetRace = () => {
        if(confirm("⚠️ RESET COMPLET ?")) {
            syncUpdate({
                isRaceRunning: false, raceTime: gameState.raceDurationHours*3600,
                stintDuration: 0, currentStint: 0, incidents: [], lapHistory: [],
                drivers: gameState.drivers.map(d => ({...d, totalDriveTime: 0})),
                stintConfig: {}, stintNotes: {}
            });
            setLocalRaceTime(gameState.raceDurationHours*3600);
            setLocalStintTime(0);
        }
    };

    const updateStintConfig = (index: number, key: keyof import('../types').StintConfig, value: any) => {
        const newConfig = { ...gameState.stintConfig };
        if (!newConfig[index]) newConfig[index] = {};
        newConfig[index] = { ...newConfig[index], [key]: value };
        syncUpdate({ stintConfig: newConfig });
    };

    return {
        gameState, syncUpdate, status, localRaceTime, localStintTime, strategyData,
        confirmPitStop, undoPitStop, resetRace, CHAT_ID, isHypercar, isLMGT3, isLMP3, isLMP2ELMS,
        setManualFuelTarget, setManualVETarget, updateStintConfig, saveTrackMap
    };
};
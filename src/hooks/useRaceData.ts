import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
    GameState, StrategyData, TelemetryData, LapData, MapPoint,
    RawTelemetry, RawScoring, RawPit, RawWeather, RawRules, RawExtended, ChatMessage
} from '../types';
import { getSafeDriver } from '../utils/helpers';

// Adresse de ton VPS API OVH
const VPS_URL = "https://api.racetelemetrybyfbt.com";

export const useRaceData = (teamId: string) => {
    const SESSION_ID = teamId;
    const CHAT_ID = "global-radio";

    const [manualFuelTarget, setManualFuelTarget] = useState<number | null>(null);
    const [manualVETarget, setManualVETarget] = useState<number | null>(null);

    // --- ÉTAT INITIAL ---
    const [gameState, setGameState] = useState<GameState>({
        currentStint: 0,
        raceTime: 24 * 3600,
        sessionTimeRemaining: 0,
        stintDuration: 0,
        isRaceRunning: false,
        trackName: "WAITING...",
        trackLength: 0,
        sessionType: "-",
        weather: "SUNNY",
        scActive: false,
        yellowFlag: false,
        isRain: false,
        trackMap: [],
        weatherForecast: [],
        allVehicles: [],
        lapHistory: [],
        stintConfig: {},
        airTemp: 25,
        trackTemp: 25,
        trackWetness: 0,
        rainIntensity: 0,
        fuelCons: 3.65,
        veCons: 2.5,
        tankCapacity: 105,
        raceDurationHours: 24,
        avgLapTimeSeconds: 0,
        drivers: [{id: 1, name: "Driver 1", color: '#3b82f6'}],
        activeDriverId: 1,
        incidents: [],
        chatMessages: [],
        stintNotes: {},
        stintAssignments: {},
        position: 0,
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
        },
        userRole: 'DRIVER' // Par défaut restrictif (sera mis à jour par le socket)
    });

    const [status, setStatus] = useState("CONNECTING...");
    const [localRaceTime, setLocalRaceTime] = useState(0);
    const [localStintTime, setLocalStintTime] = useState(0);
    const lastProcessedLapRef = useRef<number>(-1);
    const prevStatusRef = useRef({ inPit: false, sc: false, yellow: false, rain: false });
    const socketRef = useRef<Socket | null>(null);
    const currentTrackLoadedRef = useRef<string>("");

    // Helpers détection classe
    const tId = teamId.toLowerCase();
    const isHypercar = tId.includes('hyper');
    const isLMGT3 = tId.includes('gt3');
    const isLMP3 = tId.includes('lmp3');
    const isLMP2ELMS = tId.includes('elms');

    // --- LOGIQUE DE TRAITEMENT DES DONNÉES (inchangée) ---
    const processGameUpdate = useCallback((prev: GameState, docData: Partial<GameState> & Record<string, unknown>): GameState => {
        const tele = (docData.telemetry || {}) as RawTelemetry;
        const scoring = (docData.scoring || {}) as RawScoring;
        const pit = (docData.pit || {}) as RawPit;
        const weather = (docData.weather_det || {}) as RawWeather;
        const rules = (docData.rules || {}) as RawRules;
        const extended = (docData.extended || {}) as RawExtended;

        // 1. Session Time
        let sessionTimeRem = Number(docData.sessionTimeRemainingSeconds);
        if ((sessionTimeRem === undefined || isNaN(sessionTimeRem)) && scoring.time) {
            sessionTimeRem = Number((scoring.time.end ?? 0) - (scoring.time.current ?? 0));
        }
        if (sessionTimeRem === undefined || isNaN(sessionTimeRem)) {
            sessionTimeRem = prev.sessionTimeRemaining;
        }

        // 2. Météo
        let safeAirTemp = weather.ambient_temp;
        if (safeAirTemp === undefined || safeAirTemp < -100) {
            safeAirTemp = prev.airTemp;
            if (safeAirTemp < -100) safeAirTemp = 25;
        }

        let isRain = prev.isRain;
        let weatherStatus = prev.weather;
        const trackWetnessVal = scoring.weather?.wetness_path?.[1] ?? 0;

        if (weather.rain_intensity !== undefined && weather.rain_intensity > 0) {
            isRain = weather.rain_intensity > 0.05;
        } else if (trackWetnessVal > 0.05) {
            isRain = true;
        }

        if (isRain || trackWetnessVal > 0.1) weatherStatus = "RAIN";
        else if ((weather.cloudiness ?? 0) > 0.5) weatherStatus = "CLOUDY";
        else weatherStatus = "SUNNY";

        // 3. Position
        let myPosition = Number(prev.telemetry.position);
        const vData = scoring.vehicle_data || {};
        if (vData.classPosition && vData.classPosition > 0) myPosition = vData.classPosition;
        else if (vData.position && vData.position > 0) myPosition = vData.position;

        if (scoring.vehicles && scoring.vehicles.length > 0) {
            const myCar = scoring.vehicles.find(v => Number(v.is_player) === 1);
            if (myCar) {
                const myClass = myCar.class;
                const classVehicles = scoring.vehicles.filter(v => v.class === myClass);
                classVehicles.sort((a, b) => (a.position || 999) - (b.position || 999));
                const realClassPos = classVehicles.findIndex(v => v.id === myCar.id) + 1;
                if (realClassPos > 0) {
                    myPosition = realClassPos;
                }
            }
        }
        if (myPosition === 0 && prev.telemetry.position > 0) myPosition = prev.telemetry.position;

        // 4. Moyenne
        let calculatedAvg = prev.avgLapTimeSeconds;
        if (calculatedAvg === 0 || isNaN(calculatedAvg)) {
            const bestLap = Number(scoring.vehicle_data?.best_lap || prev.telemetry.bestLap || 0);
            if (bestLap > 0) calculatedAvg = bestLap;
        }

        // 5. Telemetry Construction
        const newTelemetry: TelemetryData = {
            ...prev.telemetry,
            laps: Number(tele.laps || scoring.vehicle_data?.laps || prev.telemetry.laps),
            curLap: Number(tele.times?.current || prev.telemetry.curLap),
            lastLap: Number(scoring.vehicle_data?.last_lap || prev.telemetry.lastLap),
            bestLap: Number(scoring.vehicle_data?.best_lap || prev.telemetry.bestLap),
            position: myPosition,

            speed: tele.speed !== undefined ? Number(tele.speed) : prev.telemetry.speed,
            rpm: tele.rpm !== undefined ? Number(tele.rpm) : prev.telemetry.rpm,
            maxRpm: 8000,
            gear: tele.gear !== undefined ? Number(tele.gear) : prev.telemetry.gear,
            carCategory: (Array.isArray(scoring.vehicles) ? scoring.vehicles[0]?.class : undefined) || prev.telemetry.carCategory,

            throttle: tele.inputs?.thr !== undefined ? Number(tele.inputs.thr) : prev.telemetry.throttle,
            brake: tele.inputs?.brk !== undefined ? Number(tele.inputs.brk) : prev.telemetry.brake,
            clutch: tele.inputs?.clt !== undefined ? Number(tele.inputs.clt) : prev.telemetry.clutch,
            steering: tele.inputs?.str !== undefined ? Number(tele.inputs.str) : prev.telemetry.steering,
            waterTemp: tele.temps?.water !== undefined ? Number(tele.temps.water) : prev.telemetry.waterTemp,
            oilTemp: tele.temps?.oil !== undefined ? Number(tele.temps.oil) : prev.telemetry.oilTemp,

            fuel: {
                current: tele.fuel !== undefined ? Number(tele.fuel) : prev.telemetry.fuel.current,
                max: tele.fuelCapacity !== undefined ? Number(tele.fuelCapacity) : prev.telemetry.fuel.max,
                lastLapCons: Number(docData.lastLapFuelConsumption || prev.telemetry.fuel.lastLapCons),
                averageCons: Number(docData.averageConsumptionFuel || prev.fuelCons)
            },
            VE: {
                VEcurrent: Number(tele.virtual_energy || (Number(tele.electric?.charge || 0) * 100)),
                VElastLapCons: Number(docData.lastLapVEConsumption || prev.telemetry.VE.VElastLapCons),
                VEaverageCons: Number(docData.averageConsumptionVE || prev.veCons)
            },
            batterySoc: Number(tele.electric?.charge || prev.telemetry.batterySoc/100) * 100,
            electric: {
                charge: Number(tele.electric?.charge || prev.telemetry.electric.charge),
                torque: Number(tele.electric?.torque || prev.telemetry.electric.torque),
                rpm: Number(tele.electric?.rpm || prev.telemetry.electric.rpm),
                motorTemp: Number(tele.electric?.temp_motor || prev.telemetry.electric.motorTemp),
                waterTemp: Number(tele.electric?.temp_water || prev.telemetry.electric.waterTemp),
                state: Number(tele.electric?.state || prev.telemetry.electric.state)
            },

            tires: {
                fl: tele.tires?.wear?.[0] !== undefined ? tele.tires.wear[0] * 100 : prev.telemetry.tires.fl,
                fr: tele.tires?.wear?.[1] !== undefined ? tele.tires.wear[1] * 100 : prev.telemetry.tires.fr,
                rl: tele.tires?.wear?.[2] !== undefined ? tele.tires.wear[2] * 100 : prev.telemetry.tires.rl,
                rr: tele.tires?.wear?.[3] !== undefined ? tele.tires.wear[3] * 100 : prev.telemetry.tires.rr
            },
            tirePressures: {
                fl: tele.tires?.press?.[0] ?? prev.telemetry.tirePressures.fl,
                fr: tele.tires?.press?.[1] ?? prev.telemetry.tirePressures.fr,
                rl: tele.tires?.press?.[2] ?? prev.telemetry.tirePressures.rl,
                rr: tele.tires?.press?.[3] ?? prev.telemetry.tirePressures.rr
            },
            tireTemps: {
                fl: tele.tires?.temp?.fl || prev.telemetry.tireTemps.fl,
                fr: tele.tires?.temp?.fr || prev.telemetry.tireTemps.fr,
                rl: tele.tires?.temp?.rl || prev.telemetry.tireTemps.rl,
                rr: tele.tires?.temp?.rr || prev.telemetry.tireTemps.rr
            },
            brakeTemps: {
                flc: tele.tires?.brake_temp?.[0] ?? prev.telemetry.brakeTemps.flc,
                frc: tele.tires?.brake_temp?.[1] ?? prev.telemetry.brakeTemps.frc,
                rlc: tele.tires?.brake_temp?.[2] ?? prev.telemetry.brakeTemps.rlc,
                rrc: tele.tires?.brake_temp?.[3] ?? prev.telemetry.brakeTemps.rrc
            },
            tireCompounds: tele.tires?.compounds || prev.telemetry.tireCompounds,

            leaderLaps: prev.telemetry.leaderLaps,
            leaderAvgLapTime: prev.telemetry.leaderAvgLapTime,
            strategyEstPitTime: Number(pit.strategy?.time_min || prev.telemetry.strategyEstPitTime),
            strategyPitFuel: Number(pit.strategy?.fuel_to_add || prev.telemetry.strategyPitFuel),
            strategyPitLaps: Number(pit.strategy?.laps_to_add || prev.telemetry.strategyPitLaps),
            inPitLane: Boolean(scoring.vehicle_data?.in_pits ?? prev.telemetry.inPitLane),
            inGarage: (rules.my_status?.pits_open === false),
            pitLimiter: (extended.pit_limit ?? 0) > 0,
        };

        const scActive = Boolean(rules.sc?.active);
        const yellowFlag = Boolean(scoring.flags?.yellow_global);

        return {
            ...prev,
            ...docData,
            weatherForecast: (docData.weatherForecast as any[]) || prev.weatherForecast || [],
            allVehicles: (scoring.vehicles as import('../types').RawVehicle[]) || prev.allVehicles || [],
            lapHistory: (docData.lapHistory as LapData[]) || prev.lapHistory || [],
            stintConfig: (docData.stintConfig as Record<string, import('../types').StintConfig>) || prev.stintConfig || {},
            stintNotes: (docData.stintNotes as Record<string, string>) || prev.stintNotes || {},
            trackMap: (docData.trackMap as MapPoint[]) || prev.trackMap || [],
            chatMessages: (docData.chatMessages as ChatMessage[]) || prev.chatMessages || [],

            scActive: rules.sc ? scActive : prev.scActive,
            yellowFlag: scoring.flags ? yellowFlag : prev.yellowFlag,
            isRain: weatherStatus === "RAIN",
            isRaceRunning: scoring.time ? Boolean((scoring.time?.current ?? 0) > 0) : prev.isRaceRunning,
            trackName: scoring.track || prev.trackName,
            trackLength: scoring.length !== undefined ? Number(scoring.length) : prev.trackLength,
            sessionType: scoring.time ? String(scoring.time?.session || "") : prev.sessionType,
            sessionTimeRemaining: sessionTimeRem,
            weather: weatherStatus,
            airTemp: safeAirTemp,
            trackTemp: (scoring.weather?.track_temp ?? prev.trackTemp),
            trackWetness: trackWetnessVal * 100,
            rainIntensity: (weather.rain_intensity ?? prev.rainIntensity),
            telemetry: newTelemetry,
            drivers: docData.drivers || prev.drivers,
            avgLapTimeSeconds: calculatedAvg
        };
    }, []);

    // --- SOCKET.IO ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        const socket = io(VPS_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 10,
            auth: { token } // Envoi du token
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setStatus("AUTHENTICATING...");
            socket.emit('join_session', SESSION_ID);
        });

        // --- GESTION DES PERMISSIONS ---
        socket.on('role_assigned', (role) => {
            console.log("👮 Rôle assigné par le serveur :", role);
            setGameState(prev => ({ ...prev, userRole: role }));

            if (role === 'ADMIN') setStatus("LIVE (ADMIN)");
            else if (role === 'DRIVER') setStatus("LIVE (DRIVER - EDIT)");
            else setStatus("LIVE (READ-ONLY)");
        });

        socket.on('access_denied', (msg) => {
            alert("⛔ " + msg);
            window.location.href = "/";
        });

        socket.on('disconnect', () => setStatus("RECONNECTING..."));

        socket.on('race_update', (data) => {
            setGameState(prev => {
                const newState = processGameUpdate(prev, data);
                // On préserve le rôle car il n'est pas dans le paquet race_update
                return { ...newState, userRole: prev.userRole };
            });
            if (data.sessionTimeRemainingSeconds !== undefined) setLocalRaceTime(data.sessionTimeRemainingSeconds);
        });

        socket.on('strategy_update', (changes) => {
            setGameState(prev => {
                const newState = processGameUpdate(prev, changes);
                return { ...newState, userRole: prev.userRole };
            });
        });

        socket.on('chat_message', (msg) => setGameState(prev => ({ ...prev, chatMessages: [...prev.chatMessages, msg] })));

        return () => { socket.disconnect(); };
    }, [SESSION_ID, processGameUpdate]);

    // --- AUTO-LOAD MAP (Fix unicité) ---
    useEffect(() => {
        const trackName = gameState.trackName;
        const trackLen = Math.round(gameState.trackLength || 0);
        const uniqueMapId = (trackName && trackLen > 0) ? `${trackName}_${trackLen}` : trackName;

        if (uniqueMapId && uniqueMapId !== "WAITING..." && uniqueMapId !== "Unknown" && currentTrackLoadedRef.current !== uniqueMapId) {
            console.log(`🌍 Recherche de la carte pour : ${uniqueMapId}...`);
            fetch(`${VPS_URL}/api/tracks/${encodeURIComponent(uniqueMapId)}`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("Pas de map");
                })
                .then(points => {
                    console.log(`✅ Carte trouvée !`);
                    syncUpdate({ trackMap: points });
                    currentTrackLoadedRef.current = uniqueMapId;
                })
                .catch(() => {
                    console.log(`❌ Aucune carte pour ${uniqueMapId}.`);
                    currentTrackLoadedRef.current = uniqueMapId;
                });
        }
    }, [gameState.trackName, gameState.trackLength]);

    // --- HISTORIQUE & MOYENNE ---
    useEffect(() => {
        const currentLap = gameState.telemetry.laps;
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
            setTimeout(() => { syncUpdate({ lapHistory: newHistory }); }, 0);
        }
        if (currentLap > 0) lastProcessedLapRef.current = currentLap;

        if (gameState.lapHistory.length > 0) {
            const validLaps = gameState.lapHistory.filter(l => l.lapTime > 0 && l.lapTime < 600);
            if (validLaps.length > 0) {
                const total = validLaps.reduce((acc, l) => acc + l.lapTime, 0);
                const avg = total / validLaps.length;
                if (Math.abs(avg - gameState.avgLapTimeSeconds) > 0.1) {
                    setGameState(prev => ({ ...prev, avgLapTimeSeconds: avg }));
                }
            }
        }
    }, [gameState.telemetry.laps, gameState.lapHistory.length]);

    // --- INCIDENTS ---
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
            setTimeout(() => { syncUpdate({ incidents: updatedIncidents }); }, 0);
        }
        prevStatusRef.current = current;
    }, [gameState.telemetry.inPitLane, gameState.scActive, gameState.yellowFlag, gameState.isRain, gameState.isRaceRunning]);

    // --- TIMER LOCAL ---
    useEffect(() => {
        let interval: number | undefined;
        if (gameState.isRaceRunning && localRaceTime > 0) {
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
    }, [gameState.isRaceRunning, localRaceTime]);

    // --- HELPER PERMISSION ---
    // ADMIN ou DRIVER peuvent modifier la stratégie
    const canEdit = gameState.userRole === 'ADMIN' || gameState.userRole === 'DRIVER';

    // --- ENVOI MISES À JOUR ---
    const syncUpdate = useCallback((changes: Partial<GameState>) => {
        setGameState(prev => ({ ...prev, ...changes }));
        // On n'envoie que si on a le droit
        if (canEdit && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('update_strategy', {
                teamId: SESSION_ID,
                changes: changes
            });
        }
    }, [SESSION_ID, canEdit]);

    const saveTrackMap = useCallback((points: MapPoint[]) => {
        if (points.length > 50 || points.length === 0) {
            syncUpdate({ trackMap: points });
        }
        const trackName = gameState.trackName;
        const trackLen = Math.round(gameState.trackLength || 0);
        const uniqueMapId = (trackName && trackLen > 0) ? `${trackName}_${trackLen}` : trackName;

        if (points.length > 50 && uniqueMapId && uniqueMapId !== "WAITING...") {
            fetch(`${VPS_URL}/api/tracks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trackName: uniqueMapId,
                    points: points
                })
            }).catch(err => console.error("Erreur save map:", err));
        }
    }, [SESSION_ID, gameState.trackName, gameState.trackLength]);

    // --- CALCULATEUR STRATÉGIQUE (V3) ---
    const strategyData: StrategyData = useMemo(() => {
        const activeDriver = getSafeDriver(gameState.drivers.find(d => d.id === gameState.activeDriverId));

        // 1. CIBLES DE COURSE
        let totalLapsTarget = 300;
        const leaderLaps = gameState.telemetry.leaderLaps || 0;
        const leaderAvg = gameState.telemetry.leaderAvgLapTime || 210;
        const myLaps = gameState.telemetry.laps || 0;
        const myAvg = gameState.avgLapTimeSeconds > 0 ? gameState.avgLapTimeSeconds : 210;

        if (leaderLaps > 0 && leaderAvg > 0) {
            totalLapsTarget = Math.floor(leaderLaps + (localRaceTime / leaderAvg));
        } else if (myLaps > 0) {
            totalLapsTarget = Math.floor(myLaps + (localRaceTime / myAvg));
        }

        // 2. DÉTECTION HYBRIDE / VE
        const carCat = (gameState.telemetry.carCategory || "").toLowerCase();
        const isHybridCar = carCat.includes('hyper') || carCat.includes('lmh') || carCat.includes('lmdh') || carCat.includes('gt3');
        const useVE = isHybridCar || isHypercar || isLMGT3 || (gameState.telemetry.VE.VElastLapCons > 0.1);

        // 3. CONSOMMATIONS
        const veStats = gameState.telemetry.VE || { VEcurrent: 0, VElastLapCons: 0, VEaverageCons: 0 };
        const activeFuelCons = Math.max(0.1, gameState.telemetry.fuel.averageCons || gameState.fuelCons);
        const activeVECons = Math.max(0.1, veStats.VEaverageCons || gameState.veCons);
        const tankCapacity = Math.max(1, gameState.telemetry.fuel.max || gameState.tankCapacity);

        // Autonomie Max
        const maxLapsFuel = Math.floor(tankCapacity / activeFuelCons);
        const maxLapsVE = (useVE && activeVECons > 0) ? Math.floor(100 / activeVECons) : 999;
        const maxLapsPerStint = Math.max(1, useVE ? Math.min(maxLapsVE, maxLapsFuel) : maxLapsFuel);

        const stints: import('../types').Stint[] = [];
        const currentLap = gameState.telemetry.laps;
        const currentStintIndex = gameState.currentStint;

        // A. Relais Passés
        for (let i = 0; i < currentStintIndex; i++) {
            const config = gameState.stintConfig[i] || {};
            const driverId = config.driverId || gameState.stintAssignments[i] || gameState.drivers[i % gameState.drivers.length]?.id;
            const d = getSafeDriver(gameState.drivers.find(drv => drv.id === driverId));
            stints.push({ id: i, stopNum: i + 1, startLap: 0, endLap: 0, lapsCount: 0, fuel: "DONE", driver: d, driverId: d.id, tyres: config.tyres, isCurrent: false, isNext: false, isDone: true, note: String(gameState.stintNotes[i+1] || "") });
        }

        // B. Relais Actuel & Futurs
        let simulationLap = currentLap;
        let simIdx = currentStintIndex;

        while (simulationLap < totalLapsTarget) {
            const config = gameState.stintConfig[simIdx] || {};

            let driverId = config.driverId || gameState.stintAssignments[simIdx];
            if (!driverId && gameState.drivers.length > 0) {
                const prevStint = stints[stints.length - 1];
                const prevDriverId = prevStint ? prevStint.driverId : gameState.activeDriverId;
                const prevIdx = gameState.drivers.findIndex(d => d.id === prevDriverId);
                driverId = gameState.drivers[(prevIdx + 1) % gameState.drivers.length].id;
            }
            const d = getSafeDriver(gameState.drivers.find(drv => drv.id === driverId));

            // Durée (avec prise en compte des tours forcés)
            let lapsDuration = maxLapsPerStint;
            if (config.laps && config.laps > 0) lapsDuration = Math.min(config.laps, maxLapsPerStint);
            if (simulationLap + lapsDuration > totalLapsTarget) lapsDuration = totalLapsTarget - simulationLap;
            lapsDuration = Math.max(1, lapsDuration);

            // Ratio Fuel/Energy (Défaut 1.0)
            const ratio = config.fuelEnergyRatio !== undefined ? config.fuelEnergyRatio : 1.0;

            // CALCULS (V3 : RATIO VE -> FUEL)
            let veNeeded = 0;
            let veDisplay = "-";
            let fuelNeeded = 0;
            let fuelDisplay = "";

            if (useVE) {
                // Pour les Hybrides : VE dicte le plein
                veNeeded = lapsDuration * activeVECons;
                veDisplay = `${veNeeded.toFixed(0)}%`;

                // Le fuel ajouté suit le ratio VE (1% VE = 1% Tank) * le facteur utilisateur
                const tankRatio = tankCapacity / 100;
                fuelNeeded = veNeeded * ratio * tankRatio;
            } else {
                // Classique
                fuelNeeded = lapsDuration * activeFuelCons;
            }

            if (simIdx === currentStintIndex) {
                fuelDisplay = `${gameState.telemetry.fuel.current.toFixed(1)}L (Rest)`;
            } else {
                fuelDisplay = `${fuelNeeded.toFixed(1)}L`;
            }

            stints.push({
                id: simIdx,
                stopNum: simIdx + 1,
                startLap: simulationLap,
                endLap: simulationLap + lapsDuration,
                lapsCount: lapsDuration,
                fuel: fuelDisplay,
                virtualEnergy: veDisplay,
                fuelEnergyRatio: ratio,
                driver: d,
                driverId: d.id,
                tyres: config.tyres || 'AUTO',
                isCurrent: simIdx === currentStintIndex,
                isNext: simIdx === currentStintIndex + 1,
                isDone: false,
                note: String(gameState.stintNotes[simIdx+1] || "")
            });

            simulationLap += lapsDuration;
            simIdx++;
            if (simIdx > currentStintIndex + 20) break;
        }

        // Prédiction Trafic
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

        return { stints, totalLaps: totalLapsTarget, lapsPerTank: maxLapsFuel, activeFuelCons, activeVECons, activeLapTime: myAvg, pitStopsRemaining: Math.max(0, stints.length - 1 - currentStintIndex), targetFuelCons: activeFuelCons, targetVECons: activeVECons, pitPrediction };
    }, [gameState, localRaceTime, isHypercar, isLMGT3, manualFuelTarget, manualVETarget]);

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
        setManualFuelTarget, setManualVETarget, updateStintConfig, saveTrackMap,
        sendMessage: (msg: ChatMessage) => {
            setGameState(prev => ({ ...prev, chatMessages: [...prev.chatMessages, msg] }));
            if (socketRef.current) socketRef.current.emit('send_chat_message', { teamId: SESSION_ID, message: msg });
        },
        canEdit,
        userRole: gameState.userRole
    };
};
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
    GameState, StrategyData, TelemetryData, LapData, MapPoint,
    RawTelemetry, RawScoring, RawPit, RawWeather, RawRules, RawExtended, ChatMessage
} from '../types';
import { getSafeDriver } from '../utils/helpers';
import { calculateStrategy } from '../engine/strategyEngine';

import { API_BASE_URL, PIT_LANE_LOSS, DEFAULT_STATIONARY_TIME, DEFAULT_LAP_TIME, MAX_STINTS_LOOKAHEAD } from '../constants';

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
        userGlobalRole: 'DRIVER',
        userTeamRole: 'MEMBER'
    });

    const [status, setStatus] = useState("CONNECTING...");
    const [localRaceTime, setLocalRaceTime] = useState(0);
    const [localStintTime, setLocalStintTime] = useState(0);
    const lastProcessedLapRef = useRef<number>(-1);
    const socketRef = useRef<Socket | null>(null);
    const currentTrackLoadedRef = useRef<string>("");
    const isRaceRunningRef = useRef(false);
    const activeDriverIdRef = useRef<number | string>(1);
    const pitCooldownRef = useRef(false);

    const tId = teamId.toLowerCase();
    const isHypercar = tId.includes('hyper');
    const isLMGT3 = tId.includes('gt3');
    const isLMP3 = tId.includes('lmp3');
    const isLMP2ELMS = tId.includes('elms');

    // --- LOGIQUE DE TRAITEMENT DES DONNÉES ---
    const processGameUpdate = useCallback((prev: GameState, docData: Partial<GameState> & Record<string, unknown>): GameState => {
        const tele = (docData.telemetry || {}) as RawTelemetry;
        const scoring = (docData.scoring || {}) as RawScoring;
        const pit = (docData.pit || {}) as RawPit;
        const weather = (docData.weather_det || {}) as RawWeather;
        const rules = (docData.rules || {}) as RawRules;
        const extended = (docData.extended || {}) as RawExtended;

        let sessionTimeRem = Number(docData.sessionTimeRemainingSeconds);
        if ((sessionTimeRem === undefined || isNaN(sessionTimeRem)) && scoring.time) {
            sessionTimeRem = Number((scoring.time.end ?? 0) - (scoring.time.current ?? 0));
        }
        if (sessionTimeRem === undefined || isNaN(sessionTimeRem)) {
            sessionTimeRem = prev.sessionTimeRemaining;
        }

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

        let myPosition = Number(prev.telemetry.position);
        const vData = scoring.vehicle_data || {};
        if (vData.classPosition && vData.classPosition > 0) myPosition = vData.classPosition;
        else if (vData.position && vData.position > 0) myPosition = vData.position;

        let calculatedAvg = prev.avgLapTimeSeconds;
        if (calculatedAvg === 0 || isNaN(calculatedAvg)) {
            const bestLap = Number(scoring.vehicle_data?.best_lap || prev.telemetry.bestLap || 0);
            if (bestLap > 0) calculatedAvg = bestLap;
        }

        const prevVE = prev.telemetry.VE || { VEcurrent: 100, VElastLapCons: 0, VEaverageCons: 0 };
        const prevFuel = prev.telemetry.fuel || { current: 0, max: 100, lastLapCons: 0, averageCons: 0 };

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
                current: tele.fuel !== undefined ? Number(tele.fuel) : prevFuel.current,
                max: tele.fuelCapacity !== undefined ? Number(tele.fuelCapacity) : prevFuel.max,
                lastLapCons: Number(docData.lastLapFuelConsumption || prevFuel.lastLapCons),
                averageCons: Number(docData.averageConsumptionFuel || prev.fuelCons)
            },
            VE: {
                VEcurrent: Number(tele.virtual_energy || (Number(tele.electric?.charge || 0) * 100)),
                VElastLapCons: Number(docData.lastLapVEConsumption || prevVE.VElastLapCons),
                VEaverageCons: Number(docData.averageConsumptionVE || prev.veCons)
            },
            batterySoc: Number(tele.electric?.charge || prev.telemetry.batterySoc/100) * 100,
            electric: {
                charge: Number(tele.electric?.charge || prev.telemetry.electric?.charge || 0),
                torque: Number(tele.electric?.torque || prev.telemetry.electric?.torque || 0),
                rpm: Number(tele.electric?.rpm || prev.telemetry.electric?.rpm || 0),
                motorTemp: Number(tele.electric?.temp_motor || prev.telemetry.electric?.motorTemp || 0),
                waterTemp: Number(tele.electric?.temp_water || prev.telemetry.electric?.waterTemp || 0),
                state: Number(tele.electric?.state || prev.telemetry.electric?.state || 0)
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
            inPitLane: Boolean(scoring.vehicle_data?.in_pits ?? prev.telemetry.inPitLane),
            inGarage: (rules.my_status?.pits_open === false),
            pitLimiter: (extended.pit_limit ?? 0) > 0,
            damageIndex: prev.telemetry.damageIndex,
            isOverheating: prev.telemetry.isOverheating
        };

        const scActive = Boolean(rules.sc?.active);
        const yellowFlag = Boolean(scoring.flags?.yellow_global);

        return {
            ...prev,
            // Strategy-sync keys (only override if present in docData)
            ...(docData.drivers !== undefined && { drivers: docData.drivers }),
            ...(docData.incidents !== undefined && { incidents: docData.incidents }),
            ...(docData.stintAssignments !== undefined && { stintAssignments: docData.stintAssignments }),
            ...(docData.activeDriverId !== undefined && { activeDriverId: docData.activeDriverId }),
            ...(docData.currentStint !== undefined && { currentStint: docData.currentStint }),
            ...(docData.stintDuration !== undefined && { stintDuration: docData.stintDuration }),
            ...(docData.raceDurationHours !== undefined && { raceDurationHours: docData.raceDurationHours }),
            ...(docData.tankCapacity !== undefined && { tankCapacity: docData.tankCapacity }),
            ...(docData.fuelCons !== undefined && { fuelCons: docData.fuelCons }),
            ...(docData.veCons !== undefined && { veCons: docData.veCons }),
            ...(docData.isRaceRunning !== undefined && { isRaceRunning: docData.isRaceRunning }),
            ...(docData.raceTime !== undefined && { raceTime: docData.raceTime }),

            // Array/object merges with fallback
            weatherForecast: (docData.weatherForecast as any[]) || prev.weatherForecast || [],
            allVehicles: (scoring.vehicles as import('../types').RawVehicle[]) || prev.allVehicles || [],
            lapHistory: (docData.lapHistory as LapData[]) || prev.lapHistory || [],
            stintConfig: (docData.stintConfig as Record<string, import('../types').StintConfig>) || prev.stintConfig || {},
            stintNotes: (docData.stintNotes as Record<string, string>) || prev.stintNotes || {},
            trackMap: (docData.trackMap as MapPoint[]) || prev.trackMap || [],
            chatMessages: (docData.chatMessages as ChatMessage[]) || prev.chatMessages || [],

            // Processed bridge fields
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
            avgLapTimeSeconds: calculatedAvg,
            position: myPosition
        };
    }, []);

    // --- SOCKET.IO ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        const socket = io(API_BASE_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 10,
            auth: { token }
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setStatus("AUTHENTICATING...");
            socket.emit('join_session', SESSION_ID);
        });

        socket.on('role_assigned', ({ teamRole, globalRole }) => {
            console.log(`👮 Rôles reçus - Team: ${teamRole}, Global: ${globalRole}`);
            setGameState(prev => ({
                ...prev,
                userTeamRole: teamRole,
                userGlobalRole: globalRole
            }));

            let statusText = "LIVE (MEMBER)";
            if (globalRole === 'ADMIN') statusText = "LIVE (APP ADMIN)";
            else if (teamRole === 'LEADER') statusText = "LIVE (TEAM LEADER)";

            setStatus(statusText);
        });

        socket.on('access_denied', (msg) => {
            alert("⛔ " + msg);
            window.location.href = "/";
        });

        socket.on('disconnect', () => setStatus("RECONNECTING..."));

        socket.on('race_update', (data) => {
            setGameState(prev => {
                const newState = processGameUpdate(prev, data);
                return { ...newState, userGlobalRole: prev.userGlobalRole, userTeamRole: prev.userTeamRole };
            });
            if (data.sessionTimeRemainingSeconds !== undefined) setLocalRaceTime(data.sessionTimeRemainingSeconds);
        });

        socket.on('strategy_update', (changes) => {
            setGameState(prev => {
                const newState = processGameUpdate(prev, changes);
                return { ...newState, userGlobalRole: prev.userGlobalRole, userTeamRole: prev.userTeamRole };
            });
        });

        socket.on('chat_message', (msg) => setGameState(prev => {
            if (prev.chatMessages.some(m => m.id === msg.id)) return prev;
            const msgs = [...prev.chatMessages, msg];
            return { ...prev, chatMessages: msgs.length > 500 ? msgs.slice(-500) : msgs };
        }));

        return () => {
            socket.removeAllListeners();
            socket.disconnect();
        };
    }, [SESSION_ID, processGameUpdate]);

    // --- OFFLINE FALLBACK: persist critical state to localStorage ---
    const cacheKey = `race_state_${SESSION_ID}`;
    useEffect(() => {
        if (gameState.trackName === "WAITING..." || !gameState.isRaceRunning) return;
        const toCache = {
            currentStint: gameState.currentStint, activeDriverId: gameState.activeDriverId,
            drivers: gameState.drivers, stintConfig: gameState.stintConfig,
            stintAssignments: gameState.stintAssignments, stintNotes: gameState.stintNotes,
            fuelCons: gameState.fuelCons, veCons: gameState.veCons, tankCapacity: gameState.tankCapacity,
            raceDurationHours: gameState.raceDurationHours, trackName: gameState.trackName,
            _ts: Date.now()
        };
        try { localStorage.setItem(cacheKey, JSON.stringify(toCache)); } catch {}
    }, [gameState.currentStint, gameState.drivers, gameState.stintConfig, gameState.stintAssignments, cacheKey]);

    // Restore from cache on mount (before first socket data)
    useEffect(() => {
        try {
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return;
            const data = JSON.parse(cached);
            // Only restore if cache is less than 2 hours old
            if (data._ts && Date.now() - data._ts < 7200000) {
                setGameState(prev => ({
                    ...prev,
                    ...(data.currentStint !== undefined && { currentStint: data.currentStint }),
                    ...(data.activeDriverId !== undefined && { activeDriverId: data.activeDriverId }),
                    ...(data.drivers && { drivers: data.drivers }),
                    ...(data.stintConfig && { stintConfig: data.stintConfig }),
                    ...(data.stintAssignments && { stintAssignments: data.stintAssignments }),
                    ...(data.stintNotes && { stintNotes: data.stintNotes }),
                    ...(data.fuelCons && { fuelCons: data.fuelCons }),
                    ...(data.veCons && { veCons: data.veCons }),
                    ...(data.tankCapacity && { tankCapacity: data.tankCapacity }),
                }));
            }
        } catch {}
    }, [cacheKey]);

    // --- MAP AUTO-LOAD ---
    useEffect(() => {
        const trackName = gameState.trackName;
        const trackLen = Math.round(gameState.trackLength || 0);
        const uniqueMapId = (trackName && trackLen > 0) ? `${trackName}_${trackLen}` : trackName;

        if (uniqueMapId && uniqueMapId !== "WAITING..." && uniqueMapId !== "Unknown" && currentTrackLoadedRef.current !== uniqueMapId) {
            fetch(`${API_BASE_URL}/api/tracks/${encodeURIComponent(uniqueMapId)}`)
                .then(res => res.ok ? res.json() : [])
                .then(points => { if(points.length > 0) syncUpdate({ trackMap: points }); })
                .catch(() => {});
            currentTrackLoadedRef.current = uniqueMapId;
        }
    }, [gameState.trackName, gameState.trackLength]);

    // --- PERMISSIONS ---
    const canEditStrategy = true;
    const canManageLineup = gameState.userTeamRole === 'LEADER' || gameState.userGlobalRole === 'ADMIN';

    // --- SYNC ---
    const syncUpdate = useCallback((changes: Partial<GameState>) => {
        setGameState(prev => ({ ...prev, ...changes }));
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('update_strategy', { teamId: SESSION_ID, changes });
        }
    }, [SESSION_ID]);

    const saveTrackMap = useCallback((points: MapPoint[]) => {
        syncUpdate({ trackMap: points });
        const uniqueMapId = `${gameState.trackName}_${Math.round(gameState.trackLength || 0)}`;
        fetch(`${API_BASE_URL}/api/tracks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackName: uniqueMapId, points })
        }).catch(console.error);
    }, [SESSION_ID, gameState.trackName, gameState.trackLength]);

    // --- TIMERS ---
    useEffect(() => { isRaceRunningRef.current = gameState.isRaceRunning; }, [gameState.isRaceRunning]);
    useEffect(() => { activeDriverIdRef.current = gameState.activeDriverId; }, [gameState.activeDriverId]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!isRaceRunningRef.current) return;
            setLocalStintTime(prev => prev + 1);
            setGameState(prev => ({
                ...prev,
                drivers: prev.drivers.map(d =>
                    d.id === activeDriverIdRef.current
                        ? { ...d, totalDriveTime: (d.totalDriveTime || 0) + 1 }
                        : d
                )
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // --- CALCULATEUR STRATÉGIQUE (V3) ---
    const strategyData: StrategyData = useMemo(() => {
        const veStats = gameState.telemetry.VE || { VEcurrent: 0, VElastLapCons: 0, VEaverageCons: 0 };
        const fuelStats = gameState.telemetry.fuel || { current: 0, max: 0, lastLapCons: 0, averageCons: 0 };

        return calculateStrategy({
            currentLap: gameState.telemetry.laps,
            carCategory: gameState.telemetry.carCategory || "",
            fuelCurrent: fuelStats.current,
            fuelMax: fuelStats.max,
            fuelAvgCons: fuelStats.averageCons,
            veAvgCons: veStats.VEaverageCons,
            veLastLapCons: veStats.VElastLapCons,
            strategyEstPitTime: gameState.telemetry.strategyEstPitTime,
            telemetryPosition: gameState.telemetry.position,
            currentStint: gameState.currentStint,
            raceTimeRemaining: localRaceTime,
            avgLapTimeSeconds: gameState.avgLapTimeSeconds,
            leaderLaps: gameState.telemetry.leaderLaps || 0,
            leaderAvgLapTime: gameState.telemetry.leaderAvgLapTime || 0,
            activeDriverId: gameState.activeDriverId,
            drivers: gameState.drivers,
            stintConfig: gameState.stintConfig,
            stintAssignments: gameState.stintAssignments || {},
            stintNotes: gameState.stintNotes,
            fuelCons: gameState.fuelCons,
            veCons: gameState.veCons,
            tankCapacity: gameState.tankCapacity,
            manualFuelTarget,
            manualVETarget,
            isHypercar,
            isLMGT3,
            allVehicles: gameState.allVehicles
        });
    }, [
        gameState.telemetry.laps, gameState.telemetry.fuel, gameState.telemetry.VE,
        gameState.telemetry.position, gameState.telemetry.strategyEstPitTime,
        gameState.telemetry.carCategory, gameState.telemetry.leaderLaps, gameState.telemetry.leaderAvgLapTime,
        gameState.currentStint, gameState.stintConfig, gameState.stintAssignments, gameState.stintNotes,
        gameState.drivers, gameState.activeDriverId, gameState.avgLapTimeSeconds,
        gameState.fuelCons, gameState.veCons, gameState.tankCapacity, gameState.allVehicles,
        localRaceTime, isHypercar, isLMGT3, manualFuelTarget, manualVETarget
    ]);

    const confirmPitStop = () => {
        if (pitCooldownRef.current) return;
        pitCooldownRef.current = true;
        setTimeout(() => { pitCooldownRef.current = false; }, 2000);

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

    const updateStintConfig = (idx: number, k: string, v: any) => {
        const newConfig = { ...gameState.stintConfig };
        if (!newConfig[idx]) newConfig[idx] = {};
        newConfig[idx] = { ...newConfig[idx], [k]: v };
        syncUpdate({ stintConfig: newConfig });
    };

    return {
        gameState, syncUpdate, status, localRaceTime, localStintTime, strategyData,
        confirmPitStop, undoPitStop, resetRace, CHAT_ID, isHypercar, isLMGT3, isLMP3, isLMP2ELMS,
        setManualFuelTarget, setManualVETarget, updateStintConfig, saveTrackMap,
        sendMessage: (msg: ChatMessage) => {
            setGameState(prev => {
                const msgs = [...prev.chatMessages, msg];
                return { ...prev, chatMessages: msgs.length > 500 ? msgs.slice(-500) : msgs };
            });
            socketRef.current?.emit('send_chat_message', { teamId: SESSION_ID, message: msg });
        },
        canEditStrategy,
        canManageLineup,
        userRole: gameState.userTeamRole
    };
};
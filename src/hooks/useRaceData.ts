import { useState, useEffect, useMemo } from 'react'; 
import { supabase } from '../lib/supabaseClient.ts';
import type { GameState, StrategyData, Stint, TelemetryData } from '../types';
import { getSafeDriver } from '../utils/helpers';

export const useRaceData = (teamId: string) => {
    const SESSION_ID = teamId; 
    const CHAT_ID = "global-radio"; 
    
    // --- ÉTAT INITIAL ---
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
            carCategory: "Unknown",
            throttle: 0, brake: 0, clutch: 0, steering: 0, waterTemp: 0, oilTemp: 0,
            fuel: { current: 0, max: 100, lastLapCons: 0, averageCons: 0 },
            VE: { VEcurrent: 100, VElastLapCons: 0, VEaverageCons: 0 },
            batterySoc: 0,
            // Nouvel objet Electric
            electric: { charge: 0, torque: 0, rpm: 0, motorTemp: 0, waterTemp: 0, state: 0 },
            tires: { fl: 100, fr: 100, rl: 100, rr: 100 },
            tirePressures: { fl: 0, fr: 0, rl: 0, rr: 0 },
            // Initialisation tableaux vides
            tireTemps: { fl: [], fr: [], rl: [], rr: [] },
            brakeTemps: { flc: 0, frc: 0, rlc: 0, rrc: 0 },
            tireCompounds: { fl: "---", fr: "---", rl: "---", rr: "---" },
            leaderLaps: 0, leaderAvgLapTime: 0, strategyEstPitTime: 0,
            inPitLane: false, inGarage: true, pitLimiter: false, damageIndex: 0, isOverheating: false
        }
    });

    const [status, setStatus] = useState("CONNECTING...");
    const [localRaceTime, setLocalRaceTime] = useState(24 * 3600);
    const [localStintTime, setLocalStintTime] = useState(0);

    // Détection catégorie via ID
    const tId = teamId.toLowerCase();
    const isHypercar = tId.includes('Hyper') || tId.includes('red');
    const isLMGT3 = tId.includes('gt3') || tId.includes('lmgt3');
    const isLMP3 = tId.includes('lmp3');
    const isLMP2ELMS = tId.includes('elms');

    // Fonction de mise à jour via Supabase
    const syncUpdate = async (data: Partial<GameState>) => {
        console.log('syncUpdate called with data:', data);
        try {
            const { error } = await supabase.from('strategies').update(data).eq('id', SESSION_ID);
            if (error) {
                console.error('Supabase update error:', error);
            } else {
                console.log('Supabase update success for id:', SESSION_ID);
            }
        } catch (e) {
            console.error('Supabase update exception:', e);
        }
    };

    // --- CONNEXION FIREBASE ---
    useEffect(() => {
        if (!teamId) return;

        let channel: ReturnType<typeof supabase['channel']> | null = null;

        // Fetch initial row from Supabase
        (async () => {
            console.log('Fetching initial data for SESSION_ID:', SESSION_ID);
            try {
                const { data, error } = await supabase.from('strategies').select('*').eq('id', SESSION_ID).maybeSingle();
                if (error) {
                    console.error('Supabase fetch error', error);
                } else {
                    console.log('Fetched data:', data);
                }

                if (data) {
                    const docData = data as Partial<GameState> & Record<string, unknown>;
                    // Les champs peuvent être stockés directement dans la ligne (JSONB), on réutilise la logique existante
                    const tele = (docData.telemetry || {}) as import('../types').RawTelemetry;
                    const scoring = (docData.scoring || {}) as import('../types').RawScoring;
                     const pit = (docData.pit || {}) as import('../types').RawPit;
                     const weather = (docData.weather_det || {}) as import('../types').RawWeather;
                     const rules = (docData.rules || {}) as import('../types').RawRules;
                     const extended = (docData.extended || {}) as import('../types').RawExtended;

                    let sessionTimeRem = Number((scoring.time?.end ?? 0) - (scoring.time?.current ?? 0));
                    if (isNaN(sessionTimeRem) || sessionTimeRem < 0) sessionTimeRem = Number(docData.sessionTimeRemainingSeconds || 0);

                    // Reuse setGameState transformation from original code
                    console.log('Setting gameState with fetched data');
                    setGameState(prev => {
                        const tireWear = tele.tires?.wear || [0,0,0,0];
                        const tirePress = tele.tires?.press || [0,0,0,0];
                        const tTemps = tele.tires?.temp || {};
                        const elec = tele.electric || {};

                        let lLaps = prev.telemetry.leaderLaps;
                        let lAvg = prev.telemetry.leaderAvgLapTime;
                        if (Array.isArray(scoring.vehicles)) {
                            const leader = (scoring.vehicles as import('../types').RawVehicle[]).find((v) => (v.position ?? 0) === 1);
                            if (leader) {
                                lLaps = leader.laps ?? lLaps;
                                if ((leader.best_lap ?? 0) > 0) lAvg = (leader.best_lap ?? 0) * 1.05;
                            }
                        }

                        const newTelemetry: TelemetryData = {
                            laps: Number(tele.laps || scoring.vehicle_data?.laps || prev.telemetry.laps),
                            curLap: Number(tele.times?.current || 0),
                            lastLap: Number(scoring.vehicle_data?.last_lap || prev.telemetry.lastLap),
                            bestLap: Number(scoring.vehicle_data?.best_lap || prev.telemetry.bestLap),
                            position: Number(scoring.vehicle_data?.position || prev.telemetry.position),
                            speed: Number(tele.speed || 0),
                            rpm: Number(tele.rpm || 0),
                            maxRpm: 8000,
                            gear: Number(tele.gear || 0),
                            carCategory: (Array.isArray(scoring.vehicles) ? scoring.vehicles[0]?.class : undefined) || "Unknown",
                            throttle: Number(tele.inputs?.thr || 0),
                            brake: Number(tele.inputs?.brk || 0),
                            clutch: Number(tele.inputs?.clt || 0),
                            steering: Number(tele.inputs?.str || 0),
                            waterTemp: Number(tele.temps?.water || 0),
                            oilTemp: Number(tele.temps?.oil || 0),
                            fuel: {
                                current: Number(tele.fuel || 0),
                                max: Number(tele.fuelCapacity || prev.telemetry.fuel.max),
                                lastLapCons: Number(docData.lastLapFuelConsumption || 0),
                                averageCons: Number(docData.averageConsumptionFuel || prev.fuelCons)
                            },
                            VE: { VEcurrent: Number(elec.charge || 0) * 100, VElastLapCons: 0, VEaverageCons: 0 },
                            batterySoc: Number(elec.charge || 0) * 100,
                            electric: {
                                charge: Number(elec.charge || 0),
                                torque: Number(elec.torque || 0),
                                rpm: Number(elec.rpm || 0),
                                motorTemp: Number(elec.temp_motor || 0),
                                waterTemp: Number(elec.temp_water || 0),
                                state: Number(elec.state || 0)
                            },
                            tires: { fl: ((tireWear[0]||0))*100, fr: ((tireWear[1]||0))*100, rl: ((tireWear[2]||0))*100, rr: ((tireWear[3]||0))*100 },
                            tirePressures: { fl: Number(tirePress[0]||0), fr: Number(tirePress[1]||0), rl: Number(tirePress[2]||0), rr: Number(tirePress[3]||0) },
                            tireTemps: { fl: tTemps.fl || [], fr: tTemps.fr || [], rl: tTemps.rl || [], rr: tTemps.rr || [] },
                            brakeTemps: { flc: Number(tele.tires?.brake_temp?.[0]||0), frc: Number(tele.tires?.brake_temp?.[1]||0), rlc: Number(tele.tires?.brake_temp?.[2]||0), rrc: Number(tele.tires?.brake_temp?.[3]||0) },
                            tireCompounds: { fl: "---", fr: "---", rl: "---", rr: "---" },
                            leaderLaps: lLaps, leaderAvgLapTime: lAvg,
                            strategyEstPitTime: Number(pit.strategy?.time_min || 0),
                            inPitLane: Boolean(scoring.vehicle_data?.in_pits),
                            inGarage: (rules.my_status?.pits_open === false),
                            pitLimiter: (extended.pit_limit ?? 0) > 0,
                            damageIndex: 0, isOverheating: false
                        };

                        return {
                            ...prev,
                            ...docData,
                            isRaceRunning: Boolean((scoring.time?.current ?? 0) > 0),
                            trackName: scoring.track || prev.trackName,
                            sessionType: String(scoring.time?.session || ""),
                            sessionTimeRemaining: sessionTimeRem,
                            weather: (weather.rain_intensity ?? 0) > 0.1 ? "RAIN" : ((weather.cloudiness ?? 0) > 0.5 ? "CLOUDY" : "SUNNY"),
                            airTemp: (weather.ambient_temp ?? prev.airTemp),
                            trackWetness: (scoring.weather?.wetness_path?.[1] ?? 0) * 100 || 0,
                            rainIntensity: (weather.rain_intensity ?? 0) || 0,
                            telemetry: newTelemetry,
                            drivers: docData.drivers || prev.drivers
                        };
                    });

                    if (sessionTimeRem > 0) setLocalRaceTime(sessionTimeRem);
                    setStatus("LIVE DATA");
                } else {
                    // If no row, create initial one
                    console.log('No data found, creating initial row');
                    try {
                        const { error: upsertError } = await supabase.from('strategies').upsert({ id: SESSION_ID, createdAt: new Date().toISOString(), trackName: 'WAITING BRIDGE...' });
                        if (upsertError) {
                            console.error('Supabase upsert error', upsertError);
                        } else {
                            console.log('Initial row created');
                        }
                        setStatus('WAITING BRIDGE');
                    } catch (e) { console.error('Supabase upsert exception', e); }
                }
            } catch (err) {
                console.error('Supabase fetch exception', err);
                setStatus('ERROR');
            }
        })();

        // Subscribe to realtime changes for this session ID
        console.log('Setting up realtime subscription for SESSION_ID:', SESSION_ID);
        try {
            channel = supabase.channel(`public:strategies:${SESSION_ID}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'strategies', filter: `id=eq.${SESSION_ID}` }, (payload) => {
                    console.log('Realtime payload received:', payload);
                    const docData = payload.new;
                    if (!docData) return;
                    // Reuse same parsing as above (lightweight): setGameState with docData
                    setGameState(prev => ({ ...prev, ...(docData as Partial<GameState>) }));
                    setStatus('LIVE DATA');
                })
                .subscribe((status) => {
                    console.log('Subscription status:', status);
                });
        } catch (e) {
            console.error('Supabase subscribe error', e);
        }

        return () => {
            try { if (channel) void channel.unsubscribe(); } catch { /* ignore */ }
        };
    }, [teamId, SESSION_ID]);

    // Timer Local
    useEffect(() => {
        let interval: number | undefined;
        if (localRaceTime > 0) {
            interval = setInterval(() => {
                setLocalRaceTime(p => Math.max(0, p - 1));
                setLocalStintTime(p => p + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [localRaceTime]);

    // --- CALCULATEUR STRATÉGIQUE ---
    const strategyData: StrategyData = useMemo(() => {
        const activeDriver = getSafeDriver(gameState.drivers.find(d => d.id === gameState.activeDriverId));
        
        // 1. Tours Totaux
        let totalLapsTarget = 300;
        const leaderLaps = gameState.telemetry.leaderLaps || 0;
        const leaderAvg = gameState.telemetry.leaderAvgLapTime || 210;
        const myLaps = gameState.telemetry.laps || 0;
        const myAvg = gameState.avgLapTimeSeconds || 210;
        
        if (leaderLaps > 0 && leaderAvg > 0) {
            totalLapsTarget = Math.floor(leaderLaps + (localRaceTime / leaderAvg));
        } else if (myLaps > 0) {
            totalLapsTarget = Math.floor(myLaps + (localRaceTime / myAvg));
        }

        // 2. Conso
        const useVE = isHypercar || isLMGT3;
        const activeFuelCons = Math.max(0.1, gameState.telemetry.fuel.averageCons || gameState.fuelCons);
        const activeVECons = Math.max(0.1, gameState.telemetry.VE.VEaverageCons || gameState.veCons);
        const tankCapacity = Math.max(1, gameState.telemetry.fuel.max || gameState.tankCapacity);

        // 3. Relais Max
        const lapsPerTank = Math.floor(tankCapacity / activeFuelCons);
        const lapsPerVE = activeVECons > 0 ? Math.floor(100 / activeVECons) : 999;
        const lapsPerStint = Math.max(1, useVE ? Math.min(lapsPerVE, lapsPerTank) : lapsPerTank);

        // 4. Génération Relais
        const stints: Stint[] = [];
        const currentLap = gameState.telemetry.laps;
        const currentStintIndex = gameState.currentStint;

        // Passés
        for (let i = 0; i < currentStintIndex; i++) {
            const driverId = gameState.stintAssignments[i] || gameState.drivers[i % gameState.drivers.length]?.id;
             const d = getSafeDriver(gameState.drivers.find(drv => drv.id === driverId));
             stints.push({
                 id: i, stopNum: i + 1, startLap: i * lapsPerStint, endLap: (i + 1) * lapsPerStint,
                 lapsCount: lapsPerStint, fuel: "DONE", driver: d, driverId: d.id,
                 isCurrent: false, isNext: false, isDone: true, note: gameState.stintNotes[i+1] || ""
             });
         }

        // Actuel
        stints.push({
            id: currentStintIndex, stopNum: currentStintIndex + 1, startLap: currentLap, 
            endLap: Math.min(totalLapsTarget, (currentStintIndex + 1) * lapsPerStint),
            lapsCount: lapsPerStint, fuel: "CURRENT", driver: activeDriver, driverId: activeDriver.id,
            isCurrent: true, isNext: false, isDone: false, note: gameState.stintNotes[currentStintIndex+1] || ""
        });

        // Futurs
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
                id: nextIdx,
                stopNum: nextIdx + 1,
                startLap: Math.floor(nextStartLap),
                endLap: Math.floor(nextStartLap + lapsThisStint),
                lapsCount: Math.floor(lapsThisStint),
                fuel: fuelInfo,
                driver: d,
                driverId: d.id,
                isCurrent: false,
                isNext: nextIdx === currentStintIndex + 1,
                isDone: false,
                note: gameState.stintNotes[nextIdx+1] || ""
            });

            nextStartLap += lapsPerStint;
            nextIdx++;
            if (nextIdx > 100) break;
        }

        return { stints, totalLaps: totalLapsTarget, lapsPerTank, activeFuelCons, activeVECons, activeLapTime: myAvg, pitStopsRemaining: Math.max(0, stints.length - 1 - currentStintIndex) };
    }, [gameState, localRaceTime, isHypercar, isLMGT3]);

    // Actions
    const confirmPitStop = () => {
        // ...existing code...
    };

    const undoPitStop = () => {
        // ...existing code...
    };

    const resetRace = () => {
        // ...existing code...
    };

    return {
        gameState, syncUpdate, status, localRaceTime, localStintTime, strategyData,
        confirmPitStop, undoPitStop, resetRace, CHAT_ID, isHypercar, isLMGT3, isLMP3, isLMP2ELMS
    };
};

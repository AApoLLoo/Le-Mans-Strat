import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
    GameState, StrategyData, TelemetryData, LapData, MapPoint,
    RawTelemetry, RawScoring, RawPit, RawWeather, RawRules, ChatMessage, LmuElectronics, RestApiData, Vec3
} from '../types';
import { calculateStrategy } from '../engine/strategyEngine';
import { normalizeSessionMode } from '../utils/helpers';

import { API_BASE_URL } from '../constants';

interface SetupSummary {
    id: string;
    name: string;
    car?: string;
    updatedAt?: string;
}

const LMU_API_BASE_URL = 'http://localhost:6397';
const VPS_BRIDGE_SETUPS_LIST = '/api/bridge/setups/list';
const VPS_BRIDGE_SETUPS_APPLY = '/api/bridge/setups/apply';
const SETUPS_LIST_ENDPOINTS = [
    '/rest/garage/setups',
    '/api/setups',
    '/api/setup-bridge/setups',
    '/api/garage/setups',
    '/setups'
];
const SETUPS_LOAD_ENDPOINTS = [
    '/rest/garage/setups/apply',
    '/api/setups/load',
    '/api/setup-bridge/load',
    '/api/setups/apply',
    '/rest/garage/setups/load'
];

type WheelKey = 'fl' | 'fr' | 'rl' | 'rr';

const WHEEL_KEYS: WheelKey[] = ['fl', 'fr', 'rl', 'rr'];
const DEFAULT_COMPOUNDS = { fl: '---', fr: '---', rl: '---', rr: '---' };

const getWheelAlias = (key: string): WheelKey | null => {
    const normalized = String(key || '').trim().toLowerCase();
    if (normalized === 'fl' || normalized === 'front_left') return 'fl';
    if (normalized === 'fr' || normalized === 'front_right') return 'fr';
    if (normalized === 'rl' || normalized === 'rear_left') return 'rl';
    if (normalized === 'rr' || normalized === 'rear_right') return 'rr';
    return null;
};

const parseCompoundLabel = (value: unknown): string => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return compoundLabelFromCode(value);
    }

    if (typeof value !== 'string') return '---';

    const v = value.trim().toUpperCase();
    if (!v) return '---';
    if (v === 'M') return 'MEDIUM';
    if (v === 'S') return 'SOFT';
    if (v === 'H') return 'HARD';
    if (v === 'I') return 'INTER';
    if (v === 'W') return 'WET';

    return v;
};

const pickFirstObject = (...candidates: unknown[]): Record<string, unknown> | undefined => {
    return candidates.find((candidate) => !!candidate && typeof candidate === 'object' && !Array.isArray(candidate)) as Record<string, unknown> | undefined;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toPathCandidate = (root: any, path: string): unknown => {
    return path.split('.').reduce((acc: any, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), root);
};

const pickFromPaths = (root: any, paths: string[]) => {
    for (const path of paths) {
        const candidate = toPathCandidate(root, path);
        if (isPlainObject(candidate) && Object.keys(candidate).length > 0) {
            return { data: candidate, source: path };
        }
    }
    return { data: undefined, source: undefined as string | undefined };
};

const DEFAULT_ELECTRONICS: LmuElectronics = {
    tc: 0,
    tc_max: 0,
    tc_slip: 0,
    tc_slip_max: 0,
    tc_cut: 0,
    tc_cut_max: 0,
    abs: 0,
    abs_max: 0,
    brake_migration: 0,
    ...( { brake_bias: 0, brakeBias: 0 } as Partial<LmuElectronics>),
    brake_migration_max: 0,
    motor_map: 0,
    motor_map_max: 0,
    anti_sway_front: 0,
    anti_sway_front_max: 0,
    anti_sway_rear: 0,
    anti_sway_rear_max: 0,
    tc_active: false,
    abs_active: false,
    speed_limiter_active: false,
    wiper_state: 0
};

const DEFAULT_VEC3: Vec3 = { x: 0, y: 0, z: 0 };

const DEFAULT_RESTAPI: RestApiData = {
    time_scale: 1,
    track_clock_time: -1,
    private_qualifying: 0,
    steering_wheel_range: 0,
    current_virtual_energy: 0,
    max_virtual_energy: 0,
    expected_fuel_consumption: 0,
    expected_virtual_energy_consumption: 0,
    aero_damage: -1,
    penalty_time: 0,
    suspension_damage: [0, 0, 0, 0],
    stint_usage: {},
    pit_stop_estimate: [0, 0, 0, 0, 0]
};

const toNumberSafe = (value: unknown, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const toBoolSafe = (value: unknown, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    return fallback;
};

const normalizeElectronics = (incoming: Record<string, unknown> | undefined, prev?: LmuElectronics): LmuElectronics | undefined => {
    if (!incoming && !prev) return undefined;
    const base = prev || DEFAULT_ELECTRONICS;
    const src = incoming || {};

    return {
        tc: toNumberSafe(src.tc, base.tc),
        tc_max: toNumberSafe(src.tc_max, base.tc_max),
        tc_slip: toNumberSafe(src.tc_slip, base.tc_slip),
        tc_slip_max: toNumberSafe(src.tc_slip_max, base.tc_slip_max),
        tc_cut: toNumberSafe(src.tc_cut, base.tc_cut),
        tc_cut_max: toNumberSafe(src.tc_cut_max, base.tc_cut_max),
        abs: toNumberSafe(src.abs, base.abs),
        abs_max: toNumberSafe(src.abs_max, base.abs_max),
        brake_migration: toNumberSafe(src.brake_migration, base.brake_migration),
        ...( {
            brake_bias: toNumberSafe(src.brake_bias ?? src.brakeBias, toNumberSafe((base as any).brake_bias, (base as any).brakeBias))
        } as Partial<LmuElectronics>),
        brake_migration_max: toNumberSafe(src.brake_migration_max, base.brake_migration_max),
        motor_map: toNumberSafe(src.motor_map, base.motor_map),
        motor_map_max: toNumberSafe(src.motor_map_max, base.motor_map_max),
        anti_sway_front: toNumberSafe(src.anti_sway_front, base.anti_sway_front),
        anti_sway_front_max: toNumberSafe(src.anti_sway_front_max, base.anti_sway_front_max),
        anti_sway_rear: toNumberSafe(src.anti_sway_rear, base.anti_sway_rear),
        anti_sway_rear_max: toNumberSafe(src.anti_sway_rear_max, base.anti_sway_rear_max),
        tc_active: toBoolSafe(src.tc_active, base.tc_active),
        abs_active: toBoolSafe(src.abs_active, base.abs_active),
        speed_limiter_active: toBoolSafe(src.speed_limiter_active, base.speed_limiter_active),
        wiper_state: toNumberSafe(src.wiper_state, base.wiper_state)
    };
};

const readBrakeBias = (...candidates: unknown[]): number | undefined => {
    for (const candidate of candidates) {
        const val = Number(candidate);
        if (Number.isFinite(val) && val > 0) return 100-(val*100);
    }
    return undefined;
};

const normalizeSetupList = (raw: unknown): SetupSummary[] => {
    const source = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object' && Array.isArray((raw as any).setups) ? (raw as any).setups : []);

    return source
        .map((entry: any, idx: number) => {
            if (typeof entry === 'string') {
                return { id: entry, name: entry } as SetupSummary;
            }

            if (!entry || typeof entry !== 'object') return null;

            const id = String(entry.id ?? entry.setupId ?? entry.name ?? `setup-${idx}`);
            const name = String(entry.name ?? entry.label ?? entry.setupName ?? id);
            return {
                id,
                name,
                car: entry.car ? String(entry.car) : undefined,
                updatedAt: entry.updatedAt ? String(entry.updatedAt) : undefined
            } as SetupSummary;
        })
        .filter(Boolean) as SetupSummary[];
};

const compoundLabelFromCode = (code: number): string => {
    switch (code) {
        case 0: return 'SOFT';
        case 1: return 'MEDIUM';
        case 2: return 'HARD';
        case 3: return 'WET';
        default: return '---';
    }
};

const getCompoundFromWheelExtra = (wheelExtra: any): string => {
    if (!wheelExtra || typeof wheelExtra !== 'object') return '---';

    const typeCode = Number(wheelExtra.compound_type ?? wheelExtra.compoundType ?? wheelExtra.compound);
    if (!Number.isNaN(typeCode) && typeCode > 0) {
        return compoundLabelFromCode(typeCode);
    }

    const indexCode = Number(wheelExtra.compound_index ?? wheelExtra.compoundIndex);
    if (!Number.isNaN(indexCode) && indexCode > 0) {
        return compoundLabelFromCode(indexCode);
    }

    return '---';
};

const normalizeWheelsExtra = (rawExtra: any, prevExtra: any) => {
    const prevSafe = prevExtra || {};

    if (!rawExtra || typeof rawExtra !== 'object') {
        return prevSafe;
    }

    // Some providers send { fl,fr,rl,rr }, others arrays or aliased keys.
    const next: any = { ...prevSafe };
    let hasAnyWheel = false;

    if (Array.isArray(rawExtra)) {
        WHEEL_KEYS.forEach((wheel, idx) => {
            const incoming = rawExtra[idx];
            if (incoming && typeof incoming === 'object') {
                next[wheel] = { ...(prevSafe[wheel] || {}), ...incoming };
                hasAnyWheel = true;
            }
        });
        return hasAnyWheel ? next : prevSafe;
    }

    Object.keys(rawExtra).forEach((rawKey) => {
        const wheel = getWheelAlias(rawKey);
        if (!wheel) return;

        const incoming = rawExtra[rawKey];
        if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
            next[wheel] = { ...(prevSafe[wheel] || {}), ...incoming };
            hasAnyWheel = true;
        }
    });

    return hasAnyWheel ? next : prevSafe;
};

const normalizeTireCompounds = (rawCompounds: any, prevCompounds: typeof DEFAULT_COMPOUNDS, wheelExtra: any) => {
    const prevSafe = prevCompounds || DEFAULT_COMPOUNDS;
    const next = { ...prevSafe };

    if (Array.isArray(rawCompounds)) {
        WHEEL_KEYS.forEach((wheel, idx) => {
            const value = parseCompoundLabel(rawCompounds[idx]);
            if (value !== '---') {
                next[wheel] = value;
            }
        });
    } else if (rawCompounds && typeof rawCompounds === 'object') {
        Object.keys(rawCompounds).forEach((rawKey) => {
            const wheel = getWheelAlias(rawKey);
            if (!wheel) return;

            const value = parseCompoundLabel(rawCompounds[rawKey]);
            if (value !== '---') {
                next[wheel] = value;
            }
        });
    }

    // LMU extra is more reliable wheel-by-wheel, so it overrides generic compounds.
    WHEEL_KEYS.forEach((wheel) => {
        const inferred = getCompoundFromWheelExtra(wheelExtra?.[wheel]);
        if (inferred !== '---') {
            next[wheel] = inferred;
        }
    });

    return next;
};

export const useRaceData = (teamId: string) => {
    const SESSION_ID = teamId;
    const CHAT_ID = "global-radio";

    const [manualFuelTarget, setManualFuelTarget] = useState<number | null>(null);
    const [manualVETarget, setManualVETarget] = useState<number | null>(null);
    const [setups, setSetups] = useState<SetupSummary[]>([]);
    const [setupsLoading, setSetupsLoading] = useState(false);
    const [setupsError, setSetupsError] = useState<string | null>(null);
    const [setupApplyStatus, setSetupApplyStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [applyingSetupId, setApplyingSetupId] = useState<string | null>(null);
    const [lastTestedEndpoints, setLastTestedEndpoints] = useState<{ list: string; load: string }>({ list: '', load: '' });

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
        trackGripLevel: '-',
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
            fuel: {current: 0, max: 100, lastLapCons: 0, averageCons: 0},
            VE: {VEcurrent: 100, VElastLapCons: 0, VEaverageCons: 0},
            batterySoc: 0,
            electric: {charge: 0, torque: 0, rpm: 0, motorTemp: 0, waterTemp: 0, state: 0},
            tires: {fl: 100, fr: 100, rl: 100, rr: 100},
            tirePressures: {fl: 0, fr: 0, rl: 0, rr: 0},
            tireTemps: {fl: [], fr: [], rl: [], rr: []},
            brakeTemps: {flc: 0, frc: 0, rlc: 0, rrc: 0},
            tireCompounds: {fl: "---", fr: "---", rl: "---", rr: "---"},
            leaderLaps: 0, leaderAvgLapTime: 0,
            strategyEstPitTime: 0, strategyPitFuel: 0, strategyPitLaps: 0,
            inPitLane: false, inGarage: true, pitLimiter: false, damageIndex: 0, isOverheating: false,
            brakeWear: {
                fl: 0,
                fr: 0,
                rl: 0,
                rr: 0
            },
            windSpeed: 0,
            brakeBias: 0,
            turboPressure: 0,
            engineTorque: 0,
            steeringShaftTorque: 0,
            localVelocity: { ...DEFAULT_VEC3 },
            localAcceleration: { ...DEFAULT_VEC3 },
            localRotAcceleration: { ...DEFAULT_VEC3 },
            carState: { speed_limiter: false, headlights: false, ignition: 0, drs: false, attack_mode: 0 },
            vehicleHealth: {
                overheating: false,
                tire_flat_count: 0,
                wheel_detached_count: 0,
                dents_max: 0,
                by_wheel: {
                    fl: { flat: false, detached: false },
                    fr: { flat: false, detached: false },
                    rl: { flat: false, detached: false },
                    rr: { flat: false, detached: false }
                }
            },
            virtualEnergyMax: 100,
            restapiExpectedFuelConsumption: 0,
            restapiExpectedVEConsumption: 0,
            restapiAeroDamage: -1,
            restapiSuspensionDamage: [0, 0, 0, 0],
            restapiPenaltyTime: 0,
            lmu_extra: {},
            lmu_extra_wheels: {}
        },
        restapi: { ...DEFAULT_RESTAPI },
        extendedPitLimit: 0,
        userGlobalRole: 'DRIVER',
        userTeamRole: 'MEMBER'
    });

    const [status, setStatus] = useState("CONNECTING...");
    const [localRaceTime, setLocalRaceTime] = useState(0);
    const [localStintTime, setLocalStintTime] = useState(0);
    const socketRef = useRef<Socket | null>(null);
    const currentTrackLoadedRef = useRef<string>("");
    const isRaceRunningRef = useRef(false);
    const activeDriverIdRef = useRef<number | string>(1);
    const pitCooldownRef = useRef(false);
    const electronicsDebugCountRef = useRef(0);

    const tId = teamId.toLowerCase();
    const isHypercar = tId.includes('hyper');
    const isLMGT3 = tId.includes('gt3');
    const isLMP3 = tId.includes('lmp3');
    const isLMP2ELMS = tId.includes('elms');
    const sessionMode = normalizeSessionMode(gameState.sessionType);

    // --- LOGIQUE DE TRAITEMENT DES DONNÉES ---
    const processGameUpdate = useCallback((prev: GameState, docData: Partial<GameState> & Record<string, unknown>): GameState => {
        const tele = (docData.telemetry || {}) as RawTelemetry;
        const scoring = (docData.scoring || {}) as RawScoring;
        const pit = (docData.pit || {}) as RawPit;
        const weather = (docData.weather_det || {}) as RawWeather;
        const rules = (docData.rules || {}) as RawRules;
        const restapi = ((docData as any).restapi || {}) as Partial<RestApiData>;
        const extended = ((docData as any).extended || {}) as { pit_limit?: number };

        const resolveVec3 = (value: unknown, fallback: Vec3): Vec3 => {
            if (!value || typeof value !== 'object') return fallback;
            const src = value as Record<string, unknown>;
            return {
                x: toNumberSafe(src.x, fallback.x),
                y: toNumberSafe(src.y, fallback.y),
                z: toNumberSafe(src.z, fallback.z)
            };
        };

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
        let weatherStatus: string;
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
        const vData: RawScoring['vehicle_data'] | undefined = scoring.vehicle_data;
        const classPos = Number(vData?.classPosition ?? 0);
        const overallPos = Number(vData?.position ?? 0);
        if (classPos > 0) myPosition = classPos;
        else if (overallPos > 0) myPosition = overallPos;

        let calculatedAvg = prev.avgLapTimeSeconds;
        if (calculatedAvg === 0 || isNaN(calculatedAvg)) {
            const bestLap = Number(scoring.vehicle_data?.best_lap || prev.telemetry.bestLap || 0);
            if (bestLap > 0) calculatedAvg = bestLap;
        }

        const prevVE = prev.telemetry.VE || { VEcurrent: 100, VElastLapCons: 0, VEaverageCons: 0 };
        const prevFuel = prev.telemetry.fuel || { current: 0, max: 100, lastLapCons: 0, averageCons: 0 };
        const playerVehicle = Array.isArray(scoring.vehicles) ? scoring.vehicles.find((v: any) => v?.is_player === 1) : undefined;

        const wheelsExtraCandidate = pickFirstObject(
            tele.lmu_wheels_extra,
            (tele as any).wheels_extra,
            (tele as any).lmuWheelsExtra,
            (tele.tires as any)?.wheels_extra,
            (docData as any).lmu_wheels_extra,
            (docData as any).wheels_extra,
            (playerVehicle as any)?.lmu_wheels_extra,
            (playerVehicle as any)?.wheels_extra
        );
        const normalizedWheelsExtra = normalizeWheelsExtra(wheelsExtraCandidate, prev.telemetry.lmu_wheels_extra);

        const compoundsCandidate =
            tele.tires?.compounds
            ?? (tele as any).tire_compounds
            ?? (tele as any).tireCompounds
            ?? (docData as any).tireCompounds
            ?? (playerVehicle as any)?.tires?.compounds
            ?? (playerVehicle as any)?.tireCompounds;
        const normalizedCompounds = normalizeTireCompounds(compoundsCandidate, prev.telemetry.tireCompounds || DEFAULT_COMPOUNDS, normalizedWheelsExtra);

        const electronicsPathCandidates = [
            'telemetry.lmu_electronics',
            'telemetry.lmuElectronics',
            'telemetry.electronics',
            'telemetry.car_state',
            'lmu_electronics',
            'electronics',
            'lmu.electronics',
            'car_state',
            'scoring.vehicle_data.lmu_electronics',
            'scoring.vehicle_data.electronics'
        ];
        const electronicsFromDoc = pickFromPaths(docData, electronicsPathCandidates);
        const electronicsCandidate = pickFirstObject(
            tele.lmu_electronics,
            (tele as any).lmuElectronics,
            (tele as any).electronics,
            (tele as any).car_state,
            electronicsFromDoc.data,
            (playerVehicle as any)?.lmu_electronics,
            (playerVehicle as any)?.electronics
        );

        const brakeBiasCandidate = readBrakeBias(
            (tele as any).brake_bias,
            (tele as any).brakeBias,
            (tele as any).car_state?.brake_bias,
            (tele as any).car_state?.brakeBias,
            (docData as any).brake_bias,
            (docData as any).brakeBias,
            (docData as any).telemetry?.brake_bias,
            (docData as any).telemetry?.brakeBias,
            (docData as any).car_state?.brake_bias,
            (playerVehicle as any)?.brake_bias
        );

        const mergedElectronicsCandidate =
            brakeBiasCandidate !== undefined
                ? { ...(electronicsCandidate || {}), brake_bias: brakeBiasCandidate }
                : electronicsCandidate;

        if (!electronicsCandidate && electronicsDebugCountRef.current < 8) {
            electronicsDebugCountRef.current += 1;
            console.log('[LMU DEBUG] electronics missing', {
                count: electronicsDebugCountRef.current,
                telemetryKeys: Object.keys((docData as any).telemetry || {}),
                scoringVehicleDataKeys: Object.keys((docData as any).scoring?.vehicle_data || {}),
                playerVehicleKeys: Object.keys(playerVehicle || {}),
                hasWheelsExtra: Boolean(wheelsExtraCandidate),
                hasCompounds: Boolean(compoundsCandidate),
                sourceTried: electronicsPathCandidates,
                fromDocSource: electronicsFromDoc.source
            });
        }

        const newTelemetry: TelemetryData = {
            ...prev.telemetry,
            laps: Number(tele.laps || scoring.vehicle_data?.laps || prev.telemetry.laps),
            curLap: Number(tele.times?.current || prev.telemetry.curLap),
            lastLap: Number(scoring.vehicle_data?.last_lap || prev.telemetry.lastLap),
            bestLap: Number(scoring.vehicle_data?.best_lap || prev.telemetry.bestLap),
            position: myPosition,

            speed: tele.speed !== undefined ? Number(tele.speed) : prev.telemetry.speed,
            rpm: tele.rpm !== undefined ? Number(tele.rpm) : prev.telemetry.rpm,
            maxRpm: tele.maxRpm || prev.telemetry.maxRpm || 8000,
            gear: tele.gear !== undefined ? Number(tele.gear) : prev.telemetry.gear,
            brakeBias: brakeBiasCandidate ?? prev.telemetry.brakeBias,
            turboPressure: toNumberSafe((tele as any).turbo_pressure, prev.telemetry.turboPressure || 0),
            engineTorque: toNumberSafe((tele as any).engine_torque, prev.telemetry.engineTorque || 0),
            steeringShaftTorque: toNumberSafe((tele as any).steering_shaft_torque, prev.telemetry.steeringShaftTorque || 0),
            localVelocity: resolveVec3((tele as any).local_velocity, prev.telemetry.localVelocity || DEFAULT_VEC3),
            localAcceleration: resolveVec3((tele as any).local_acceleration, prev.telemetry.localAcceleration || DEFAULT_VEC3),
            localRotAcceleration: resolveVec3((tele as any).local_rot_acceleration, prev.telemetry.localRotAcceleration || DEFAULT_VEC3),
            carState: {
                speed_limiter: toBoolSafe((tele as any).car_state?.speed_limiter, prev.telemetry.carState?.speed_limiter || false),
                headlights: toBoolSafe((tele as any).car_state?.headlights, prev.telemetry.carState?.headlights || false),
                ignition: toNumberSafe((tele as any).car_state?.ignition, prev.telemetry.carState?.ignition || 0),
                drs: toBoolSafe((tele as any).car_state?.drs, prev.telemetry.carState?.drs || false),
                attack_mode: toNumberSafe((tele as any).car_state?.attack_mode, prev.telemetry.carState?.attack_mode || 0)
            },
            vehicleHealth: {
                overheating: toBoolSafe((tele as any).vehicle_health?.overheating, prev.telemetry.vehicleHealth?.overheating || false),
                tire_flat_count: toNumberSafe((tele as any).vehicle_health?.tire_flat_count, prev.telemetry.vehicleHealth?.tire_flat_count || 0),
                wheel_detached_count: toNumberSafe((tele as any).vehicle_health?.wheel_detached_count, prev.telemetry.vehicleHealth?.wheel_detached_count || 0),
                dents_max: toNumberSafe((tele as any).vehicle_health?.dents_max, prev.telemetry.vehicleHealth?.dents_max || 0),
                by_wheel: {
                    fl: {
                        flat: toBoolSafe((tele as any).vehicle_health?.by_wheel?.fl?.flat, prev.telemetry.vehicleHealth?.by_wheel?.fl?.flat || false),
                        detached: toBoolSafe((tele as any).vehicle_health?.by_wheel?.fl?.detached, prev.telemetry.vehicleHealth?.by_wheel?.fl?.detached || false)
                    },
                    fr: {
                        flat: toBoolSafe((tele as any).vehicle_health?.by_wheel?.fr?.flat, prev.telemetry.vehicleHealth?.by_wheel?.fr?.flat || false),
                        detached: toBoolSafe((tele as any).vehicle_health?.by_wheel?.fr?.detached, prev.telemetry.vehicleHealth?.by_wheel?.fr?.detached || false)
                    },
                    rl: {
                        flat: toBoolSafe((tele as any).vehicle_health?.by_wheel?.rl?.flat, prev.telemetry.vehicleHealth?.by_wheel?.rl?.flat || false),
                        detached: toBoolSafe((tele as any).vehicle_health?.by_wheel?.rl?.detached, prev.telemetry.vehicleHealth?.by_wheel?.rl?.detached || false)
                    },
                    rr: {
                        flat: toBoolSafe((tele as any).vehicle_health?.by_wheel?.rr?.flat, prev.telemetry.vehicleHealth?.by_wheel?.rr?.flat || false),
                        detached: toBoolSafe((tele as any).vehicle_health?.by_wheel?.rr?.detached, prev.telemetry.vehicleHealth?.by_wheel?.rr?.detached || false)
                    }
                }
            },
            virtualEnergyMax: toNumberSafe(tele.max_virtual_energy, prev.telemetry.virtualEnergyMax || 100),
            carCategory: scoring.vehicle_data?.class
                || (Array.isArray(scoring.vehicles) ? scoring.vehicles.find(v => v.is_player === 1)?.class : undefined)
                || prev.telemetry.carCategory,

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
            tireCompounds: normalizedCompounds,
            leaderLaps: tele.leaderLaps ?? prev.telemetry.leaderLaps,
            leaderAvgLapTime: tele.leaderAvgLapTime ?? prev.telemetry.leaderAvgLapTime,
            windSpeed: scoring.weather?.wind_speed ?? prev.telemetry.windSpeed,
            brakeWear: {
                    fl: tele.tires?.brake_wear?.[0] ?? prev.telemetry.brakeWear.fl,
                        fr: tele.tires?.brake_wear?.[1] ?? prev.telemetry.brakeWear.fr,
                       rl: tele.tires?.brake_wear?.[2] ?? prev.telemetry.brakeWear.rl,
                            rr: tele.tires?.brake_wear?.[3] ?? prev.telemetry.brakeWear.rr,
             },
            strategyEstPitTime: Number(pit.strategy?.time_min || prev.telemetry.strategyEstPitTime),
            strategyPitFuel: toNumberSafe(pit.strategy?.fuel_to_add, prev.telemetry.strategyPitFuel || 0),
            strategyPitLaps: toNumberSafe(pit.strategy?.laps_to_add, prev.telemetry.strategyPitLaps || 0),
            inPitLane: Boolean(scoring.vehicle_data?.in_pits ?? prev.telemetry.inPitLane),
            inGarage: (rules.my_status?.pits_open === false),
            // V4 hardcodes pit_limit=60.0 → use in_pits proxy
            pitLimiter: Boolean(scoring.vehicle_data?.in_pits ?? prev.telemetry.pitLimiter),
            damageIndex: prev.telemetry.damageIndex,
            isOverheating: prev.telemetry.isOverheating,
            lmu_electronics: normalizeElectronics(mergedElectronicsCandidate, prev.telemetry.lmu_electronics),
            lmu_wheels_extra: normalizedWheelsExtra,
            lmu_extra: isPlainObject((tele as any).lmu_extra) ? ((tele as any).lmu_extra as Record<string, unknown>) : (prev.telemetry.lmu_extra || {}),
            lmu_extra_wheels: isPlainObject((tele as any).lmu_wheels_extra) ? ((tele as any).lmu_wheels_extra as Record<string, unknown>) : (prev.telemetry.lmu_extra_wheels || {}),
            restapiExpectedFuelConsumption: toNumberSafe(restapi.expected_fuel_consumption, prev.telemetry.restapiExpectedFuelConsumption || 0),
            restapiExpectedVEConsumption: toNumberSafe(restapi.expected_virtual_energy_consumption, prev.telemetry.restapiExpectedVEConsumption || 0),
            restapiAeroDamage: toNumberSafe(restapi.aero_damage, prev.telemetry.restapiAeroDamage || -1),
            restapiSuspensionDamage: Array.isArray(restapi.suspension_damage) ? restapi.suspension_damage.map(v => toNumberSafe(v, 0)) : (prev.telemetry.restapiSuspensionDamage || [0, 0, 0, 0]),
            restapiPenaltyTime: toNumberSafe(restapi.penalty_time, prev.telemetry.restapiPenaltyTime || 0)
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
            allVehicles: (scoring.vehicles as import('../types/index').RawVehicle[]) || prev.allVehicles || [],
            lapHistory: (docData.lapHistory as LapData[]) || prev.lapHistory || [],
            stintConfig: (docData.stintConfig as Record<string, import('../types/index').StintConfig>) || prev.stintConfig || {},
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
            trackGripLevel: (scoring.weather?.track_grip_level ?? prev.trackGripLevel),
            rainIntensity: (weather.rain_intensity ?? prev.rainIntensity),
            telemetry: newTelemetry,
            avgLapTimeSeconds: calculatedAvg,
            position: myPosition,
            restapi: {
                time_scale: toNumberSafe(restapi.time_scale, prev.restapi?.time_scale ?? DEFAULT_RESTAPI.time_scale),
                track_clock_time: toNumberSafe(restapi.track_clock_time, prev.restapi?.track_clock_time ?? DEFAULT_RESTAPI.track_clock_time),
                private_qualifying: toNumberSafe(restapi.private_qualifying, prev.restapi?.private_qualifying ?? DEFAULT_RESTAPI.private_qualifying),
                steering_wheel_range: toNumberSafe(restapi.steering_wheel_range, prev.restapi?.steering_wheel_range ?? DEFAULT_RESTAPI.steering_wheel_range),
                current_virtual_energy: toNumberSafe(restapi.current_virtual_energy, prev.restapi?.current_virtual_energy ?? DEFAULT_RESTAPI.current_virtual_energy),
                max_virtual_energy: toNumberSafe(restapi.max_virtual_energy, prev.restapi?.max_virtual_energy ?? DEFAULT_RESTAPI.max_virtual_energy),
                expected_fuel_consumption: toNumberSafe(restapi.expected_fuel_consumption, prev.restapi?.expected_fuel_consumption ?? DEFAULT_RESTAPI.expected_fuel_consumption),
                expected_virtual_energy_consumption: toNumberSafe(restapi.expected_virtual_energy_consumption, prev.restapi?.expected_virtual_energy_consumption ?? DEFAULT_RESTAPI.expected_virtual_energy_consumption),
                aero_damage: toNumberSafe(restapi.aero_damage, prev.restapi?.aero_damage ?? DEFAULT_RESTAPI.aero_damage),
                penalty_time: toNumberSafe(restapi.penalty_time, prev.restapi?.penalty_time ?? DEFAULT_RESTAPI.penalty_time),
                suspension_damage: Array.isArray(restapi.suspension_damage) ? restapi.suspension_damage.map(v => toNumberSafe(v, 0)) : (prev.restapi?.suspension_damage ?? DEFAULT_RESTAPI.suspension_damage),
                stint_usage: isPlainObject(restapi.stint_usage) ? restapi.stint_usage : (prev.restapi?.stint_usage ?? DEFAULT_RESTAPI.stint_usage),
                pit_stop_estimate: Array.isArray(restapi.pit_stop_estimate) ? restapi.pit_stop_estimate : (prev.restapi?.pit_stop_estimate ?? DEFAULT_RESTAPI.pit_stop_estimate)
            },
            extendedPitLimit: toNumberSafe(extended.pit_limit, prev.extendedPitLimit)
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
        try {
            localStorage.setItem(cacheKey, JSON.stringify(toCache));
        } catch {
            // Ignore storage quota/private mode errors.
        }
    }, [
        gameState.currentStint,
        gameState.activeDriverId,
        gameState.drivers,
        gameState.stintConfig,
        gameState.stintAssignments,
        gameState.stintNotes,
        gameState.fuelCons,
        gameState.veCons,
        gameState.tankCapacity,
        gameState.raceDurationHours,
        gameState.trackName,
        gameState.isRaceRunning,
        cacheKey
    ]);

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
        } catch {
            // Ignore invalid cache payloads.
        }
    }, [cacheKey]);

    // --- SYNC ---
    const syncUpdate = useCallback((changes: Partial<GameState>) => {
        setGameState(prev => ({ ...prev, ...changes }));
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('update_strategy', { teamId: SESSION_ID, changes });
        }
    }, [SESSION_ID]);

    // --- MAP AUTO-LOAD ---
    useEffect(() => {
        const trackName = gameState.trackName;
        const trackLen = Math.round(gameState.trackLength || 0);
        const uniqueMapId = (trackName && trackLen > 0) ? `${trackName}_${trackLen}` : trackName;

        if (uniqueMapId && uniqueMapId !== "WAITING..." && uniqueMapId !== "Unknown" && currentTrackLoadedRef.current !== uniqueMapId) {
            fetch(`${API_BASE_URL}/api/tracks/${encodeURIComponent(uniqueMapId)}`)
                .then(res => res.ok ? res.json() : [])
                .then(points => { if (points.length > 0) syncUpdate({ trackMap: points }); })
                .catch(() => {
                    // Ignore track auto-load failures; live data still works.
                });
            currentTrackLoadedRef.current = uniqueMapId;
        }
    }, [gameState.trackName, gameState.trackLength, syncUpdate]);

    // --- PERMISSIONS ---
    const canEditStrategy = true;
    const canManageLineup =
        gameState.userGlobalRole === 'ADMIN'
        || gameState.userTeamRole === 'LEADER'
        || gameState.userTeamRole === 'MEMBER';
    const canAccessAdmin = gameState.userGlobalRole === 'ADMIN' || gameState.userTeamRole === 'LEADER';

    const saveTrackMap = useCallback((points: MapPoint[]) => {
        syncUpdate({ trackMap: points });
        const uniqueMapId = `${gameState.trackName}_${Math.round(gameState.trackLength || 0)}`;
        fetch(`${API_BASE_URL}/api/tracks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackName: uniqueMapId, points })
        }).catch(console.error);
    }, [gameState.trackName, gameState.trackLength, syncUpdate]);

    const fetchSetups = useCallback(async () => {
        setSetupsLoading(true);
        setSetupsError(null);
        try {
            let response: Response | null = null;
            let successUrl = '';

            // Try VPS proxy first (CORS-safe)
            console.log(`[Setup] Trying VPS proxy GET ${API_BASE_URL}${VPS_BRIDGE_SETUPS_LIST}`);
            try {
                const proxyUrl = `${API_BASE_URL}${VPS_BRIDGE_SETUPS_LIST}`;
                const proxyResp = await fetch(proxyUrl);
                if (proxyResp.ok) {
                    const payload = await proxyResp.json();
                    setSetups(normalizeSetupList(payload));
                    setLastTestedEndpoints(prev => ({ ...prev, list: `VPS:${VPS_BRIDGE_SETUPS_LIST}` }));
                    setSetupsLoading(false);
                    return;
                }
            } catch {
                console.log(`[Setup] VPS proxy failed, trying local endpoints...`);
            }

            for (const endpoint of SETUPS_LIST_ENDPOINTS) {
                const url = `${LMU_API_BASE_URL}${endpoint}`;
                console.log(`[Setup] Trying GET ${url}`);
                try {
                    response = await fetch(url);
                    if (response.ok) {
                        successUrl = endpoint;
                        break;
                    }
                } catch {
                    // Continue to next endpoint
                }
            }

            if (!response || !response.ok) {
                setSetupsError(`Tried endpoints: ${SETUPS_LIST_ENDPOINTS.join(', ')} -> all returned 404 or failed`);
                setSetups([]);
                return;
            }

            const payload = await response.json();
            setSetups(normalizeSetupList(payload));
            setLastTestedEndpoints(prev => ({ ...prev, list: successUrl }));
        } catch (error) {
            setSetupsError(error instanceof Error ? error.message : 'Unable to fetch setups');
            setSetups([]);
        } finally {
            setSetupsLoading(false);
        }
    }, []);

    const applySetup = useCallback(async (setupId: string) => {
        if (!setupId) return;

        setApplyingSetupId(setupId);
        setSetupApplyStatus(null);
        try {
            let response: Response | null = null;
            let successUrl = '';

            // Try VPS proxy first (CORS-safe)
            console.log(`[Setup] Trying VPS proxy POST ${API_BASE_URL}${VPS_BRIDGE_SETUPS_APPLY} with setupId=${setupId}`);
            try {
                const proxyUrl = `${API_BASE_URL}${VPS_BRIDGE_SETUPS_APPLY}`;
                const proxyResp = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ setupId })
                });

                if (proxyResp.ok || proxyResp.status === 200 || proxyResp.status === 201) {
                    const payload = await proxyResp.json().catch(() => ({}));
                    if (payload?.ok !== false) {
                        setLastTestedEndpoints(prev => ({ ...prev, load: `VPS:${VPS_BRIDGE_SETUPS_APPLY}` }));
                        setSetupApplyStatus({ type: 'success', message: payload?.message || `Setup '${setupId}' loaded` });
                        setApplyingSetupId(null);
                        return;
                    }
                }
            } catch {
                console.log(`[Setup] VPS proxy failed, trying local endpoints...`);
            }

            for (const endpoint of SETUPS_LOAD_ENDPOINTS) {
                const url = `${LMU_API_BASE_URL}${endpoint}`;
                console.log(`[Setup] Trying POST ${url} with setupId=${setupId}`);
                try {
                    response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ setupId })
                    });
                    if (response.ok || response.status === 200 || response.status === 201) {
                        successUrl = endpoint;
                        break;
                    }
                } catch {
                    // Continue to next endpoint
                }
            }

            if (!response) {
                setSetupApplyStatus({ type: 'error', message: 'All POST endpoints failed for setup load' });
                return;
            }

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload?.ok === false) {
                setSetupApplyStatus({
                    type: 'error',
                    message: payload?.message || `Endpoint ${successUrl} returned HTTP ${response.status}`
                });
                return;
            }

            setLastTestedEndpoints(prev => ({ ...prev, load: successUrl }));
            setSetupApplyStatus({ type: 'success', message: payload?.message || `Setup '${setupId}' loaded` });
        } catch (error) {
            setSetupApplyStatus({
                type: 'error',
                message: error instanceof Error ? error.message : `Failed to load setup '${setupId}'`
            });
        } finally {
            setApplyingSetupId(null);
        }
    }, []);

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
            sessionMode,
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
        localRaceTime, isHypercar, isLMGT3, manualFuelTarget, manualVETarget, sessionMode
    ]);

    const confirmPitStop = () => {
        if (pitCooldownRef.current) return;
        pitCooldownRef.current = true;
        setTimeout(() => { pitCooldownRef.current = false; }, 2000);

        const resolvePlannedDriverId = (stintIdx: number): number | string | undefined => {
            const configured = gameState.stintConfig?.[stintIdx]?.driverId;
            if (configured !== undefined && configured !== null && configured !== '') return configured;

            const legacy = gameState.stintAssignments?.[stintIdx as unknown as keyof typeof gameState.stintAssignments];
            if (legacy !== undefined && legacy !== null && legacy !== '') return legacy;

            if (!gameState.drivers.length) return undefined;
            const currentIdx = gameState.drivers.findIndex(d => d.id === gameState.activeDriverId);
            if (currentIdx < 0) return gameState.drivers[0]?.id;
            return gameState.drivers[(currentIdx + 1) % gameState.drivers.length]?.id;
        };

        const nextStint = (gameState.currentStint || 0) + 1;
        const nextDriverId = resolvePlannedDriverId(nextStint);
        syncUpdate({ currentStint: nextStint, activeDriverId: nextDriverId, stintDuration: 0 });
        setLocalStintTime(0);
    };

    const undoPitStop = () => {
        if(gameState.currentStint > 0) {
            const prevStint = gameState.currentStint - 1;
            const prevDriverId = gameState.stintConfig?.[prevStint]?.driverId
                || gameState.stintAssignments?.[prevStint as unknown as keyof typeof gameState.stintAssignments]
                || gameState.drivers[0]?.id;
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

    const updateStintConfigBulk = (idx: number, patch: Record<string, unknown>) => {
        const newConfig = { ...gameState.stintConfig };
        if (!newConfig[idx]) newConfig[idx] = {};
        newConfig[idx] = { ...newConfig[idx], ...patch };
        syncUpdate({ stintConfig: newConfig });
    };

    return {
        gameState, syncUpdate, status, localRaceTime, localStintTime, strategyData,
        confirmPitStop, undoPitStop, resetRace, CHAT_ID, isHypercar, isLMGT3, isLMP3, isLMP2ELMS,
        sessionMode,
        setManualFuelTarget, setManualVETarget, updateStintConfig, updateStintConfigBulk, saveTrackMap,
        setups, setupsLoading, setupsError, setupApplyStatus, applyingSetupId, fetchSetups, applySetup, lastTestedEndpoints,
        sendMessage: (msg: ChatMessage) => {
            setGameState(prev => {
                const msgs = [...prev.chatMessages, msg];
                return { ...prev, chatMessages: msgs.length > 500 ? msgs.slice(-500) : msgs };
            });
            socketRef.current?.emit('send_chat_message', { teamId: SESSION_ID, message: msg });
        },
        canEditStrategy,
        canManageLineup,
        canAccessAdmin,
        userRole: gameState.userTeamRole
    };
};


export interface Driver {
    id: number | string;
    name: string;
    phone?: string;
    color: string;
    text?: string;
    totalDriveTime?: number;
}

export type SessionMode = 'RACE' | 'QUALIFY' | 'PRACTICE' | 'UNKNOWN';

export interface FuelData {
    current: number;
    max: number;
    lastLapCons: number;
    averageCons: number;
}

export interface VirtualEnergyData {
    VEcurrent: number;
    VElastLapCons: number;
    VEaverageCons: number;
}

export interface ElectricData {
    charge: number;      // 0.0 à 1.0 (Pourcent batterie)
    torque: number;      // Couple moteur électrique
    rpm: number;         // Régime moteur électrique
    motorTemp: number;   // <--- CORRIGÉ (était temp_motor)
    waterTemp: number;   // <--- CORRIGÉ (était temp_water)
    state: number;
}

export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

export interface CarStateData {
    speed_limiter: boolean;
    headlights: boolean;
    ignition: number;
    drs: boolean;
    attack_mode: number;
}

export interface VehicleHealthData {
    overheating: boolean;
    tire_flat_count: number;
    wheel_detached_count: number;
    dents_max: number;
    by_wheel?: {
        fl?: { flat?: boolean; detached?: boolean };
        fr?: { flat?: boolean; detached?: boolean };
        rl?: { flat?: boolean; detached?: boolean };
        rr?: { flat?: boolean; detached?: boolean };
    };
}

export interface RestApiData {
    time_scale: number;
    track_clock_time: number;
    private_qualifying: number;
    steering_wheel_range: number;
    current_virtual_energy: number;
    max_virtual_energy: number;
    expected_fuel_consumption: number;
    expected_virtual_energy_consumption: number;
    aero_damage: number;
    penalty_time: number;
    suspension_damage: number[];
    stint_usage: Record<string, unknown>;
    pit_stop_estimate: Array<number | string>;
}

export interface WeatherNode {
    rain: number;
    cloud: number;
    temp: number;
}

export interface TelemetryData {
    laps: number;
    curLap: number;
    lastLap: number;
    bestLap: number;
    position: number;
    speed: number;
    rpm: number;
    maxRpm: number;
    gear: number;
    carCategory: string;
    throttle: number;
    brake: number;
    clutch: number;
    steering: number;
    waterTemp: number;
    oilTemp: number;
    fuel: FuelData;
    VE: VirtualEnergyData;
    batterySoc: number;
    electric: ElectricData;
    tires: { fl: number; fr: number; rl: number; rr: number };
    tirePressures: { fl: number; fr: number; rl: number; rr: number };
    tireTemps: { fl: number[]; fr: number[]; rl: number[]; rr: number[] };
    brakeTemps: { flc: number; frc: number; rlc: number; rrc: number };
    brakeWear: { fl: number; fr: number; rl: number; rr: number };
    tireCompounds: { fl: string; fr: string; rl: string; rr: string };
    leaderLaps?: number;
    leaderAvgLapTime?: number
    windSpeed: number;
    strategyEstPitTime: number;
    strategyPitFuel?: number;
    strategyPitLaps?: number;
    inPitLane: boolean;
    inGarage: boolean;
    pitLimiter: boolean;
    damageIndex: number;
    isOverheating: boolean;
    lmu_electronics?: LmuElectronics;
    lmu_wheels_extra?: LmuWheelsExtraData;
    brakeBias?: number;
    turboPressure?: number;
    engineTorque?: number;
    steeringShaftTorque?: number;
    localVelocity?: Vec3;
    localAcceleration?: Vec3;
    localRotAcceleration?: Vec3;
    carState?: CarStateData;
    vehicleHealth?: VehicleHealthData;
    virtualEnergyMax?: number;
    restapiExpectedFuelConsumption?: number;
    restapiExpectedVEConsumption?: number;
    restapiAeroDamage?: number;
    restapiSuspensionDamage?: number[];
    restapiPenaltyTime?: number;
    lmu_extra?: Record<string, unknown>;
    lmu_extra_wheels?: Record<string, unknown>;
}

export interface TireTempDetails {
    surface: number[];   // [G, M, D]
    inner: number[];     // [G, M, D]
    carcass: number;     // Température carcasse
}

export interface StintConfig {
    driverId?: number | string;
    tyres?: string;
    fuel?: number | 'FULL';
    fuelEnergyRatio?: number;
    laps?: number;
    repaired?: boolean;
}

export interface Stint {
    id: number;
    stopNum: number;
    startLap: number;
    endLap: number;
    fuel: string;
    virtualEnergy?: string;
    fuelEnergyRatio?: number;
    tyres?: string;
    driver: Driver;
    driverId: number | string;
    driverSource?: 'config' | 'legacy' | 'auto';
    isCurrent: boolean;
    isNext: boolean;
    isDone: boolean;
    note: string;
    lapsCount: number;
}

export interface StrategyData {
    stints: Stint[];
    totalLaps: number;
    lapsPerTank: number;
    activeFuelCons: number;
    activeVECons: number;
    activeLapTime: number;
    pitStopsRemaining: number;
    targetFuelCons: number;
    targetVECons: number;
    pitPrediction?: {
        predictedPosition: number;
        carAhead: string | null;
        carBehind: string | null;
        gapToAhead: number;
        gapToBehind: number;
        trafficLevel: 'CLEAR' | 'BUSY' | 'TRAFFIC';
    };
}

export interface RawVehicle {
    id?: number;
    driver?: string;
    name?: string;
    vehicle?: string;
    class?: string;
    position?: number;
    is_player?: number;
    laps?: number;
    best_lap?: number;
    last_lap?: number;
    gap_leader?: number;
    gap_next?: number;
    sectors_best?: number[];
    sectors_cur?: number[];
    in_pits?: boolean;
    pit_stops?: number;
    penalties?: number;
    status?: number;
    x?: number;
    z?: number;
    sector?: number;
    classPosition?: number;
    stint_laps?: number;
    last_pit_lap?: number;
    predicted_pit_lap?: number;
    drs?: boolean;
    attack_mode?: number;
    fuel_fraction?: number;


}
export interface LmuElectronics {
    tc: number;
    tc_max: number;
    tc_slip: number;
    tc_slip_max: number;
    tc_cut: number;
    tc_cut_max: number;
    abs: number;
    abs_max: number;
    brake_migration: number;
    brake_bias: number;
    brake_migration_max: number;
    motor_map: number;
    motor_map_max: number;
    anti_sway_front: number;
    anti_sway_front_max: number;
    anti_sway_rear: number;
    anti_sway_rear_max: number;
    tc_active: boolean;
    abs_active: boolean;
    speed_limiter_active: boolean;
    wiper_state: number;
}
export interface LmuWheelExtra {
    toe: number;
    optimal_temp: number;
    compound_index: number;
    compound_type: number;
}

export interface LmuWheelsExtraData {
    fl: LmuWheelExtra;
    fr: LmuWheelExtra;
    rl: LmuWheelExtra;
    rr: LmuWheelExtra;
}
export interface LapData {
    lapNumber: number;
    lapTime: number;
    fuelUsed: number;
    veUsed: number;
    tireWearFL: number;
    tireWearRL: number;
    driverName: string;
    compound: string;
}

export interface GameState {
    userGlobalRole?: 'ADMIN' | 'DRIVER';
    userTeamRole?: 'LEADER' | 'MEMBER';
    currentStint: number;
    raceTime: number;
    sessionTimeRemaining: number;
    stintDuration: number;
    isRaceRunning: boolean;
    trackName: string;
    trackLength?: number;
    sessionType: string;
    weather: string;
    scActive: boolean;
    yellowFlag: boolean;
    isRain: boolean;
    trackMap: MapPoint[];
    weatherForecast: WeatherNode[];
    allVehicles: RawVehicle[];
    lapHistory: LapData[];
    stintConfig: Record<string, StintConfig>;
    airTemp: number;
    trackTemp: number;
    trackWetness: number;
    trackGripLevel: number | string;
    rainIntensity: number;
    fuelCons: number;
    veCons: number;
    tankCapacity: number;
    raceDurationHours: number;
    avgLapTimeSeconds: number;
    drivers: Driver[];
    activeDriverId: number | string;
    incidents: Incident[];
    chatMessages: ChatMessage[];
    stintNotes: Record<string, string | number>;
    // Legacy fallback only. Driver planning now lives in stintConfig[stintIdx].driverId.
    stintAssignments: Record<string, number | string>;
    position: number;
    telemetry: TelemetryData;
    lastDriverSwapTime?: number;
    restapi: RestApiData;
    extendedPitLimit: number;
}

export interface MapPoint {
    x: number;
    z: number;
    sector?: number;
}

export interface Incident {
    id: number | string;
    time: string;
    lap: number;
    text: string;
}

export interface ChatMessage {
    id: number | string;
    user: string;
    team?: string;
    teamColor?: string;
    category?: string;
    text: string;
    time: string;
}

export interface SetupSummary {
    id: string;
    name: string;
    car?: string;
    updatedAt?: string;
}

export interface SetupApplyRequest {
    teamId: string;
    setupId: string;
}

export interface SetupApplyResult {
    ok: boolean;
    message?: string;
}

// Types Raw (Supabase/Bridge)
export interface RawTelemetry {
    maxRpm: number;
    laps?: number;
    times?: { current?: number };
    speed?: number;
    rpm?: number;
    gear?: number;
    inputs?: { thr?: number; brk?: number; clt?: number; str?: number };
    temps?: { water?: number; oil?: number };
    fuel?: number;
    fuelCapacity?: number;
    electric?: Record<string, number> | undefined;
    tires?: {
        wear?: number[];
        press?: number[];
        temp?: Record<string, number[]>;
        brake_temp?: number[];
        brake_wear?: number[];
        compounds?: { fl?: string; fr?: string; rl?: string; rr?: string } | string[];
    };
    tire_temps_detailed?: {
        fl: TireTempDetails;
        fr: TireTempDetails;
        rl: TireTempDetails;
        rr: TireTempDetails;
    };
    virtual_energy?: number;
    max_virtual_energy?: number;
    leaderLaps?: number;
    leaderAvgLapTime?: number;
    lastLap?: number;
    lmu_electronics?: Partial<LmuElectronics>;
    lmu_wheels_extra? : Partial<LmuWheelsExtraData>;
    brake_bias?: number;
    turbo_pressure?: number;
    engine_torque?: number;
    steering_shaft_torque?: number;
    local_velocity?: Partial<Vec3>;
    local_acceleration?: Partial<Vec3>;
    local_rot_acceleration?: Partial<Vec3>;
    car_state?: Partial<CarStateData>;
    vehicle_health?: Partial<VehicleHealthData>;
    lmu_extra?: Record<string, unknown>;
}

export interface RawScoring {
    time?: { end?: number; current?: number; session?: string };
    flags?: { yellow_global?: number };
    vehicles?: RawVehicle[];
    vehicle_data?: {
        laps: number | undefined;
        class: string | undefined;
        in_pits?: boolean; last_lap?: number; best_lap?: number; position?: number; classPosition?: number };
    track?: string;
    length?: number;
    weather?: {
        wind_speed: number;
        wetness_path?: number[];
        track_temp?: number;
        track_grip_level?: number | string;
    };
}

export interface RawPit { strategy?: { time_min?: number; fuel_to_add?: number; laps_to_add?: number } }
export interface RawWeather { rain_intensity?: number; cloudiness?: number; ambient_temp?: number }
export interface RawRules { sc?: { active?: number }; my_status?: { pits_open?: boolean } }
export interface RawExtended { pit_limit?: number }

export interface RawDoc extends Partial<Omit<GameState, 'telemetry'>> {
    scoring?: RawScoring;
    telemetry?: RawTelemetry;
    pit?: RawPit;
    weather_det?: RawWeather;
    rules?: RawRules;
    extended?: RawExtended;
    sessionTimeRemainingSeconds?: number;
    drivers?: Driver[];
    createdAt?: string;
    id?: string;
    trackMap?: MapPoint[];
    messages?: ChatMessage[];
    lastPacketTime?: number;
    carCategory?: string;
    driverName?: string;
    carNumber?: number;
    lastLapFuelConsumption?: number;
    averageConsumptionFuel?: number;
    lastLapVEConsumption?: number;
    averageConsumptionVE?: number;
    weatherForecast?: WeatherNode[];
    lapHistory?: LapData[];
    stintConfig?: Record<string, StintConfig>;
    restapi?: Partial<RestApiData>;
}

export interface StrategyRow extends RawDoc {
    id: string;
}
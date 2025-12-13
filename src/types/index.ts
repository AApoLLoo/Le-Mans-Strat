export interface Driver {
    id: number | string;
    name: string;
    phone?: string;
    color: string;
    text?: string;
    totalDriveTime?: number;
}

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
    charge: number;
    torque: number;
    rpm: number;
    motorTemp: number;
    waterTemp: number;
    state: number;
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
    tireCompounds: { fl: string; fr: string; rl: string; rr: string };
    leaderLaps?: number;
    leaderAvgLapTime?: number;
    strategyEstPitTime: number;
    strategyPitFuel?: number;
    strategyPitLaps?: number;
    inPitLane: boolean;
    inGarage: boolean;
    pitLimiter: boolean;
    damageIndex: number;
    isOverheating: boolean;
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
    userGlobalRole?: 'ADMIN' | 'DRIVER'; // Rôle du compte
    userTeamRole?: 'LEADER' | 'MEMBER';
    currentStint: number;
    raceTime: number;
    sessionTimeRemaining: number;
    stintDuration: number;
    isRaceRunning: boolean;
    trackName: string;
    trackLength?: number; // <--- AJOUT POUR FIX TS2339
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
    stintAssignments: Record<string, number | string>;
    position: number;
    telemetry: TelemetryData;
    lastDriverSwapTime?: number;
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

// Types Raw (Supabase/Bridge)
export interface RawTelemetry {
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
        compounds?: { fl: string; fr: string; rl: string; rr: string };
    };
    virtual_energy?: number;
}

export interface RawScoring {
    time?: { end?: number; current?: number; session?: string };
    flags?: { yellow_global?: number };
    vehicles?: RawVehicle[];
    vehicle_data?: { in_pits?: boolean; last_lap?: number; best_lap?: number; position?: number; classPosition?: number };
    track?: string;
    length?: number; // <--- AJOUT POUR FIX TS2339 (Propriété reçue du Bridge)
    weather?: {
        wetness_path?: number[];
        track_temp?: number; // <--- AJOUT POUR FIX TS2339
    };
}

export interface RawPit { strategy?: { time_min?: number; fuel_to_add?: number; laps_to_add?: number } }
export interface RawWeather { rain_intensity?: number; cloudiness?: number; ambient_temp?: number }
export interface RawRules { sc?: { active?: number }; my_status?: { pits_open?: boolean } }
export interface RawExtended { pit_limit?: number }

export interface RawDoc extends Partial<GameState> {
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
}

export interface StrategyRow extends RawDoc {
    id: string;
}
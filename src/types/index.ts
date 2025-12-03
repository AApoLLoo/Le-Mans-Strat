export interface Driver {
  id: number | string;
  name: string;
  phone?: string;
  color: string;
  text?: string;
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

// NOUVEAU : Données Moteur Électrique
export interface ElectricData {
  charge: number;    // %
  torque: number;    // Nm
  rpm: number;       // RPM
  motorTemp: number; // °C
  waterTemp: number; // °C
  state: number;     // Statut (Regen/Drive...)
}

export interface TelemetryData {
  // Général
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
  // Inputs
  throttle: number;
  brake: number;
  clutch: number;
  steering: number;
  // Moteur Thermique
  waterTemp: number;
  oilTemp: number;
  
  // Consommables & Hybride
  fuel: FuelData;
  VE: VirtualEnergyData;
  batterySoc: number;
  electric: ElectricData; // AJOUTÉ

  // Pneus & Freins
  tires: { fl: number; fr: number; rl: number; rr: number }; // Usure %
  tirePressures: { fl: number; fr: number; rl: number; rr: number }; // kPa
  // Tableau [In, Mid, Out] pour chaque pneu
  tireTemps: { fl: number[]; fr: number[]; rl: number[]; rr: number[] };
  brakeTemps: { flc: number; frc: number; rlc: number; rrc: number };
  tireCompounds: { fl: string; fr: string; rl: string; rr: string };

  // Stratégie & État
  leaderLaps?: number;
  leaderAvgLapTime?: number;
  strategyEstPitTime: number;
  inPitLane: boolean;
  inGarage: boolean;
  pitLimiter: boolean;
  
  damageIndex: number;
  isOverheating: boolean;
}

export interface Stint {
  id: number;
  stopNum: number;
  startLap: number;
  endLap: number;
  fuel: string;
  fuelLoad?: number;
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
}

export interface GameState {
  currentStint: number;
  raceTime: number;
  sessionTimeRemaining: number;
  stintDuration: number;
  isRaceRunning: boolean;
  trackName: string;
  sessionType: string;
  weather: string;
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
  tires?: { wear?: number[]; press?: number[]; temp?: Record<string, number[]>; brake_temp?: number[] };
}

export interface RawVehicle {
  position?: number;
  laps?: number;
  best_lap?: number;
  class?: string;
  in_pits?: boolean;
}

export interface RawScoring {
  time?: { end?: number; current?: number; session?: string };
  vehicles?: RawVehicle[];
  vehicle_data?: { in_pits?: boolean; last_lap?: number; best_lap?: number; position?: number };
  track?: string;
  weather?: { wetness_path?: number[] };
}

export interface RawPit { strategy?: { time_min?: number } }
export interface RawWeather { rain_intensity?: number; cloudiness?: number; ambient_temp?: number }
export interface RawRules { my_status?: { pits_open?: boolean } }
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
  messages?: ChatMessage[];
  lastPacketTime?: number;
  carCategory?: string;
  driverName?: string;
  carNumber?: number;
}

export interface StrategyRow extends RawDoc {
  id: string;
}

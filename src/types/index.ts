// src/types/index.ts

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

export interface TelemetryData {
  laps: number;
  fuel: FuelData;
  virtualEnergy: number;
  tires: { fl: number; fr: number; rl: number; rr: number };
  brakeTemps: { flc: number; frc: number; rlc: number; rrc: number };
  tireTemps: { flc: number; frc: number; rlc: number; rrc: number };
  currentLapTimeSeconds: number;
  last3LapAvgSeconds: number;
  strategyEstPitTime: number;
  inPitLane: boolean | null;
  avgWearPerLapFL?: number;
  avgWearPerLapFR?: number;
  avgWearPerLapRL?: number;
  avgWearPerLapRR?: number;
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
  activeCons: number;
  activeLapTime: number;
  pitStopsRemaining: number;
}

export interface GameState {
  currentStint: number;
  raceTime: number;
  stintDuration: number;
  isRaceRunning: boolean;
  weather: string;
  airTemp: number;
  trackWetness: number;
  fuelCons: number;
  veCons: number;
  tankCapacity: number;
  raceDurationHours: number;
  avgLapTimeSeconds: number;
  isEmergency: boolean;
  drivers: Driver[];
  activeDriverId: number | string;
  incidents: any[];
  chatMessages: any[];
  stintNotes: Record<string, any>;
  stintAssignments: Record<string, any>;
  position: number;
  telemetry: TelemetryData;
  stintVirtualEnergy: Record<string, any>;
}
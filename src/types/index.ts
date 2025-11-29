// src/types/index.ts

import type { VideoMetadata } from "firebase/vertexai-preview";

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
export interface VirtualEnergyData{
  VEcurrent: number;
  VElastLapCons: number;
  VEaverageCons: number;
}

export interface TelemetryData {
  laps: number;
  fuel: FuelData;
  VE : VirtualEnergyData;  
  
  tires: { fl: number; fr: number; rl: number; rr: number };
  // Ajout de l'objet pour les gommes
  leaderLaps?: number;       // Tour actuel du leader (ex: 245)
  leaderAvgLapTime?: number; // Temps moyen du leader (ex: 205.5 sec)
  tireCompounds: { fl: string; fr: string; rl: string; rr: string };
  batterySoc: number;
  brakeTemps: { flc: number; frc: number; rlc: number; rrc: number };
  tireTemps: { flc: number; frc: number; rlc: number; rrc: number };
  curLap: number;
  AvgLapTime: number;
  strategyEstPitTime: number;
  throttle: number;
  brake: number;
  speed: number;
  rpm: number;
  maxRpm :number;
  waterTemp: number;
  oilTemp: number;
  inPitLane: boolean | null;
  inGarage : boolean,
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
  activeFuelCons: number;
  activeVECons: number;
  activeLapTime: number;
  pitStopsRemaining: number;
}

export interface GameState {
  currentStint: number;
  raceTime: number;
  stintDuration: number;
  isRaceRunning: boolean;
  trackName: string;
  sessionType: string;
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
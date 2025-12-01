// src/types/index.ts

export interface Driver {
  id: number | string;
  name: string;
  color: string;
  phone?: string;
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

// Données complètes reçues du Bridge
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
  
  throttle: number;
  brake: number;
  clutch: number;
  steering: number;
  waterTemp: number;
  oilTemp: number;
  
  fuel: FuelData;
  VE: VirtualEnergyData;
  batterySoc: number;

  tires: { fl: number; fr: number; rl: number; rr: number };
  tirePressures: { fl: number; fr: number; rl: number; rr: number };
  tireTemps: { 
    fl: number[]; // [Inner, Middle, Outer]
    fr: number[]; 
    rl: number[]; 
    rr: number[]; 
  };
  brakeTemps: { flc: number; frc: number; rlc: number; rrc: number };
  tireCompounds: { fl: string; fr: string; rl: string; rr: string };

  leaderLaps?: number;
  leaderAvgLapTime?: number;
  strategyEstPitTime: number;
  inPitLane: boolean;
  inGarage: boolean;
  pitLimiter: boolean;
  
  damageIndex: number;
  isOverheating: boolean;
}

// Structure d'un relais (Stint) calculé
export interface Stint {
  id: number;          // Index du relais (0, 1, 2...)
  stopNum: number;     // Numéro d'arrêt affiché
  startLap: number;    // Tour de début
  endLap: number;      // Tour de fin
  lapsCount: number;   // Nombre de tours du relais
  fuel: string;        // Info carburant (ex: "FULL" ou "NRG")
  driver: Driver;      // Pilote assigné
  driverId: number | string;
  
  isCurrent: boolean;  // Est-ce le relais en cours ?
  isNext: boolean;     // Est-ce le prochain ?
  isDone: boolean;     // Est-ce terminé ?
  note: string;        // Instructions manuelles
}

// Résultat du calcul stratégique
export interface StrategyData {
  stints: Stint[];
  totalLaps: number;
  lapsPerTank: number;
  activeFuelCons: number;
  activeVECons: number;
  activeLapTime: number;
  pitStopsRemaining: number;
}

// État global de l'application (Firebase)
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
  
  incidents: any[];
  chatMessages: any[];
  stintNotes: Record<string, any>;      // Notes par numéro de relais
  stintAssignments: Record<string, any>; // Pilote forcé par numéro de relais
  
  position: number;
  telemetry: TelemetryData;
}
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

export interface VirtualEnergyData {
  VEcurrent: number;
  VElastLapCons: number;
  VEaverageCons: number;
}

export interface TelemetryData {
  // --- Données Générales ---
  laps: number;
  curLap: number;       // Temps tour en cours
  lastLap: number;      // Dernier temps au tour
  bestLap: number;      // Meilleur temps
  position: number;
  speed: number;
  rpm: number;
  maxRpm: number;
  gear: number;         // Nouveau
  
  // --- Physiques & Moteur ---
  throttle: number;
  brake: number;
  clutch: number;       // Nouveau
  steering: number;     // Nouveau
  waterTemp: number;
  oilTemp: number;
  
  // --- Consommables ---
  fuel: FuelData;
  VE: VirtualEnergyData;
  batterySoc: number;   // Hybrid Charge

  // --- Pneus & Freins ---
  // Valeurs normalisées (ex: 100% = neuf)
  tires: { fl: number; fr: number; rl: number; rr: number };
  // Pressions (kPa)
  tirePressures: { fl: number; fr: number; rl: number; rr: number };
  // Températures (Celsius - Center)
  tireTemps: { flc: number; frc: number; rlc: number; rrc: number };
  // Températures Freins (Celsius)
  brakeTemps: { flc: number; frc: number; rlc: number; rrc: number };
  // Types de gomme (ex: "SOFT")
  tireCompounds: { fl: string; fr: string; rl: string; rr: string };

  // --- Stratégie & État ---
  leaderLaps?: number;
  leaderAvgLapTime?: number;
  strategyEstPitTime: number; // Temps estimé de l'arrêt
  inPitLane: boolean;
  inGarage: boolean;
  pitLimiter: boolean;
  
  // --- Dégâts ---
  damageIndex: number; // Somme des dégâts carrosserie
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

  // Paramètres voitures
  fuelCons: number;
  veCons: number;
  tankCapacity: number;
  
  // Données Course
  raceDurationHours: number;
  avgLapTimeSeconds: number;
  
  // Gestion Équipe
  drivers: Driver[];
  activeDriverId: number | string;
  
  // Messages & Notes
  incidents: any[];
  chatMessages: any[];
  stintNotes: Record<string, any>;
  stintAssignments: Record<string, any>;
  
  position: number;
  telemetry: TelemetryData;
}
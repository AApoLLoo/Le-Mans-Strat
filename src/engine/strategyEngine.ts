import type { StrategyData, Stint, Driver, StintConfig, RawVehicle } from '../types';
import { PIT_LANE_LOSS, DEFAULT_STATIONARY_TIME, DEFAULT_LAP_TIME, MAX_STINTS_LOOKAHEAD } from '../constants';
import { getSafeDriver } from '../utils/helpers';
import { isHybridCategory } from '../utils/carClasses';

export interface StrategyInput {
    // Telemetry
    currentLap: number;
    carCategory: string;
    fuelCurrent: number;
    fuelMax: number;
    fuelAvgCons: number;
    veAvgCons: number;
    veLastLapCons: number;
    strategyEstPitTime: number;
    telemetryPosition: number;

    // Race state
    currentStint: number;
    raceTimeRemaining: number;
    avgLapTimeSeconds: number;
    leaderLaps: number;
    leaderAvgLapTime: number;
    activeDriverId: number | string;
    sessionMode: StrategySessionMode;

    // Configuration
    drivers: Driver[];
    stintConfig: Record<string, StintConfig>;
    // Legacy fallback only. Source of truth is stintConfig[idx].driverId.
    stintAssignments?: Record<string, number | string>;
    stintNotes: Record<string, string | number>;
    fuelCons: number;
    veCons: number;
    tankCapacity: number;
    manualFuelTarget?: number | null;
    manualVETarget?: number | null;

    // Team flags
    isHypercar: boolean;
    isLMGT3: boolean;

    // Vehicles for pit prediction
    allVehicles: RawVehicle[];
}

type ComputedStint = Stint & {
    driverSource?: 'config' | 'legacy' | 'auto';
};

type StrategySessionMode = 'RACE' | 'QUALIFY' | 'PRACTICE' | 'UNKNOWN';

export function calculateStrategy(input: StrategyInput): StrategyData {
    const {
        currentLap, carCategory, fuelCurrent, fuelMax, fuelAvgCons, veAvgCons, veLastLapCons,
        strategyEstPitTime, telemetryPosition,
        currentStint: currentStintIndex, raceTimeRemaining, avgLapTimeSeconds,
        leaderLaps, leaderAvgLapTime, activeDriverId, sessionMode,
        drivers, stintConfig, stintAssignments = {}, stintNotes,
        fuelCons, veCons, tankCapacity: configTankCapacity,
        manualFuelTarget, manualVETarget,
        isHypercar,
        allVehicles
    } = input;

    // 1. CIBLES DE COURSE
    let totalLapsTarget = 300;
    const leaderAvg = leaderAvgLapTime || DEFAULT_LAP_TIME;
    const myAvg = avgLapTimeSeconds > 0 ? avgLapTimeSeconds : DEFAULT_LAP_TIME;

    const activeFuelCons = Math.max(0.1, fuelAvgCons || fuelCons);
    const tankCapacity = Math.max(1, fuelMax || configTankCapacity);
    const maxLapsFuel = Math.floor(tankCapacity / activeFuelCons);
    const isRaceSession = sessionMode === 'RACE';

    if (isRaceSession) {
        if (leaderLaps > 0 && leaderAvg > 0) {
            totalLapsTarget = Math.floor(leaderLaps + (raceTimeRemaining / leaderAvg));
        } else if (currentLap > 0) {
            totalLapsTarget = Math.floor(currentLap + (raceTimeRemaining / myAvg));
        }
    } else {
        const timedLaps = raceTimeRemaining > 0 ? Math.ceil(raceTimeRemaining / myAvg) : maxLapsFuel;
        const lookaheadLaps = Math.max(1, Math.min(timedLaps, maxLapsFuel * 2));
        totalLapsTarget = Math.max(currentLap + 1, currentLap + lookaheadLaps);
    }

    // 2. DÉTECTION HYBRIDE / VE
    const isHybridCar = isHybridCategory(carCategory);
    const useVE = isHybridCar || isHypercar || veLastLapCons > 0.1 || veAvgCons > 0.1;

    // 3. CONSOMMATIONS
    const activeVECons = useVE ? Math.max(0.1, veAvgCons || veCons) : 0;

    const stints: ComputedStint[] = [];

    const resolveConfiguredDriver = (idx: number): { driverId?: number | string; source: 'config' | 'legacy' | 'auto' } => {
        const cfgDriverId = stintConfig[idx]?.driverId;
        if (cfgDriverId !== undefined && cfgDriverId !== null && cfgDriverId !== '') {
            return { driverId: cfgDriverId, source: 'config' };
        }

        const legacyDriverId = (stintAssignments as Record<string, number | string | undefined>)[String(idx)];
        if (legacyDriverId !== undefined && legacyDriverId !== null && legacyDriverId !== '') {
            return { driverId: legacyDriverId, source: 'legacy' };
        }

        return { driverId: undefined, source: 'auto' };
    };

    const resolveAutoDriverId = (prevDriverId: number | string | undefined): number | string | undefined => {
        if (!drivers.length) return undefined;
        const prevIdx = drivers.findIndex(d => d.id === prevDriverId);
        if (prevIdx < 0) return drivers[0]?.id;
        return drivers[(prevIdx + 1) % drivers.length]?.id;
    };

    // A. Relais Passés
    for (let i = 0; i < currentStintIndex; i++) {
        const config = stintConfig[i] || {};
        const resolved = resolveConfiguredDriver(i);
        const driverId = resolved.driverId ?? resolveAutoDriverId(i > 0 ? stints[i - 1]?.driverId : activeDriverId);
        const d = getSafeDriver(drivers.find(drv => drv.id === driverId));
        stints.push({
            id: i, stopNum: i + 1, startLap: 0, endLap: 0, lapsCount: 0,
            fuel: "DONE", driver: d, driverId: d.id, tyres: config.tyres,
            driverSource: resolved.driverId ? resolved.source : 'auto',
            isCurrent: false, isNext: false, isDone: true,
            note: String(stintNotes[i + 1] || "")
        });
    }

    // B. Relais Actuel & Futurs
    let simulationLap = currentLap;
    let simIdx = currentStintIndex;

    while (simulationLap < totalLapsTarget) {
        const config = stintConfig[simIdx] || {};

        const resolved = resolveConfiguredDriver(simIdx);
        let driverId = resolved.driverId;
        if (!driverId && drivers.length > 0) {
            const prevStint = stints[stints.length - 1];
            const prevDriverId = prevStint ? prevStint.driverId : activeDriverId;
            driverId = resolveAutoDriverId(prevDriverId);
        }
        const d = getSafeDriver(drivers.find(drv => drv.id === driverId));

        // Ratio VE du relais (1.0 = normal, 0.9 = economy, 1.1 = push).
        // Ratio fuel/VE: fuel = VE * ratio (ex: 100 * 0.8 = 80L si 80L suffisent)
        const fuelVERatio = config.fuelEnergyRatio !== undefined ? config.fuelEnergyRatio : 1.0;

        // Durée — VE et fuel sont indépendants: le ratio n'affecte que la VE.
        const stintFuelCons = activeFuelCons;
        const stintVECons = (useVE && activeVECons > 0) ? activeVECons : 0;
        const stintMaxLapsByVE = stintVECons > 0 ? Math.floor(100 / stintVECons) : 999;
        const stintMaxLapsByFuel = Math.floor(tankCapacity / stintFuelCons);
        const stintMaxLaps = useVE ? Math.min(stintMaxLapsByVE, stintMaxLapsByFuel) : stintMaxLapsByFuel;

        let lapsDuration = stintMaxLaps;
        if (config.laps && config.laps > 0) lapsDuration = Math.min(config.laps, stintMaxLaps);
        if (simulationLap + lapsDuration > totalLapsTarget) lapsDuration = totalLapsTarget - simulationLap;
        lapsDuration = Math.max(1, lapsDuration);

        // Calculs — fuel et VE sont toujours indépendants (comme dans LMU)
        const fuelNeeded = lapsDuration * stintFuelCons;
        let veDisplay = "-";
        let fuelDisplay = "";

        if (useVE && stintVECons > 0) {
            const veNeeded = lapsDuration * stintVECons;
            veDisplay = `${veNeeded.toFixed(0)}%`;
        }

        const fuelFromVE = useVE && stintVECons > 0 ? (100 * fuelVERatio) : fuelNeeded;

        fuelDisplay = simIdx === currentStintIndex
            ? `${fuelCurrent.toFixed(1)}L (Rest)`
            : `${(useVE && stintVECons > 0 ? fuelFromVE : fuelNeeded).toFixed(1)}L`;

        stints.push({
            id: simIdx, stopNum: simIdx + 1,
            startLap: simulationLap, endLap: simulationLap + lapsDuration,
            lapsCount: lapsDuration, fuel: fuelDisplay,
            virtualEnergy: veDisplay, fuelEnergyRatio: fuelVERatio,
            driver: d, driverId: d.id, tyres: config.tyres || 'AUTO',
            driverSource: resolved.driverId ? resolved.source : 'auto',
            isCurrent: simIdx === currentStintIndex,
            isNext: simIdx === currentStintIndex + 1,
            isDone: false, note: String(stintNotes[simIdx + 1] || "")
        });

        simulationLap += lapsDuration;
        simIdx++;
        if (simIdx > currentStintIndex + (isRaceSession ? MAX_STINTS_LOOKAHEAD : 2)) break;
    }

    // --- PRÉDICTION TRAFIC ---
    const pitPrediction = calculatePitPrediction(allVehicles, telemetryPosition, strategyEstPitTime);

    return {
        stints,
        totalLaps: totalLapsTarget,
        lapsPerTank: maxLapsFuel,
        activeFuelCons,
        activeVECons,
        activeLapTime: avgLapTimeSeconds,
        pitStopsRemaining: Math.max(0, stints.length - 1 - currentStintIndex),
        targetFuelCons: manualFuelTarget ?? activeFuelCons,
        targetVECons: useVE ? (manualVETarget ?? activeVECons) : 0,
        pitPrediction
    };
}

function calculatePitPrediction(
    allVehicles: RawVehicle[],
    telemetryPosition: number,
    strategyEstPitTime: number
) {
    const pitLaneLoss = PIT_LANE_LOSS;
    const stationaryTime = strategyEstPitTime > 0 ? strategyEstPitTime : DEFAULT_STATIONARY_TIME;
    const totalPitLoss = pitLaneLoss + stationaryTime;

    const myCar = allVehicles.find(v => Number(v.is_player) === 1 || v.id === telemetryPosition);
    const myGapToLeader = Number(myCar?.gap_leader || 0);
    const myProjectedGap = myGapToLeader + totalPitLoss;

    let predictedPos = 1;
    let carAhead: string | null = null;
    let carBehind: string | null = null;
    let minGapAhead = 9999;
    let minGapBehind = 9999;
    let trafficCount = 0;

    const sortedVehicles = [...allVehicles].sort((a, b) => Number(a.gap_leader || 0) - Number(b.gap_leader || 0));

    for (const v of sortedVehicles) {
        if (Number(v.is_player) === 1) continue;

        const vGap = Number(v.gap_leader || 0);

        if (vGap < myProjectedGap) {
            predictedPos++;
            const gap = myProjectedGap - vGap;
            if (gap < minGapAhead) {
                minGapAhead = gap;
                carAhead = v.driver || v.name || `Car #${v.id}`;
            }
        } else {
            const gap = vGap - myProjectedGap;
            if (gap < minGapBehind) {
                minGapBehind = gap;
                carBehind = v.driver || v.name || `Car #${v.id}`;
            }
        }

        if (Math.abs(vGap - myProjectedGap) < 5.0) trafficCount++;
    }

    let trafficLevel: 'CLEAR' | 'BUSY' | 'TRAFFIC' = 'CLEAR';
    if (trafficCount >= 1) trafficLevel = 'BUSY';
    if (trafficCount >= 3) trafficLevel = 'TRAFFIC';

    return {
        predictedPosition: predictedPos,
        carAhead,
        carBehind,
        gapToAhead: minGapAhead === 9999 ? 0 : minGapAhead,
        gapToBehind: minGapBehind === 9999 ? 0 : minGapBehind,
        trafficLevel
    };
}

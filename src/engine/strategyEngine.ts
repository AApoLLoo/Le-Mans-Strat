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

    // Configuration
    drivers: Driver[];
    stintConfig: Record<number, StintConfig>;
    stintAssignments: Record<number, number | string>;
    stintNotes: Record<number, string>;
    fuelCons: number;
    veCons: number;
    tankCapacity: number;

    // Team flags
    isHypercar: boolean;
    isLMGT3: boolean;

    // Vehicles for pit prediction
    allVehicles: RawVehicle[];
}

export function calculateStrategy(input: StrategyInput): StrategyData {
    const {
        currentLap, carCategory, fuelCurrent, fuelMax, fuelAvgCons, veAvgCons, veLastLapCons,
        strategyEstPitTime, telemetryPosition,
        currentStint: currentStintIndex, raceTimeRemaining, avgLapTimeSeconds,
        leaderLaps, leaderAvgLapTime, activeDriverId,
        drivers, stintConfig, stintAssignments, stintNotes,
        fuelCons, veCons, tankCapacity: configTankCapacity,
        isHypercar, isLMGT3,
        allVehicles
    } = input;

    // 1. CIBLES DE COURSE
    let totalLapsTarget = 300;
    const leaderAvg = leaderAvgLapTime || DEFAULT_LAP_TIME;
    const myAvg = avgLapTimeSeconds > 0 ? avgLapTimeSeconds : DEFAULT_LAP_TIME;

    if (leaderLaps > 0 && leaderAvg > 0) {
        totalLapsTarget = Math.floor(leaderLaps + (raceTimeRemaining / leaderAvg));
    } else if (currentLap > 0) {
        totalLapsTarget = Math.floor(currentLap + (raceTimeRemaining / myAvg));
    }

    // 2. DÉTECTION HYBRIDE / VE
    const isHybridCar = isHybridCategory(carCategory);
    const useVE = isHybridCar || isHypercar || isLMGT3 || (veLastLapCons > 0.1);

    // 3. CONSOMMATIONS
    const activeFuelCons = Math.max(0.1, fuelAvgCons || fuelCons);
    const activeVECons = Math.max(0.1, veAvgCons || veCons);
    const tankCapacity = Math.max(1, fuelMax || configTankCapacity);

    const maxLapsFuel = Math.floor(tankCapacity / activeFuelCons);
    const maxLapsVE = (useVE && activeVECons > 0) ? Math.floor(100 / activeVECons) : 999;
    const maxLapsPerStint = Math.max(1, useVE ? Math.min(maxLapsVE, maxLapsFuel) : maxLapsFuel);

    const stints: Stint[] = [];

    // A. Relais Passés
    for (let i = 0; i < currentStintIndex; i++) {
        const config = stintConfig[i] || {};
        const driverId = config.driverId || stintAssignments[i] || drivers[i % drivers.length]?.id;
        const d = getSafeDriver(drivers.find(drv => drv.id === driverId));
        stints.push({
            id: i, stopNum: i + 1, startLap: 0, endLap: 0, lapsCount: 0,
            fuel: "DONE", driver: d, driverId: d.id, tyres: config.tyres,
            isCurrent: false, isNext: false, isDone: true,
            note: String(stintNotes[i + 1] || "")
        });
    }

    // B. Relais Actuel & Futurs
    let simulationLap = currentLap;
    let simIdx = currentStintIndex;

    while (simulationLap < totalLapsTarget) {
        const config = stintConfig[simIdx] || {};

        let driverId = config.driverId || stintAssignments[simIdx];
        if (!driverId && drivers.length > 0) {
            const prevStint = stints[stints.length - 1];
            const prevDriverId = prevStint ? prevStint.driverId : activeDriverId;
            const prevIdx = drivers.findIndex(d => d.id === prevDriverId);
            driverId = drivers[(prevIdx + 1) % drivers.length].id;
        }
        const d = getSafeDriver(drivers.find(drv => drv.id === driverId));

        // Durée
        let lapsDuration = maxLapsPerStint;
        if (config.laps && config.laps > 0) lapsDuration = Math.min(config.laps, maxLapsPerStint);
        if (simulationLap + lapsDuration > totalLapsTarget) lapsDuration = totalLapsTarget - simulationLap;
        lapsDuration = Math.max(1, lapsDuration);

        // Ratio Fuel/Energy
        const ratio = config.fuelEnergyRatio !== undefined ? config.fuelEnergyRatio : 1.0;

        // Calculs
        let veNeeded = 0;
        let veDisplay = "-";
        let fuelNeeded = 0;
        let fuelDisplay = "";

        if (useVE) {
            veNeeded = lapsDuration * activeVECons;
            veDisplay = `${veNeeded.toFixed(0)}%`;
            fuelNeeded = veNeeded * ratio;
        } else {
            fuelNeeded = lapsDuration * activeFuelCons;
        }

        if (simIdx === currentStintIndex) {
            fuelDisplay = `${fuelCurrent.toFixed(1)}L (Rest)`;
        } else {
            fuelDisplay = `${fuelNeeded.toFixed(1)}L`;
        }

        stints.push({
            id: simIdx, stopNum: simIdx + 1,
            startLap: simulationLap, endLap: simulationLap + lapsDuration,
            lapsCount: lapsDuration, fuel: fuelDisplay,
            virtualEnergy: veDisplay, fuelEnergyRatio: ratio,
            driver: d, driverId: d.id, tyres: config.tyres || 'AUTO',
            isCurrent: simIdx === currentStintIndex,
            isNext: simIdx === currentStintIndex + 1,
            isDone: false, note: String(stintNotes[simIdx + 1] || "")
        });

        simulationLap += lapsDuration;
        simIdx++;
        if (simIdx > currentStintIndex + MAX_STINTS_LOOKAHEAD) break;
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
        targetFuelCons: activeFuelCons,
        targetVECons: activeVECons,
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

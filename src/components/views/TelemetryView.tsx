import React from 'react';
import { Fuel, Zap, CloudRain, Sun, Cloud, Thermometer, Plus, Minus, XCircle } from 'lucide-react';
import type { TelemetryData, WeatherNode } from '../../types';
import WeatherWidget from './WeatherWidget';
import { formatLapTimePrecise as formatLapTime } from '../../utils/helpers';

const getTireColorGradient = (wear: number) => {
    if (wear > 80) return 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]';
    if (wear > 50) return 'bg-gradient-to-t from-yellow-600 to-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]';
    if (wear > 30) return 'bg-gradient-to-t from-orange-600 to-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.3)]';
    return 'bg-gradient-to-t from-red-700 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse';
};

const getCompoundBadgeColor = (compound: string | undefined | null) => {
    if (!compound) return "text-slate-400 border-slate-600/50 bg-slate-800/50";
    const c = String(compound).toUpperCase();
    if (c.includes("SOFT")) return "text-red-500 border-red-500/50 bg-red-950/30";
    if (c.includes("MEDIUM")) return "text-yellow-400 border-yellow-400/50 bg-yellow-950/30";
    if (c.includes("HARD")) return "text-white border-white/50 bg-slate-700/50";
    if (c.includes("WET") || c.includes("RAIN")) return "text-blue-400 border-blue-400/50 bg-blue-950/30";
    return "text-slate-400 border-slate-600/50 bg-slate-800/50";
};

// --- MODIFIÉ: Utilise la température optimale LMU si elle est dispo ---
const getTempColor = (temp: number, type: 'brake' | 'tire', optimalTemp?: number) => {
    if (type === 'brake') {
        if (temp > 700) return 'text-red-500 font-black animate-pulse';
        if (temp > 500) return 'text-emerald-400 font-bold';
        return 'text-slate-400';
    } else {
        // Logique LMU Native
        if (optimalTemp && optimalTemp > 0) {
            const diff = temp - optimalTemp;
            if (Math.abs(diff) <= 8) return 'text-emerald-400 font-bold'; // Fenêtre parfaite (+/- 8°C)
            if (diff > 8) return 'text-red-500 font-black animate-pulse'; // Surchauffe
            if (diff < -20) return 'text-blue-400'; // Pneu froid
            return 'text-yellow-400'; // Pneu en chauffe (proche de l'optimal)
        }
        // Fallback classique si lmu_wheels_extra n'est pas reçu
        if (temp > 110) return 'text-red-500 font-black animate-pulse';
        if (temp > 85) return 'text-emerald-400 font-bold';
        return 'text-blue-400';
    }
};

const getWeatherIcon = (weather: string) => {
    const w = (weather || "SUNNY").toUpperCase();
    if (w.includes('RAIN') || w.includes('WET')) return <CloudRain size={18} className="text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]"/>;
    if (w.includes('CLOUD') || w.includes('OVERCAST')) return <Cloud size={18} className="text-slate-400"/>;
    return <Sun size={18} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"/>;
};

const formatGripLevel = (value: number | string | undefined) => {
    if (value === undefined || value === null || value === '') return '-';

    const num = Number(value);
    if (!Number.isNaN(num)) {
        if (num <= 1) return 'FAIBLE';
        if (num === 2) return 'MOYENNE';
        if (num >= 3) return 'ELEVEE';
    }

    const text = String(value).trim().toUpperCase();
    if (!text) return '-';
    return text;
};

const EMPTY_ELECTRONICS = {
    tc: 0,
    tc_cut: 0,
    tc_slip: 0,
    abs: 0,
    motor_map: 0,
    brake_migration: 0,
    brake_bias: 0,
    anti_sway_front: 0,
    anti_sway_rear: 0,
    tc_active: false,
    abs_active: false,
    wiper_state: 0
};

// --- SOUS-COMPOSANTS CONSO ---
// (Identiques à avant, non modifiés)
interface ConsumptionWidgetProps { label: string; icon: React.ReactNode; barColor: string; current: number; max: number; lastLap: number; avg: number; target?: number; unit: string; threshold: number; step: number; onAdjust: (_delta: number) => void; onReset: () => void; }
const ConsumptionWidget: React.FC<ConsumptionWidgetProps> = ({ label, icon, barColor, current, max, lastLap, avg, target, unit, threshold, step, onAdjust, onReset }) => {
    const pct = Math.min(100, Math.max(0, (current / (max || 1)) * 100));
    const effectiveTarget = target ?? avg;
    const isManual = target !== undefined && target !== null && Math.abs(target - avg) > 0.001;
    const delta = avg - effectiveTarget;
    let statusColor = 'text-slate-400'; let statusText = 'OK';
    if (delta > threshold) { statusColor = 'text-red-500 animate-pulse'; statusText = 'LIFT'; }
    else if (delta < -threshold) { statusColor = 'text-emerald-400'; statusText = 'SAVE'; }
    return (
        <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 flex-1 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">{icon} {label}</span>
                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${statusColor} bg-black/20`}>{statusText}</span>
            </div>
            <div className="h-2 bg-slate-950 rounded border border-slate-700 overflow-hidden mb-2">
                <div className={`h-full ${barColor} transition-all duration-500`} style={{width: `${pct}%`}}/>
            </div>
            <div className="flex justify-between items-end">
                <div>
                    <div className="text-xl font-black text-white leading-none">{current.toFixed(1)} <span className="text-xs text-slate-500">{unit}</span></div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Last: {lastLap.toFixed(2)}</div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        {isManual && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" title="Manual target"/>} Target
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 rounded px-1 border border-slate-700">
                            <button onClick={() => onAdjust(-step)} className="p-0.5 hover:text-white text-slate-400"><Minus size={9}/></button>
                            <button onClick={onReset} className="p-0.5 hover:text-blue-400 text-slate-400"><XCircle size={9}/></button>
                            <button onClick={() => onAdjust(step)} className="p-0.5 hover:text-white text-slate-400"><Plus size={9}/></button>
                        </div>
                    </div>
                    <div className={`text-base font-mono font-bold ${statusColor}`}>
                        {avg.toFixed(2)} <span className="text-[9px] text-slate-500 ml-1">/ {effectiveTarget.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface TelemetryViewProps {
    telemetryData: TelemetryData;
    isHypercar: boolean;
    isLMGT3: boolean;
    position: number;
    avgLapTimeSeconds: number;
    weather: string;
    airTemp: number;
    trackTemp: number;
    trackWetness: number;
    trackGripLevel?: number | string;
    targetFuelCons?: number;
    targetVECons?: number;
    onSetFuelTarget?: (_val: number | null) => void;
    onSetVETarget?: (_val: number | null) => void;
    weatherForecast?: WeatherNode[];
}

const TelemetryView: React.FC<TelemetryViewProps> = ({
                                                         telemetryData, isHypercar, isLMGT3, position,
                                                         weather, airTemp, trackTemp, trackWetness, trackGripLevel,
                                                         targetFuelCons, targetVECons, onSetFuelTarget, onSetVETarget,
                                                         avgLapTimeSeconds, weatherForecast
                                                     }) => {
    // 1. Destructuring avec des valeurs par défaut qui respectent le typage TypeScript
    const {
        tires = { fl: 0, fr: 0, rl: 0, rr: 0 },
        tireCompounds = { fl: "---", fr: "---", rl: "---", rr: "---" },
        fuel = { current: 0, max: 100, lastLapCons: 0, averageCons: 0 },
        VE = { VEcurrent: 0, VElastLapCons: 0, VEaverageCons: 0 },
        electric = { charge: 0, torque: 0, rpm: 0, motorTemp: 0, waterTemp: 0, state: 0 },
        batterySoc = 0,
        carCategory = '',
        brakeTemps = { flc: 0, frc: 0, rlc: 0, rrc: 0 },
        tireTemps = { fl: [0,0,0], fr: [0,0,0], rl: [0,0,0], rr: [0,0,0] },
        tirePressures = { fl: 0, fr: 0, rl: 0, rr: 0 },
        throttle = 0, brake = 0, clutch = 0, steering = 0,
        speed = 0, rpm = 0, maxRpm = 8000, gear = 0, waterTemp = 0, oilTemp = 0,
        lmu_electronics,
        lmu_wheels_extra,
        vehicleHealth,
        restapiSuspensionDamage,
        strategyPitLaps
    } = telemetryData || ({} as Partial<TelemetryData>);

    const displayAvgLap = formatLapTime(avgLapTimeSeconds);
    const compounds = tireCompounds || { fl: "---", fr: "---", rl: "---", rr: "---" };
    const electronics = { ...EMPTY_ELECTRONICS, ...(lmu_electronics || {}) };
    const hasElectronicsData = Boolean(lmu_electronics && Object.keys(lmu_electronics).length > 0);

    const roundedWetness = Math.round(trackWetness);
    const trackState = roundedWetness > 50
        ? { label: 'FLOODED', cls: 'text-blue-200 bg-blue-900/40 border-blue-500/40' }
        : roundedWetness > 20
            ? { label: 'WET', cls: 'text-blue-300 bg-blue-900/30 border-blue-500/30' }
            : roundedWetness > 5
                ? { label: 'DAMP', cls: 'text-cyan-300 bg-cyan-900/30 border-cyan-500/30' }
                : { label: 'DRY', cls: 'text-amber-300 bg-amber-900/20 border-amber-500/30' };
    const displayGripLevel = formatGripLevel(trackGripLevel);

    // 2. Forcer le type strict Boolean() pour éviter l'erreur "string | boolean"
    const isCategoryGT3 = Boolean(
        isLMGT3 || (carCategory && typeof carCategory === 'string' && (carCategory.toLowerCase().includes('gt3') || carCategory.toLowerCase().includes('lmgt3')))
    );
    const isCategoryHypercar = Boolean(
        isHypercar || (carCategory && typeof carCategory === 'string' && (carCategory.toLowerCase().includes('hyper') || carCategory.toLowerCase().includes('lmh') || carCategory.toLowerCase().includes('lmdh') || carCategory.toLowerCase().includes('gtop')))
    );

    const showVEWidget = isCategoryHypercar || isCategoryGT3 || Number(VE?.VEcurrent) > 0 || Number(VE?.VEaverageCons) > 0 || Number(VE?.VElastLapCons) > 0;

    const currentRpm = Math.round(Number(rpm) || 0);
    const limitRpm = Math.round(Number(maxRpm)) || 8000;
    const rpmPct = Math.min(100, Math.max(0, (currentRpm / limitRpm) * 100));
    const isShiftNow = rpmPct > 96;

    // ... (la suite reste inchangée : const renderTire = ...)

    // MODIFIÉ : renderTire accepte les lmuExtra et utilise optimal_temp !
    const renderTire = (name: string, wear: number, pressure: number, brakeT: number, tireT: number[], compound: string, lmuExtra?: any) => {
        const displayWear = Number(wear) || 0;
        const displayBrakeT = Number(brakeT) || 0;
        const displayPress = Number(pressure) || 0;
        const displayTireT = Number(tireT?.[1]) || 0;
        const optimal = lmuExtra?.optimal_temp;

        return (
            <div className="flex flex-col gap-1 flex-1 h-full justify-center bg-slate-900/60 p-2 rounded-lg border border-white/5 relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10">
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest">{name}</span>
                    <span className={`text-[9px] font-black uppercase px-1 rounded ${getCompoundBadgeColor(compound)}`}>{compound}</span>
                </div>

                {/* Barre d'usure */}
                <div className="relative w-full h-16 bg-slate-950 rounded border border-slate-700 overflow-hidden mt-1 mb-1">
                    <div className={`absolute bottom-0 left-0 right-0 w-full transition-all duration-700 ${getTireColorGradient(displayWear)}`} style={{ height: `${displayWear}%` }}></div>
                    <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-white drop-shadow-md">{Math.round(displayWear)}%</div>
                </div>

                {/* Affichage Cible Optimale LMU si disponible */}
                {optimal > 0 && (
                    <div className="text-center">
                        <span className="text-[8px] text-slate-500 font-bold bg-black/40 px-1.5 py-0.5 rounded border border-slate-700">
                            OPT: {Math.round(optimal)}°C
                        </span>
                    </div>
                )}

                <div className="flex justify-between text-[9px] font-mono text-slate-300 mt-1 relative z-10">
                    <div className="flex flex-col items-center"><span className="text-slate-500">PRESS</span><span className="text-white font-bold">{displayPress.toFixed(1)}</span></div>
                    {/* On passe `optimal` à getTempColor */}
                    <div className="flex flex-col items-center"><span className="text-slate-500">TEMP</span><span className={getTempColor(displayTireT, 'tire', optimal)}>{Math.round(displayTireT)}°</span></div>
                    <div className="flex flex-col items-center"><span className="text-slate-500">BRAKE</span><span className={getTempColor(displayBrakeT, 'brake')}>{Math.round(displayBrakeT)}°</span></div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full bg-[#050a10] p-4 flex flex-col gap-4 overflow-hidden font-display">
            {/* HEADER */}
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 flex items-center justify-between shrink-0 shadow-lg">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-lg border border-white/5">
                        {getWeatherIcon(weather)}
                        <span className="text-xs font-bold text-slate-200 tracking-wide">{weather || "SUNNY"}</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                        <div><span className="text-slate-500 font-bold">AIR</span> <span className="text-white font-mono ml-1">{Math.round(airTemp)}°C</span></div>
                        <div>
                            <span className="text-slate-500 font-bold">TRACK</span>
                            <span className="text-amber-500 font-mono ml-1">{Math.round(trackTemp)}°C</span>
                            <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded border ${trackState.cls}`}>{trackState.label}</span>
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded border text-violet-300 bg-violet-900/30 border-violet-500/30">GRIP: {displayGripLevel}</span>
                        </div>
                        {trackWetness > 0.5 && (
                            <div><span className="text-blue-400 font-bold">WET</span> <span className="text-blue-200 font-mono ml-1">{Math.round(trackWetness)}%</span></div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Average Lap</div>
                        <div className="font-mono text-xl font-bold text-white">{displayAvgLap}</div>
                    </div>
                    <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-2xl font-black text-white italic">
                        {position > 0 ? `P${position}` : "-"}
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
                {/* PNEUS (Gauche) - INTÉGRATION lmu_wheels_extra */}
                <div className="col-span-3 flex flex-col gap-2">
                    <div className="flex gap-2 flex-1">
                        {renderTire('FL', tires?.fl, tirePressures?.fl, brakeTemps?.flc, tireTemps?.fl, compounds?.fl, lmu_wheels_extra?.fl)}
                        {renderTire('FR', tires?.fr, tirePressures?.fr, brakeTemps?.frc, tireTemps?.fr, compounds?.fr, lmu_wheels_extra?.fr)}
                    </div>
                    <div className="flex gap-2 flex-1">
                        {renderTire('RL', tires?.rl, tirePressures?.rl, brakeTemps?.rlc, tireTemps?.rl, compounds?.rl, lmu_wheels_extra?.rl)}
                        {renderTire('RR', tires?.rr, tirePressures?.rr, brakeTemps?.rrc, tireTemps?.rr, compounds?.rr, lmu_wheels_extra?.rr)}
                    </div>
                </div>

                {/* DASHBOARD (Centre) */}
                <div className="col-span-6 bg-slate-900/30 border border-white/5 rounded-xl p-5 flex flex-col justify-between relative">
                    {/* DESIGN RPM */}
                    <div className="mb-4 relative group">
                        <div className={`absolute -inset-1 rounded-lg blur opacity-30 transition-opacity duration-75 ${isShiftNow ? 'bg-cyan-400 opacity-100 animate-pulse' : 'bg-transparent'}`}></div>
                        <div className="h-10 bg-slate-950 rounded-lg border border-slate-700 relative overflow-hidden flex items-center shadow-inner">
                            <div className="absolute inset-0 flex justify-between px-2 items-end pb-1 opacity-30 z-10 pointer-events-none">
                                {[...Array(11)].map((_, i) => (
                                    <div key={i} className={`w-px bg-slate-500 ${i % 5 === 0 ? 'h-5' : 'h-2'}`}></div>
                                ))}
                            </div>
                            <div className={`h-full transition-all duration-75 ease-linear relative z-0 flex items-center justify-end pr-2 overflow-hidden ${isShiftNow ? 'bg-cyan-400 animate-pulse shadow-[0_0_30px_rgba(34,211,238,0.8)_inset]' : 'bg-gradient-to-r from-emerald-600 via-yellow-500 to-red-600'}`} style={{width: `${rpmPct}%`}}>
                                <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/20 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 w-full h-[20%] bg-gradient-to-t from-black/20 to-transparent"></div>
                            </div>
                            <div className="absolute right-4 z-20 flex flex-col items-end leading-none drop-shadow-md">
                                <div className={`text-xl font-black italic font-mono ${isShiftNow ? 'text-black' : 'text-white'}`}>{currentRpm}</div>
                                <div className={`text-[8px] font-bold ${isShiftNow ? 'text-black/70' : 'text-slate-500'}`}>RPM</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center gap-8 mb-2">
                        <div className="text-center">
                            <div className="text-5xl font-black italic text-white tracking-tighter drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">{Math.round(Number(speed))}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">KM/H</div>
                        </div>
                        <div className={`w-28 h-28 rounded-xl border-4 flex items-center justify-center text-7xl font-black shadow-inner transition-colors duration-100 ${isShiftNow ? 'bg-cyan-500 border-cyan-300 text-black animate-pulse' : 'bg-black border-slate-800 text-white'}`}>
                            {gear === -1 ? 'R' : (gear === 0 ? 'N' : gear)}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-500 w-6">THR</span>
                                <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{width: `${Number(throttle)*100}%`}}></div></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-500 w-6">BRK</span>
                                <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{width: `${Number(brake)*100}%`}}></div></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-500 w-6">CLT</span>
                                <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${Number(clutch)*100}%`}}></div></div>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center items-center gap-1">
                            <div className="text-[10px] text-slate-500 font-bold uppercase">Steering Angle</div>
                            <div className="text-lg font-black text-white">{Math.round(Number(steering)*100)}<span className="text-xs text-slate-500 ml-1">%</span></div>
                        </div>
                    </div>

                    {/* PANNEAU ELECTRONICS */}
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                            <div className="mb-1.5 flex justify-end">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${hasElectronicsData ? 'text-emerald-300 bg-emerald-900/30 border border-emerald-500/30' : 'text-amber-300 bg-amber-900/30 border border-amber-500/30'}`}>
                                    {hasElectronicsData ? 'ELEC LIVE' : 'ELEC NO DATA'}
                                </span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <div className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-colors ${electronics.tc_active ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-black/40 border-slate-700/50'}`}>
                                    <span className="text-[8px] text-slate-400 font-bold tracking-wider">TC</span>
                                    <span className="font-mono text-sm text-white font-black">{Number(electronics.tc) || 0}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-slate-700/50 bg-black/40">
                                    <span className="text-[8px] text-slate-400 font-bold tracking-wider">TC CUT</span>
                                    <span className="font-mono text-sm text-amber-400 font-black">{Number(electronics.tc_cut) || 0}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-slate-700/50 bg-black/40">
                                    <span className="text-[8px] text-slate-400 font-bold tracking-wider">TC SLIP</span>
                                    <span className="font-mono text-sm text-amber-400 font-black">{Number(electronics.tc_slip) || 0}</span>
                                </div>
                                <div className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-colors ${electronics.abs_active ? 'bg-red-500/20 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-black/40 border-slate-700/50'}`}>
                                    <span className="text-[8px] text-slate-400 font-bold tracking-wider">ABS</span>
                                    <span className="font-mono text-sm text-white font-black">{Number(electronics.abs) || 0}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-slate-700/50 bg-black/40">
                                    <span className="text-[8px] text-slate-400 font-bold tracking-wider">MAP</span>
                                    <span className="font-mono text-sm text-emerald-400 font-black">{Number(electronics.motor_map) || 0}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-slate-700/50 bg-black/40">
                                    <span className="text-[8px] text-slate-400 font-bold tracking-wider">MIG</span>
                                    <span className="font-mono text-sm text-white font-black">{Number(electronics.brake_migration) || 0}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-slate-700/50 bg-black/40">
                                    <span className="text-[8px] text-slate-400 font-bold tracking-wider">B BIAS</span>
                                    <span className="font-mono text-sm text-white font-black">{Number(electronics.brake_bias || 0).toFixed(1)}%</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-slate-700/50 bg-black/40">
                                    <span className="text-[8px] text-slate-400 font-bold tracking-wider">ARB F</span>
                                    <span className="font-mono text-sm text-white font-black">{Number(electronics.anti_sway_front) || 0}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-slate-700/50 bg-black/40">
                                    <span className="text-[8px] text-slate-400 font-bold tracking-wider">ARB R</span>
                                    <span className="font-mono text-sm text-white font-black">{Number(electronics.anti_sway_rear) || 0}</span>
                                </div>
                                <div className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-colors ${electronics.wiper_state > 0 ? 'bg-blue-500/20 border-blue-500' : 'bg-black/40 border-slate-700/50'}`}>
                                    <span className="text-[8px] text-slate-400 font-bold tracking-wider">WIPER</span>
                                    <span className={`font-mono text-sm font-black ${electronics.wiper_state > 0 ? 'text-blue-300' : 'text-slate-600'}`}>
                                        {electronics.wiper_state === 0 ? 'OFF' : electronics.wiper_state}
                                    </span>
                                </div>
                            </div>
                        </div>
                </div>

                {/* DATA (Droite) */}
                <div className="col-span-3 min-h-0 flex flex-col gap-3">
                    {/* WIDGET CONSO (zone prioritaire toujours visible) */}
                    <div className="flex flex-col gap-2 shrink-0">
                        <ConsumptionWidget
                            label="FUEL LEVEL" icon={<Fuel size={12} className="text-blue-400"/>} barColor="bg-blue-500"
                            current={Number(fuel?.current) || 0} max={Number(fuel?.max) || 100} lastLap={Number(fuel?.lastLapCons) || 0} avg={Number(fuel?.averageCons) || 0} target={targetFuelCons} unit="L" threshold={0.1} step={0.1} onAdjust={(d) => onSetFuelTarget && onSetFuelTarget(Number(((targetFuelCons || Number(fuel?.averageCons) || 0) + d).toFixed(2)))} onReset={() => onSetFuelTarget && onSetFuelTarget(null)}
                        />
                        {showVEWidget && (
                            <ConsumptionWidget
                                label="VIRTUAL ENERGY" icon={<Zap size={12} className="text-cyan-300"/>} barColor="bg-cyan-500"
                                current={Number(VE?.VEcurrent) || 0} max={100} lastLap={Number(VE?.VElastLapCons) || 0} avg={Number(VE?.VEaverageCons) || 0} target={targetVECons} unit="%" threshold={0.5} step={0.5} onAdjust={(d) => onSetVETarget && onSetVETarget(Number(((targetVECons || Number(VE?.VEaverageCons) || 0) + d).toFixed(2)))} onReset={() => onSetVETarget && onSetVETarget(null)}
                        />
                        )}
                    </div>

                    {/* Zone scrollable pour éviter la coupe quand le widget Hypercar est présent */}
                    <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-3">
                        {/* WIDGET HYBRIDE */}
                        {isCategoryHypercar && (
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2"><Zap size={12}/> Hybrid System</span>
                                <div className="mb-3">
                                    <div className="flex justify-between items-center text-sm mb-1">
                                        <span className="text-slate-300">SoC</span>
                                        <span className="font-bold text-emerald-400">{Math.round(Number(batterySoc))}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400" style={{width: `${Math.min(100, Math.max(0, Number(batterySoc)))}%`}}></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                                    <div><span className="text-slate-500 text-[10px] block">TEMP MOTEUR</span><span className={`font-bold ${Number(electric?.motorTemp) > 100 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{Math.round(Number(electric?.motorTemp || 0))}°C</span></div>
                                    <div className="text-right"><span className="text-slate-500 text-[10px] block">COUPLE</span><span className="font-bold text-cyan-300">{Math.round(Number(electric?.torque || 0))} Nm</span></div>
                                </div>
                            </div>
                        )}

                        {/* TEMPÉRATURES MOTEUR */}
                        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                            <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2"><Thermometer size={12}/> Engine</span>
                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="bg-black/30 p-1 rounded"><div className="text-[9px] text-slate-500">OIL</div><div className="font-mono font-bold text-amber-500">{Math.round(Number(oilTemp))}°</div></div>
                                <div className="bg-black/30 p-1 rounded"><div className="text-[9px] text-slate-500">WATER</div><div className="font-mono font-bold text-blue-400">{Math.round(Number(waterTemp))}°</div></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                            <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Wheel Damage</span>
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                {(['fl', 'fr', 'rl', 'rr'] as const).map((wheel, idx) => {
                                    const wheelHealth = vehicleHealth?.by_wheel?.[wheel];
                                    const flat = Boolean(wheelHealth?.flat);
                                    const detached = Boolean(wheelHealth?.detached);
                                    const susp = Number(restapiSuspensionDamage?.[idx] ?? 0);
                                    return (
                                        <div key={wheel} className="bg-black/30 rounded p-2 border border-white/5">
                                            <div className="flex items-center justify-between">
                                                <span className="uppercase text-slate-400 font-bold">{wheel}</span>
                                                <span className={`px-1 rounded font-bold ${detached ? 'text-red-300 bg-red-900/30' : flat ? 'text-amber-300 bg-amber-900/30' : 'text-emerald-300 bg-emerald-900/30'}`}>
                                                    {detached ? 'DET' : flat ? 'FLAT' : 'OK'}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-slate-300">Susp: <span className="font-mono text-cyan-300">{susp.toFixed(2)}</span></div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-2 text-[10px] text-slate-500">
                                Flats: {Number(vehicleHealth?.tire_flat_count || 0)} | Detached: {Number(vehicleHealth?.wheel_detached_count || 0)} | Next pit laps: {Number(strategyPitLaps || 0)}
                            </div>
                        </div>

                        {/* WIDGET MÉTÉO */}
                        <WeatherWidget forecast={weatherForecast || []} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TelemetryView;


import React, { useState } from 'react';
import { Fuel, Zap, CloudRain, Sun, Cloud, Thermometer, RefreshCw, Plus, Minus, XCircle } from 'lucide-react';
import type { TelemetryData, WeatherNode } from '../../types';
import WeatherWidget from './WeatherWidget';

// --- FONCTIONS UTILITAIRES ---

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

const getTempColor = (temp: number, type: 'brake' | 'tire') => {
    if (type === 'brake') {
        if (temp > 700) return 'text-red-500 font-black animate-pulse';
        if (temp > 500) return 'text-emerald-400 font-bold';
        return 'text-slate-400';
    } else {
        if (temp > 110) return 'text-red-500 font-black animate-pulse';
        if (temp > 85) return 'text-emerald-400 font-bold';
        return 'text-blue-400';
    }
};

const getWeatherIcon = (weather: string) => {
    switch (weather) {
        case 'SUNNY': return <Sun size={18} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"/>;
        case 'CLOUDY': return <Cloud size={18} className="text-slate-400"/>;
        case 'RAIN': case 'WET': return <CloudRain size={18} className="text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]"/>;
        default: return <Sun size={18} className="text-yellow-400"/>;
    }
};

// --- COMPOSANT PRINCIPAL ---

interface TelemetryViewProps {
    telemetryData: TelemetryData;
    isHypercar: boolean;
    isLMGT3: boolean;
    position: number;
    avgLapTimeSeconds: number;
    weather: string;
    airTemp: number;
    trackTemp: number; // AJOUT DE LA TEMP PISTE
    trackWetness: number;

    // Cibles (Targets)
    targetFuelCons?: number;
    targetVECons?: number;
    onSetFuelTarget?: (val: number | null) => void;
    onSetVETarget?: (val: number | null) => void;

    // Météo
    weatherForecast?: WeatherNode[];
}

const TelemetryView: React.FC<TelemetryViewProps> = ({
                                                         telemetryData, isHypercar, isLMGT3, position,
                                                         weather, airTemp, trackTemp, trackWetness,
                                                         targetFuelCons, targetVECons, onSetFuelTarget, onSetVETarget,
                                                         weatherForecast
                                                     }) => {
    const {
        tires, tireCompounds, fuel, VE, electric, batterySoc, carCategory,
        brakeTemps, tireTemps, tirePressures,
        throttle, brake, clutch, steering,
        speed, rpm, maxRpm, gear, waterTemp, oilTemp
    } = telemetryData;

    const moyLap = Number(telemetryData.curLap) || 0;
    const compounds = tireCompounds || { fl: "---", fr: "---", rl: "---", rr: "---" };

    const isCategoryGT3 = isLMGT3 || (carCategory && typeof carCategory === 'string' && (carCategory.toLowerCase().includes('gt3') || carCategory.toLowerCase().includes('lmgt3')));
    const isCategoryHypercar = isHypercar || (carCategory && typeof carCategory === 'string' && (carCategory.toLowerCase().includes('hyper') || carCategory.toLowerCase().includes('lmh') || carCategory.toLowerCase().includes('lmdh') || carCategory.toLowerCase().includes('gtop')));

    const [showVirtualEnergy, setShowVirtualEnergy] = useState(true);
    const isVE = showVirtualEnergy && (isCategoryHypercar || isCategoryGT3);

    // --- LOGIQUE RESSOURCES ---
    const currentResource = Number(isVE ? VE?.VEcurrent : fuel?.current) || 0;
    const maxResource = Number(isVE ? 100 : fuel?.max) || 100;
    const resourcePercentage = Math.min(100, Math.max(0, (currentResource / maxResource) * 100));

    const lastLapCons = Number(isVE ? VE?.VElastLapCons : fuel?.lastLapCons) || 0;
    const avgCons = Number(isVE ? VE?.VEaverageCons : fuel?.averageCons) || 0;

    // --- LOGIQUE CIBLES ---
    const currentTarget = isVE ? (targetVECons || avgCons) : (targetFuelCons || avgCons);
    const setTargetFunc = isVE ? onSetVETarget : onSetFuelTarget;

    const deltaCons = avgCons - currentTarget;
    const threshold = isVE ? 0.5 : 0.1;

    let statusColor = 'text-slate-400';
    let statusText = 'TARGET';

    if (deltaCons > threshold) {
        statusColor = 'text-red-500 animate-pulse';
        statusText = 'LIFT';
    } else if (deltaCons < -threshold) {
        statusColor = 'text-emerald-400';
        statusText = 'SAFE';
    } else {
        statusText = 'OK';
    }

    const adjustTarget = (delta: number) => { if (setTargetFunc) setTargetFunc(Number((currentTarget + delta).toFixed(2))); };
    const resetTarget = () => { if (setTargetFunc) setTargetFunc(null); };

    const barColor = isVE ? 'bg-cyan-500' : 'bg-blue-500';
    const label = isVE ? 'VIRTUAL ENERGY' : 'FUEL LEVEL';
    const icon = isVE ? <Zap size={14} className="text-cyan-300"/> : <Fuel size={14} className="text-blue-400"/>;

    const renderTire = (name: string, wear: number, pressure: number, brakeT: number, tireT: number[], compound: string) => {
        const displayWear = Number(wear) || 0;
        const displayBrakeT = Number(brakeT) || 0;
        const displayPress = Number(pressure) || 0;
        const displayTireT = Number(tireT?.[1]) || 0;

        return (
            <div className="flex flex-col gap-1 flex-1 h-full justify-center bg-slate-900/60 p-2 rounded-lg border border-white/5">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest">{name}</span>
                    <span className={`text-[9px] font-black uppercase px-1 rounded ${getCompoundBadgeColor(compound)}`}>{compound}</span>
                </div>

                <div className="relative w-full h-16 bg-slate-950 rounded border border-slate-700 overflow-hidden">
                    <div className={`absolute bottom-0 left-0 right-0 w-full transition-all duration-700 ${getTireColorGradient(displayWear)}`} style={{ height: `${displayWear}%` }}></div>
                    <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-white drop-shadow-md">{Math.round(displayWear)}%</div>
                </div>

                <div className="flex justify-between text-[9px] font-mono text-slate-300 mt-1">
                    <div className="flex flex-col items-center"><span className="text-slate-500">PRESS</span><span className="text-white font-bold">{displayPress.toFixed(1)}</span></div>
                    <div className="flex flex-col items-center"><span className="text-slate-500">TEMP</span><span className={getTempColor(displayTireT, 'tire')}>{Math.round(displayTireT)}°</span></div>
                    <div className="flex flex-col items-center"><span className="text-slate-500">BRAKE</span><span className={getTempColor(displayBrakeT, 'brake')}>{Math.round(displayBrakeT)}°</span></div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full bg-[#050a10] p-4 flex flex-col gap-4 overflow-hidden font-display">

            {/* HEADER CORRIGÉ */}
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 flex items-center justify-between shrink-0 shadow-lg">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-lg border border-white/5">
                        {getWeatherIcon(weather)}
                        <span className="text-xs font-bold text-slate-200 tracking-wide">{weather}</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                        {/* TEMPERATURE AIR */}
                        <div><span className="text-slate-500 font-bold">AIR</span> <span className="text-white font-mono ml-1">{Math.round(airTemp)}°C</span></div>

                        {/* TEMPERATURE PISTE (AJOUTÉ) */}
                        <div><span className="text-slate-500 font-bold">TRACK</span> <span className="text-amber-500 font-mono ml-1">{Math.round(trackTemp)}°C</span></div>

                        {/* HUMIDITÉ PISTE (Seulement si > 0) */}
                        {trackWetness > 0.5 && (
                            <div><span className="text-blue-400 font-bold">WET</span> <span className="text-blue-200 font-mono ml-1">{Math.round(trackWetness)}%</span></div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Moyenne LapTime</div>
                        <div className="font-mono text-xl font-bold text-white">{moyLap}</div>
                    </div>
                    {/* POSITION DE CLASSE */}
                    <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-2xl font-black text-white italic">P{position}</div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">

                {/* PNEUS (Gauche) */}
                <div className="col-span-3 flex flex-col gap-2">
                    <div className="flex gap-2 flex-1">
                        {renderTire('FL', tires.fl, tirePressures.fl, brakeTemps.flc, tireTemps.fl, compounds.fl)}
                        {renderTire('FR', tires.fr, tirePressures.fr, brakeTemps.frc, tireTemps.fr, compounds.fr)}
                    </div>
                    <div className="flex gap-2 flex-1">
                        {renderTire('RL', tires.rl, tirePressures.rl, brakeTemps.rlc, tireTemps.rl, compounds.rl)}
                        {renderTire('RR', tires.rr, tirePressures.rr, brakeTemps.rrc, tireTemps.rr, compounds.rr)}
                    </div>
                </div>

                {/* DASHBOARD (Centre) */}
                <div className="col-span-6 bg-slate-900/30 border border-white/5 rounded-xl p-6 flex flex-col justify-between relative">
                    <div className="w-full h-6 bg-slate-950 rounded overflow-hidden relative mb-4 border border-slate-700">
                        <div className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-75" style={{width: `${(Number(rpm)/Number(maxRpm))*100}%`}}></div>
                    </div>

                    <div className="flex-1 flex items-center justify-center gap-8">
                        <div className="text-center">
                            <div className="text-6xl font-black italic text-white tracking-tighter">{Math.round(Number(speed))}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase">KM/H</div>
                        </div>
                        <div className="w-32 h-32 bg-black rounded-xl border-4 border-slate-800 flex items-center justify-center text-8xl font-black text-white shadow-inner">
                            {gear === -1 ? 'R' : (gear === 0 ? 'N' : gear)}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{width: `${Number(throttle)*100}%`}}></div></div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{width: `${Number(brake)*100}%`}}></div></div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${Number(clutch)*100}%`}}></div></div>
                        </div>
                        <div className="flex justify-center items-center">
                            <div className="text-xs text-slate-500 font-bold uppercase">Steering: {Math.round(Number(steering)*100)}%</div>
                        </div>
                    </div>
                </div>

                {/* DATA (Droite) */}
                <div className="col-span-3 flex flex-col gap-3">

                    {/* WIDGET CONSO INTELLIGENT */}
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5 flex-1 relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-400 flex items-center gap-2">{icon} {label}</span>
                            {(isCategoryHypercar || isCategoryGT3) && (
                                <button onClick={() => setShowVirtualEnergy(!showVirtualEnergy)} className="text-slate-500 hover:text-white transition-colors">
                                    <RefreshCw size={12}/>
                                </button>
                            )}
                        </div>
                        <div className="h-4 bg-slate-950 rounded border border-slate-700 overflow-hidden mb-2 relative">
                            <div className={`h-full ${barColor} transition-all duration-500`} style={{width: `${resourcePercentage}%`}}></div>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-2xl font-black text-white leading-none">
                                    {currentResource.toFixed(1)} <span className="text-sm text-slate-500">{isVE ? '%' : 'L'}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">Last: {lastLapCons.toFixed(2)}</div>
                            </div>

                            <div className="text-right flex flex-col items-end">
                                <div className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                    Target
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 rounded px-1 border border-slate-700">
                                        <button onClick={() => adjustTarget(isVE ? -0.5 : -0.1)} className="p-0.5 hover:text-white text-slate-400"><Minus size={10}/></button>
                                        <button onClick={resetTarget} className="p-0.5 hover:text-blue-400 text-slate-400"><XCircle size={10}/></button>
                                        <button onClick={() => adjustTarget(isVE ? 0.5 : 0.1)} className="p-0.5 hover:text-white text-slate-400"><Plus size={10}/></button>
                                    </div>
                                </div>
                                <div className={`text-xl font-mono font-bold ${statusColor}`}>
                                    {avgCons.toFixed(2)}
                                    <span className="text-[10px] text-slate-500 ml-1">/ {currentTarget.toFixed(2)}</span>
                                </div>
                                <div className={`text-[10px] font-black ${statusColor} uppercase tracking-wider bg-black/20 px-1 rounded`}>{statusText}</div>
                            </div>
                        </div>
                    </div>

                    {/* HYBRIDE */}
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

                    {/* TEMPÉRATURES */}
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                        <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2"><Thermometer size={12}/> Engine</span>
                        <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-black/30 p-1 rounded"><div className="text-[9px] text-slate-500">OIL</div><div className="font-mono font-bold text-amber-500">{Math.round(Number(oilTemp))}°</div></div>
                            <div className="bg-black/30 p-1 rounded"><div className="text-[9px] text-slate-500">WATER</div><div className="font-mono font-bold text-blue-400">{Math.round(Number(waterTemp))}°</div></div>
                        </div>
                    </div>

                    {/* WIDGET MÉTÉO */}
                    <WeatherWidget forecast={weatherForecast || []} />

                </div>

            </div>
        </div>
    );
};

export default TelemetryView;
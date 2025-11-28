import React, { useState } from 'react';
import { Disc, Battery, Fuel, Zap, Activity, Flag, Trophy, Clock, CloudRain, Sun, Cloud, Thermometer, Flame, Droplet, RefreshCw } from 'lucide-react';

const getTireColor = (wear: number) => {
  if (wear > 70) return 'bg-emerald-500 shadow-emerald-500/50';
  if (wear > 40) return 'bg-amber-500 shadow-amber-500/50';
  return 'bg-red-600 shadow-red-600/50 animate-pulse';
};

const formatLapTime = (s: number) => {
    if (isNaN(s) || s <= 0) return "---";
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`; 
};

const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'SUNNY': return <Sun size={20} className="text-yellow-400"/>;
      case 'CLOUDY': return <Cloud size={20} className="text-slate-400"/>;
      case 'RAIN':
      case 'WET': return <CloudRain size={20} className="text-blue-400"/>;
      default: return <Sun size={20} className="text-yellow-400"/>;
    }
};

const getTireTempColor = (temp: number) => {
  if (temp >= 90 && temp <= 100) return 'text-indigo-400 font-bold';
  if (temp >= 80 && temp < 90 || temp > 100 && temp <= 110) return 'text-amber-400';
  return 'text-red-500 font-black animate-pulse';
};

const getBrakeTempColor = (temp: number) => {
  if (temp >= 500 && temp <= 650) return 'text-emerald-400 font-bold'; 
  if (temp < 500 && temp >= 300) return 'text-amber-400';
  if (temp > 650) return 'text-red-500 font-black animate-pulse';
  return 'text-slate-500';
};

const TelemetryView = ({ telemetryData, isHypercar, position, avgLapTimeSeconds, weather, airTemp, trackWetness }: any) => { 
  const { tires, fuel, laps, virtualEnergy, batterySoc, virtualEnergyAvgCons, virtualEnergyLastLapCons, moyLap, curLap, brakeTemps, tireTemps, throttle, brake, speed, rpm, maxRpm, waterTemp, oilTemp } = telemetryData;

  const [showVirtualEnergy, setShowVirtualEnergy] = useState(false);

  // Logique d'affichage dynamique (Fuel ou VE)
  const isVE = showVirtualEnergy && isHypercar;
  const currentResource = isVE ? virtualEnergy : fuel.current;
  const maxResource = isVE ? 100 : fuel.max;
  const resourcePercentage = (currentResource / maxResource) * 100;
  const barColor = isVE ? 'bg-gradient-to-r from-cyan-600 to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'bg-blue-600';
  const label = isVE ? 'Virtual Energy' : 'Fuel Level';
  const icon = isVE ? <Zap size={14} className="text-yellow-300 fill-yellow-300"/> : <Fuel size={14}/>;
  const labelColor = isVE ? 'text-cyan-400' : 'text-slate-500';

  const delta = moyLap - avgLapTimeSeconds;
  let deltaColorClass = 'text-white';
  let deltaSign = '';
  if (delta > 0.5) { deltaColorClass = 'text-red-500'; deltaSign = '+'; } 
  else if (delta < -0.5) { deltaColorClass = 'text-emerald-500'; } 
  else if (delta !== 0) { deltaColorClass = 'text-amber-500'; deltaSign = delta > 0 ? '+' : ''; }
  const displayDelta = delta !== 0 ? `${deltaSign}${delta.toFixed(2)}s` : '±0.0s';

  return (
    <div className="flex-1 overflow-hidden bg-[#050a10] p-6 flex flex-col gap-6">
      
      {/* HEADER INFO */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                  {getWeatherIcon(weather)}
                  <span className="text-sm font-bold text-white uppercase">{weather}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Thermometer size={16} className="text-red-400"/>
                  <span className="font-mono text-white">{airTemp}°C</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <CloudRain size={16} className="text-blue-400"/>
                  <span className="font-mono text-white">{trackWetness}%</span>
              </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <Trophy size={20} className="text-indigo-400"/>
                <div className="text-4xl font-black text-white italic tracking-tighter font-mono">P{position}</div>
            </div>
            <div className="flex flex-col items-end">
                <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><Clock size={12} className="text-amber-500"/> Avg Lap (Last 3)</div>
                <div className="text-3xl font-black italic tracking-tighter font-mono flex items-center gap-2">
                    <span className="text-white">{formatLapTime(moyLap)}</span>
                    <span className={`text-base font-bold ${deltaColorClass}`}>{displayDelta}</span>
                </div>
            </div>
          </div>
      </div>
      
      {/* MAIN CONTENT */}
      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        
        {/* PNEUS (Gauche) */}
        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center relative">
            <h3 className="absolute top-4 left-4 text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <Disc size={14}/> Tire Wear
            </h3>
            <div className="absolute top-4 right-4 text-[9px] font-bold text-slate-500 uppercase flex flex-col items-end gap-1">
                <div className="flex items-center gap-1"><Flame size={10} className="text-red-400"/><span>Brake</span></div>
                <div className="flex items-center gap-1"><Thermometer size={10} className="text-indigo-400"/><span>Tire</span></div>
            </div>
            
            <div className="flex gap-8 mt-10">
                {/* GAUCHE */}
                <div className="flex flex-col gap-12">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold">FL</span>
                        <div className={`w-16 h-24 rounded-lg border-2 border-slate-700 flex items-end justify-center overflow-hidden relative bg-slate-800`}>
                            <div className={`w-full transition-all duration-500 ${getTireColor(tires.fl)}`} style={{ height: `${tires.fl}%` }}></div>
                            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-black text-lg text-white drop-shadow-md">{tires.fl}%</span>
                        </div>
                        <div className="mt-1 flex flex-col items-center text-xs font-mono">
                            <span className={getBrakeTempColor(brakeTemps.flc)}><Flame size={10} className="inline mr-1"/>{brakeTemps.flc}°</span>
                            <span className={getTireTempColor(tireTemps.flc)}><Thermometer size={10} className="inline mr-1"/>{tireTemps.flc}°</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold">RL</span>
                        <div className={`w-16 h-24 rounded-lg border-2 border-slate-700 flex items-end justify-center overflow-hidden relative bg-slate-800`}>
                            <div className={`w-full transition-all duration-500 ${getTireColor(tires.rl)}`} style={{ height: `${tires.rl}%` }}></div>
                            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-black text-lg text-white drop-shadow-md">{tires.rl}%</span>
                        </div>
                        <div className="mt-1 flex flex-col items-center text-xs font-mono">
                            <span className={getBrakeTempColor(brakeTemps.rlc)}><Flame size={10} className="inline mr-1"/>{brakeTemps.rlc}°</span>
                            <span className={getTireTempColor(tireTemps.rlc)}><Thermometer size={10} className="inline mr-1"/>{tireTemps.rlc}°</span>
                        </div>
                    </div>
                </div>

                {/* VOITURE */}
                <div className="w-20 h-full flex items-center justify-center opacity-20">
                    <div className="w-10 h-48 bg-slate-500 rounded-t-3xl rounded-b-xl"></div>
                </div>

                {/* DROITE */}
                <div className="flex flex-col gap-12">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold">FR</span>
                        <div className={`w-16 h-24 rounded-lg border-2 border-slate-700 flex items-end justify-center overflow-hidden relative bg-slate-800`}>
                            <div className={`w-full transition-all duration-500 ${getTireColor(tires.fr)}`} style={{ height: `${tires.fr}%` }}></div>
                            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-black text-lg text-white drop-shadow-md">{tires.fr}%</span>
                        </div>
                        <div className="mt-1 flex flex-col items-center text-xs font-mono">
                            <span className={getBrakeTempColor(brakeTemps.frc)}><Flame size={10} className="inline mr-1"/>{brakeTemps.frc}°</span>
                            <span className={getTireTempColor(tireTemps.frc)}><Thermometer size={10} className="inline mr-1"/>{tireTemps.frc}°</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold">RR</span>
                        <div className={`w-16 h-24 rounded-lg border-2 border-slate-700 flex items-end justify-center overflow-hidden relative bg-slate-800`}>
                            <div className={`w-full transition-all duration-500 ${getTireColor(tires.rr)}`} style={{ height: `${tires.rr}%` }}></div>
                            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-black text-lg text-white drop-shadow-md">{tires.rr}%</span>
                        </div>
                        <div className="mt-1 flex flex-col items-center text-xs font-mono">
                            <span className={getBrakeTempColor(brakeTemps.rrc)}><Flame size={10} className="inline mr-1"/>{brakeTemps.rrc}°</span>
                            <span className={getTireTempColor(tireTemps.rrc)}><Thermometer size={10} className="inline mr-1"/>{tireTemps.rrc}°</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* COLONNE DROITE : DATA */}
        <div className="flex-1 flex flex-col gap-4">
            
            {/* CURRENT LAP */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute right-0 top-0 p-4 opacity-10 text-indigo-400"><Clock size={100}/></div>
                <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><Clock size={14}/> Current Lap Time</h3>
                <div className="text-6xl font-black text-white tracking-tighter font-mono">{formatLapTime(curLap)}</div>
            </div>

            {/* --- BLOC ÉNERGIE --- */}
            <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col justify-center relative group">
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-xs font-bold uppercase flex items-center gap-2 transition-colors duration-300 ${labelColor}`}>
                        {icon} {label}
                    </h3>
                    
                    {isHypercar && (
                        <button 
                            onClick={() => setShowVirtualEnergy(!showVirtualEnergy)}
                            className="text-[10px] font-bold uppercase flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-all border border-slate-700 hover:border-cyan-500"
                            title="Switch Fuel / Virtual Energy"
                        >
                            <RefreshCw size={12} className={showVirtualEnergy ? "text-cyan-400 rotate-180 transition-transform duration-500" : "transition-transform duration-500"}/>
                            {showVirtualEnergy ? "Show Fuel" : "Show VE"}
                        </button>
                    )}
                </div>

                {/* BARRE PRINCIPALE (FUEL ou VE) */}
                <div className="w-full bg-slate-800 h-10 rounded-full overflow-hidden border border-slate-700 relative shadow-inner">
                    <div 
                        className={`h-full flex items-center justify-end px-3 transition-all duration-700 ease-out ${barColor}`} 
                        style={{ width: `${resourcePercentage}%` }}
                    >
                    </div>
                    <span className="absolute inset-0 flex items-center justify-center font-black text-lg text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-10 tracking-widest">
                        {isVE ? `${Math.round(currentResource)}%` : `${currentResource.toFixed(1)} L / ${maxResource} L`}
                    </span>
                </div>

                {/* INFOS DETAILLÉES SOUS LA BARRE */}
                <div className="mt-3 flex justify-between text-[10px] text-slate-400 font-mono h-4 items-center">
                    {!isVE && (
                        <>
                            <span>Last Lap: {fuel.lastLapCons.toFixed(2)} L</span>
                            <span>AvgLapTime: {fuel.averageCons.toFixed(2)} L</span>
                        </>
                    )}
                    {isVE && (
                        <>
                            <span className="text-cyan-300">Last: {virtualEnergyLastLapCons?.toFixed(2)} %</span>
                            <span className="text-cyan-300 font-bold">Avg: {virtualEnergyAvgCons?.toFixed(2)} %/Lap</span>
                        </>
                    )}
                </div>

                {/* BATTERIE PHYSIQUE */}
                {isHypercar && (
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <Battery size={10}/> BAT
                        </div>
                        <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-green-500 transition-all duration-500" 
                                style={{width: `${batterySoc}%`}}
                            ></div>
                        </div>
                        <div className="text-[10px] font-mono text-white font-bold">{batterySoc}%</div>
                    </div>
                )}
            </div>

            {/* MOTEUR & PÉDALES */}
            <div className="flex gap-4 h-40"> 
                <div className="flex-[2] bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col relative overflow-hidden">
                    <div className="flex justify-between items-start z-10">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">TELEMETRY</div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                                <Thermometer size={14} className={waterTemp > 105 ? "text-red-500 animate-pulse" : "text-blue-400"}/>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[9px] text-slate-500 font-bold">WATER</span>
                                    <span className="text-xs font-mono font-bold text-white">{waterTemp}°</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Droplet size={14} className={oilTemp > 110 ? "text-red-500 animate-pulse" : "text-amber-500"}/>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[9px] text-slate-500 font-bold">OIL</span>
                                    <span className="text-xs font-mono font-bold text-white">{oilTemp}°</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center z-10 mt-2">
                        <span className="text-6xl font-black text-white italic tracking-tighter tabular-nums">{Math.round(speed)}</span>
                        <span className="text-sm font-bold text-slate-500 ml-2 self-end mb-4">KM/H</span>
                    </div>

                    <div className="w-full bg-slate-800 h-3 rounded-full mt-auto overflow-hidden border border-slate-700 relative z-10">
                        <div 
                            className={`h-full transition-all duration-75 ease-linear ${rpm > maxRpm * 0.95 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                            style={{ width: `${(rpm / maxRpm) * 100}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1 z-10">
                        <span>0</span>
                        <span className={rpm > maxRpm * 0.95 ? "text-red-500 font-bold" : ""}>{rpm} RPM</span>
                        <span>{maxRpm}</span>
                    </div>
                </div>

                <div className="w-24 bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex justify-center gap-2">
                    <div className="flex flex-col items-center gap-1 h-full w-full">
                        <div className="flex-1 w-full bg-slate-800 rounded overflow-hidden relative border border-slate-700">
                            <div className="absolute bottom-0 left-0 right-0 bg-red-600 transition-all duration-75" style={{ height: `${brake}%` }}></div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 h-full w-full">
                        <div className="flex-1 w-full bg-slate-800 rounded overflow-hidden relative border border-slate-700">
                            <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 transition-all duration-75" style={{ height: `${throttle}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute right-0 top-0 p-4 opacity-10"><Flag size={100}/></div> 
                <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><Activity size={14}/> Laps Completed (Total)</h3>
                <div className="text-6xl font-black text-white tracking-tighter font-mono">{laps} <span className="text-xl text-slate-600">LAPS</span></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryView;
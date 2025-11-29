import React, { useState, useEffect } from 'react';
import { Disc, Battery, Fuel, Zap, Activity, Flag, Trophy, Clock, CloudRain, Sun, Cloud, Thermometer, Flame, Droplet, RefreshCw } from 'lucide-react';

// --- UTILITAIRES VISUELS ---

const getTireColorGradient = (wear: number) => {
  // Dégradé fluide du vert au rouge
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

const formatLapTime = (s: number) => {
    if (isNaN(s) || s <= 0) return "-:--.---";
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`; 
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

const TelemetryView = ({ telemetryData, isHypercar, isLMGT3, position, avgLapTimeSeconds, weather, airTemp, trackWetness }: any) => { 
  const { 
      tires, tireCompounds, fuel, laps, VE, 
      moyLap, curLap, brakeTemps, tireTemps, 
      throttle, brake, speed, rpm, maxRpm, 
      waterTemp, oilTemp, batterySoc,
      carCategory // Récupération de la catégorie envoyée par le Bridge
  } = telemetryData;

  const [showVirtualEnergy, setShowVirtualEnergy] = useState(false);
  const compounds = tireCompounds || { fl: "---", fr: "---", rl: "---", rr: "---" };
  
  // --- CORRECTION ---
  // Détection robuste : on utilise le flag isLMGT3 (basé sur l'ID) OU la catégorie réelle du jeu
  const isCategoryGT3 = isLMGT3 || (carCategory && typeof carCategory === 'string' && (carCategory.toLowerCase().includes('gt3') || carCategory.toLowerCase().includes('lmgt3')));
  
  // --- AJOUT : Force l'affichage VE si Hypercar/GT3 est détecté ---
  useEffect(() => {
      if (isHypercar || isCategoryGT3) {
          setShowVirtualEnergy(true);
      }
  }, [isHypercar, isCategoryGT3]);

  // Gestion Energie (Hypercar OU GT3)
  const isVE = showVirtualEnergy && (isHypercar || isCategoryGT3);
  
  const currentResource = isVE ? VE.VEcurrent : fuel.current;
  const maxResource = isVE ? 100 : fuel.max;
  const resourcePercentage = Math.min(100, Math.max(0, (currentResource / maxResource) * 100));
  
  const barColor = isVE 
    ? 'bg-gradient-to-r from-cyan-600 via-cyan-400 to-white shadow-[0_0_20px_rgba(6,182,212,0.6)]' 
    : 'bg-gradient-to-r from-blue-700 via-blue-500 to-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.5)]';
  
  const label = isVE ? 'VIRTUAL ENERGY' : 'FUEL LEVEL';
  const icon = isVE ? <Zap size={14} className="text-cyan-300 fill-cyan-300"/> : <Fuel size={14} className="text-blue-400"/>;

  // Calcul Delta
  const delta = moyLap - avgLapTimeSeconds;
  let deltaColorClass = 'text-slate-400';
  let deltaSign = '';
  if (delta > 0.5) { deltaColorClass = 'text-red-500 shadow-red-500/20'; deltaSign = '+'; } 
  else if (delta < -0.5) { deltaColorClass = 'text-emerald-400 shadow-emerald-400/20'; } 
  
  const displayDelta = delta !== 0 ? `${deltaSign}${Math.abs(delta).toFixed(2)}` : '-.--';

  const renderTire = (name: string, wear: number, brakeT: number, tireT: number, compound: string) => (
    <div className="flex flex-col items-center gap-2 flex-1 h-full justify-center">
        <span className="text-[10px] text-slate-500 font-bold tracking-widest">{name}</span>
        
        {/* Pneu Graphique */}
        <div className="relative w-12 lg:w-16 flex-1 bg-slate-900/80 rounded-lg border border-slate-700 overflow-hidden shadow-inner group flex flex-col justify-end">
            <div className={`absolute bottom-0 left-0 right-0 w-full transition-all duration-700 ease-out ${getTireColorGradient(wear)}`} style={{ height: `${wear}%` }}>
                <div className="w-full h-full opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjIiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSIjMDAwIiAvPgo8L3N2Zz4=')]"></div>
            </div>
            
            {/* Badge Compound */}
            <div className="absolute bottom-1 left-0 right-0 flex justify-center z-20">
                 <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border backdrop-blur-sm ${getCompoundBadgeColor(compound)}`}>
                    {compound}
                 </span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center z-10 pb-4">
                <span className="text-base lg:text-xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-mono">{Math.round(wear)}%</span>
            </div>
        </div>

        {/* Temps */}
        <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between bg-black/40 px-1.5 py-0.5 rounded text-[9px] border border-white/5">
                <Flame size={10} className="text-slate-600"/> 
                <span className={`font-mono ${getTempColor(brakeT, 'brake')}`}>{Math.round(brakeT)}°</span>
            </div>
            <div className="flex items-center justify-between bg-black/40 px-1.5 py-0.5 rounded text-[9px] border border-white/5">
                <Thermometer size={10} className="text-slate-600"/> 
                <span className={`font-mono ${getTempColor(tireT, 'tire')}`}>{Math.round(tireT)}°</span>
            </div>
        </div>
    </div>
  );

  return (
    <div className="h-full w-full bg-[#050a10] p-3 lg:p-4 flex flex-col gap-3 overflow-hidden font-display">
      
      {/* 1. HEADER COMPACT (Fixe) */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 flex items-center justify-between shrink-0 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-lg border border-white/5">
                  {getWeatherIcon(weather)}
                  <span className="text-xs font-bold text-slate-200 tracking-wide">{weather}</span>
              </div>
              <div className="hidden sm:flex gap-4">
                <div className="flex flex-col leading-none">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">AIR</span>
                    <span className="text-xs font-mono text-white">{airTemp}°C</span>
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">TRACK</span>
                    <span className="text-xs font-mono text-blue-300">{trackWetness}%</span>
                </div>
              </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center justify-end gap-1">
                    <Clock size={10}/> Moyenne des tours
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xl font-bold text-white">{formatLapTime(moyLap)}</span>
                    <span className={`font-mono text-xs font-bold ${deltaColorClass}`}>{displayDelta}</span>
                </div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/30">
                <span className="text-2xl font-black text-white italic -skew-x-6">{position}</span>
            </div>
          </div>
      </div>
      
      {/* 2. GRID PRINCIPALE */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
        
        {/* COLONNE GAUCHE : PNEUS */}
        <div className="flex-[2] bg-slate-900/40 border border-white/5 rounded-xl p-4 flex flex-col relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                <Disc size={120} />
            </div>
            <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Activity size={14} className="text-indigo-500"/> Tyre Status</h3>
            </div>
            
            <div className="flex-1 flex gap-4 min-h-0">
                <div className="flex flex-col justify-between h-full gap-4">
                    {renderTire('FL', tires.fl, brakeTemps.flc, tireTemps.flc, compounds.fl)}
                    {renderTire('RL', tires.rl, brakeTemps.rlc, tireTemps.rlc, compounds.rl)}
                </div>
                
                <div className="flex items-center justify-center opacity-10 mx-2">
                    <div className="w-16 h-[80%] bg-slate-500 rounded-[2rem]"></div>
                </div>

                <div className="flex flex-col justify-between h-full gap-4">
                    {renderTire('FR', tires.fr, brakeTemps.frc, tireTemps.frc, compounds.fr)}
                    {renderTire('RR', tires.rr, brakeTemps.rrc, tireTemps.rrc, compounds.rr)}
                </div>
            </div>
        </div>

        {/* COLONNE DROITE : DATA */}
        <div className="flex-[3] flex flex-col gap-3 min-h-0">
            
            {/* LIGNE 1 : FUEL & LAP */}
            <div className="flex-1 flex gap-3 min-h-0">
                
                {/* Fuel / Energy */}
                <div className="flex-[3] bg-slate-900/40 border border-white/5 rounded-xl p-4 flex flex-col justify-center relative group">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">{icon} {label}</h3>
                        {/* Bouton switch visible si Hypercar OU GT3 détectée */}
                        {(isHypercar || isCategoryGT3) && (
                            <button onClick={() => setShowVirtualEnergy(!showVirtualEnergy)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white">
                                <RefreshCw size={12}/>
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 w-full bg-slate-950 rounded-lg overflow-hidden border border-white/10 relative shadow-inner min-h-[40px]">
                        <div className={`h-full transition-all duration-700 ease-out ${barColor}`} style={{ width: `${resourcePercentage}%` }}></div>
                        
                        <div className="absolute inset-0 flex items-center justify-between px-4">
                            <span className="text-2xl font-black text-white italic drop-shadow-md tracking-tighter">
                                {isVE ? `${Math.round(currentResource)}%` : `${currentResource.toFixed(1)} L`}
                            </span>
                            <div className="text-[10px] text-right text-white/80 font-mono leading-tight">
                                <div>LAST: <span className="font-bold">{isVE ? VE.VElastLapCons?.toFixed(1) + '%' : fuel.lastLapCons.toFixed(2)}</span></div>
                                <div>AVG: <span className="font-bold">{isVE ? VE.VEaverageCons?.toFixed(1) + '%' : fuel.averageCons.toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>

                    {isHypercar && (
                        <div className="mt-3 flex items-center gap-2">
                            <Battery size={12} className="text-green-400"/>
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" style={{width: `${batterySoc}%`}}></div>
                            </div>
                            <span className="text-[10px] font-mono text-green-400 font-bold">{batterySoc}%</span>
                        </div>
                    )}
                </div>

                {/* Tour Actuel */}
                <div className="flex-[2] bg-slate-900/40 border border-white/5 rounded-xl p-4 flex flex-col justify-center items-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500/5"></div>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Current Lap</span>
                    <span className="text-4xl lg:text-5xl font-black text-white italic tracking-tighter font-mono drop-shadow-lg">
                        {formatLapTime(curLap)}
                    </span>
                </div>
            </div>

            {/* LIGNE 2 : TELEMETRIE VOITURE */}
            <div className="flex-[2] bg-slate-900/40 border border-white/5 rounded-xl p-4 flex flex-col min-h-0 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4 z-10 shrink-0">
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <Droplet size={14} className={oilTemp > 110 ? "text-red-500 animate-pulse" : "text-amber-500"}/>
                            <div>
                                <div className="text-[9px] font-bold text-slate-500">OIL</div>
                                <div className="text-sm font-mono font-bold text-white">{Math.round(oilTemp)}°</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Thermometer size={14} className={waterTemp > 105 ? "text-red-500 animate-pulse" : "text-blue-400"}/>
                            <div>
                                <div className="text-[9px] font-bold text-slate-500">WATER</div>
                                <div className="text-sm font-mono font-bold text-white">{Math.round(waterTemp)}°</div>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-5xl lg:text-6xl font-black text-white italic tracking-tighter leading-none tabular-nums">
                            {Math.round(speed)}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mr-1">KM/H</div>
                    </div>
                </div>

                <div className="mt-auto flex flex-col gap-2 z-10">
                    <div className="flex gap-2 h-2">
                        <div className="flex-1 bg-slate-800 rounded-full overflow-hidden flex flex-col-reverse relative">
                            <div className="absolute inset-0 bg-red-600 transition-all duration-75 origin-left" style={{ width: `${brake}%` }}></div>
                        </div>
                        <div className="flex-1 bg-slate-800 rounded-full overflow-hidden flex flex-col-reverse relative">
                            <div className="absolute inset-0 bg-emerald-500 transition-all duration-75 origin-left" style={{ width: `${throttle}%` }}></div>
                        </div>
                    </div>

                    <div className="w-full bg-slate-950 h-6 lg:h-8 rounded-md overflow-hidden border border-slate-700 relative">
                        <div className="absolute right-0 top-0 bottom-0 w-[10%] bg-red-900/30 border-l border-red-500/50 z-0"></div>
                        <div 
                            className={`h-full transition-all duration-75 ease-linear ${rpm > maxRpm * 0.95 ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'bg-gradient-to-r from-indigo-600 to-cyan-400'}`} 
                            style={{ width: `${(rpm / maxRpm) * 100}%` }}
                        ></div>
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSI0IiBmaWxsPSJyZ2JhKDAsMCwwLDAuMikiIC8+Cjwvc3ZnPg==')] opacity-30"></div>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow-md font-mono">{rpm}</span>
                    </div>
                </div>
            </div>

            {/* LIGNE 3 : TOTAL LAPS */}
            <div className="bg-slate-900/40 border border-white/5 rounded-xl p-3 flex items-center justify-between shrink-0 overflow-hidden relative">
                <div className="flex items-center gap-3 z-10">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Flag size={18}/></div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Laps</div>
                        <div className="text-2xl font-black text-white italic tracking-tighter">{laps}</div>
                    </div>
                </div>
                <div className="absolute right-[-10px] bottom-[-10px] opacity-10 rotate-12">
                    <Trophy size={60}/>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default TelemetryView;
import React from 'react';
import { Disc, Battery, Fuel, Zap, Activity, Flag, Trophy, Clock, CloudRain, Sun, Cloud, Thermometer, Flame } from 'lucide-react';

// Fonction utilitaire pour la couleur des pneus selon l'usure
const getTireColor = (wear) => {
  // Vert > 70% (usure faible)
  if (wear > 70) return 'bg-emerald-500 shadow-emerald-500/50';
  // Jaune > 40% (usure moyenne)
  if (wear > 40) return 'bg-amber-500 shadow-amber-500/50';
  // Rouge <= 40% (usure critique)
  return 'bg-red-600 shadow-red-600/50 animate-pulse';
};

// Fonction pour formater les temps au tour (X:XX.X)
const formatLapTime = (s) => {
    if (isNaN(s) || s <= 0) return "---";
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    // Utilise toFixed(1) pour garantir un chiffre après la virgule
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`; 
};

// Fonction pour afficher l'icône météo
const getWeatherIcon = (weather) => {
    switch (weather) {
      case 'SUNNY':
        return <Sun size={20} className="text-yellow-400"/>;
      case 'CLOUDY':
        return <Cloud size={20} className="text-slate-400"/>;
      case 'RAIN':
      case 'WET':
        return <CloudRain size={20} className="text-blue-400"/>;
      default:
        return <Sun size={20} className="text-yellow-400"/>;
    }
};

// Fonction utilitaire pour la couleur des températures des pneus
const getTireTempColor = (temp) => {
  // Optimal: 90-100 C
  if (temp >= 90 && temp <= 100) return 'text-indigo-400 font-bold';
  // Chaude/Froide: 80-89 C ou 101-110 C
  if (temp >= 80 && temp < 90 || temp > 100 && temp <= 110) return 'text-amber-400';
  // Critique (Trop Froid ou Trop Chaud)
  return 'text-red-500 font-black animate-pulse';
};

// Fonction utilitaire pour la couleur des freins (exemple basé sur des freins carbone)
const getBrakeTempColor = (temp) => {
  // Optimal: 500-650 C (Carbone)
  if (temp >= 500 && temp <= 650) return 'text-emerald-400 font-bold'; 
  // Trop froid ou Hors Plage (300-499 C)
  if (temp < 500 && temp >= 300) return 'text-amber-400';
  // Surchauffe
  if (temp > 650) return 'text-red-500 font-black animate-pulse';
  return 'text-slate-500';
};


const TelemetryView = ({ telemetryData, isHypercar, position, avgLapTimeSeconds, weather, airTemp, trackWetness }) => { 
  const { tires, fuel, laps, virtualEnergy, currentLapTimeSeconds, last3LapAvgSeconds, brakeTemps, tireTemps, throttle, brake, speed } = telemetryData;

  // Calcul du delta pour le style
  const estimatedTime = avgLapTimeSeconds;
  const realTimeAvg = last3LapAvgSeconds;
  const delta = realTimeAvg - estimatedTime;

  let deltaColorClass = 'text-white';
  let deltaSign = '';
  if (delta > 0.5) { // Plus lent
      deltaColorClass = 'text-red-500';
      deltaSign = '+';
  } else if (delta < -0.5) { // Plus rapide
      deltaColorClass = 'text-emerald-500';
  } else if (delta !== 0) { // Léger décalage
      deltaColorClass = 'text-amber-500';
      deltaSign = delta > 0 ? '+' : '';
  }
  const displayDelta = delta !== 0 ? `${deltaSign}${delta.toFixed(2)}s` : '±0.0s';


  return (
    <div className="flex-1 overflow-hidden bg-[#050a10] p-6 flex flex-col gap-6">
      
      {/* NOUVELLE LIGNE : MÉTÉO, POSITION & TEMPS RÉEL */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between shrink-0">
          
          {/* MÉTÉO & TEMPÉRATURE */}
          <div className="flex items-center gap-6">
              {/* Météo principale */}
              <div className="flex items-center gap-2">
                  {getWeatherIcon(weather)}
                  <span className="text-sm font-bold text-white uppercase">{weather}</span>
              </div>
              {/* Température */}
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Thermometer size={16} className="text-red-400"/>
                  <span className="font-mono text-white">{airTemp}°C</span>
              </div>
              {/* Humidité piste */}
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <CloudRain size={16} className="text-blue-400"/>
                  <span className="font-mono text-white">{trackWetness}%</span>
              </div>
          </div>

          {/* POSITION & TEMPS MOYEN */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <Trophy size={20} className="text-indigo-400"/>
                <div className="text-4xl font-black text-white italic tracking-tighter font-mono">P{position}</div>
            </div>
            
            {/* BLOC TEMPS RÉEL MOYEN */}
            <div className="flex flex-col items-end">
                <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><Clock size={12} className="text-amber-500"/> Avg Lap (Last 3)</div>
                <div className="text-3xl font-black italic tracking-tighter font-mono flex items-center gap-2">
                    <span className="text-white">{formatLapTime(realTimeAvg)}</span>
                    <span className={`text-base font-bold ${deltaColorClass}`}>{displayDelta}</span>
                </div>
            </div>
          </div>

      </div>
      
      {/* LIGNE DU HAUT : PNEUS & INFOS GÉNÉRALES */}
      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        
        {/* 🛞 BLOC PNEUS */}
        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center relative">
            <h3 className="absolute top-4 left-4 text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <Disc size={14}/> Tire Wear (Remaining Life)
            </h3>

            {/* Légende des nouvelles données */}
            <div className="absolute top-4 right-4 text-[9px] font-bold text-slate-500 uppercase flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                    <Flame size={10} className="text-red-400"/>
                    <span>Brake Temp (C)</span>
                </div>
                <div className="flex items-center gap-1">
                    <Thermometer size={10} className="text-indigo-400"/>
                    <span>Tire Center Temp (C)</span>
                </div>
            </div>
            
            {/* Représentation de la voiture */}
            <div className="flex gap-8 mt-10"> {/* Adjusted top margin due to legend */}
                {/* GAUCHE */}
                <div className="flex flex-col gap-12">
                    {/* FL */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold">FL</span>
                        <div className={`w-16 h-24 rounded-lg border-2 border-slate-700 flex items-end justify-center overflow-hidden relative bg-slate-800`}>
                            <div className={`w-full transition-all duration-500 ${getTireColor(tires.fl)}`} style={{ height: `${tires.fl}%` }}></div>
                            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-black text-lg text-white drop-shadow-md">{tires.fl}%</span>
                        </div>
                         {/* NOUVELLES DONNÉES */}
                        <div className="mt-1 flex flex-col items-center text-xs font-mono">
                            <span className={getBrakeTempColor(brakeTemps.flc)}><Flame size={10} className="inline mr-1"/>{brakeTemps.flc}°</span>
                            <span className={getTireTempColor(tireTemps.flc)}><Thermometer size={10} className="inline mr-1"/>{tireTemps.flc}°</span>
                        </div>
                        {/* --- */}
                    </div>
                    {/* RL */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold">RL</span>
                        <div className={`w-16 h-24 rounded-lg border-2 border-slate-700 flex items-end justify-center overflow-hidden relative bg-slate-800`}>
                            <div className={`w-full transition-all duration-500 ${getTireColor(tires.rl)}`} style={{ height: `${tires.rl}%` }}></div>
                            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-black text-lg text-white drop-shadow-md">{tires.rl}%</span>
                        </div>
                        {/* NOUVELLES DONNÉES */}
                        <div className="mt-1 flex flex-col items-center text-xs font-mono">
                            <span className={getBrakeTempColor(brakeTemps.rlc)}><Flame size={10} className="inline mr-1"/>{brakeTemps.rlc}°</span>
                            <span className={getTireTempColor(tireTemps.rlc)}><Thermometer size={10} className="inline mr-1"/>{tireTemps.rlc}°</span>
                        </div>
                        {/* --- */}
                    </div>
                </div>

                {/* CENTRE (VOITURE SCHÉMATIQUE) */}
                <div className="w-20 h-full flex items-center justify-center opacity-20">
                    <div className="w-10 h-48 bg-slate-500 rounded-t-3xl rounded-b-xl"></div>
                </div>

                {/* DROITE */}
                <div className="flex flex-col gap-12">
                    {/* FR */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold">FR</span>
                        <div className={`w-16 h-24 rounded-lg border-2 border-slate-700 flex items-end justify-center overflow-hidden relative bg-slate-800`}>
                            <div className={`w-full transition-all duration-500 ${getTireColor(tires.fr)}`} style={{ height: `${tires.fr}%` }}></div>
                            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-black text-lg text-white drop-shadow-md">{tires.fr}%</span>
                        </div>
                         {/* NOUVELLES DONNÉES */}
                        <div className="mt-1 flex flex-col items-center text-xs font-mono">
                            <span className={getBrakeTempColor(brakeTemps.frc)}><Flame size={10} className="inline mr-1"/>{brakeTemps.frc}°</span>
                            <span className={getTireTempColor(tireTemps.frc)}><Thermometer size={10} className="inline mr-1"/>{tireTemps.frc}°</span>
                        </div>
                        {/* --- */}
                    </div>
                    {/* RR */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold">RR</span>
                        <div className={`w-16 h-24 rounded-lg border-2 border-slate-700 flex items-end justify-center overflow-hidden relative bg-slate-800`}>
                            <div className={`w-full transition-all duration-500 ${getTireColor(tires.rr)}`} style={{ height: `${tires.rr}%` }}></div>
                            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-black text-lg text-white drop-shadow-md">{tires.rr}%</span>
                        </div>
                        {/* NOUVELLES DONNÉES */}
                        <div className="mt-1 flex flex-col items-center text-xs font-mono">
                            <span className={getBrakeTempColor(brakeTemps.rrc)}><Flame size={10} className="inline mr-1"/>{brakeTemps.rrc}°</span>
                            <span className={getTireTempColor(tireTemps.rrc)}><Thermometer size={10} className="inline mr-1"/>{tireTemps.rrc}°</span>
                        </div>
                        {/* --- */}
                    </div>
                </div>
            </div>
        </div>

        {/* ⛽️ BLOC CONSOMMABLES (Fuel, VE, Tours) */}
        <div className="flex-1 flex flex-col gap-4">
            
            {/* VITESSE DU TOUR EN COURS (NOUVEAU) */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute right-0 top-0 p-4 opacity-10 text-indigo-400"><Clock size={100}/></div>
                <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><Clock size={14}/> Current Lap Time</h3>
                <div className="text-6xl font-black text-white tracking-tighter font-mono">{formatLapTime(currentLapTimeSeconds)}</div>
            </div>

            {/* FUEL */}
            <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col justify-center relative">
                <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-4"><Fuel size={14}/> Fuel Level</h3>
                <div className="w-full bg-slate-800 h-8 rounded-full overflow-hidden border border-slate-700 relative">
                    <div className="h-full bg-blue-600 transition-all duration-700 flex items-center justify-end px-2" style={{ width: `${(fuel.current / fuel.max) * 100}%` }}>
                    </div>
                    <span className="absolute inset-0 flex items-center justify-center font-bold text-sm text-white drop-shadow">{fuel.current.toFixed(1)} L / {fuel.max} L</span>
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Last Lap: {fuel.lastLapCons.toFixed(2)} L</span>
                    <span>Avg: {fuel.averageCons.toFixed(2)} L</span>
                </div>
            </div>

            {/* VIRTUAL ENERGY (HYPERCAR ONLY) */}
            {isHypercar && (
                <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 p-4 opacity-5 text-cyan-400"><Zap size={120}/></div>
                    <h3 className="text-xs font-bold text-cyan-500 uppercase flex items-center gap-2 mb-2"><Battery size={14}/> Virtual Energy</h3>
                    
                    <div className="flex items-end gap-2">
                        <span className="text-5xl font-black text-white tracking-tighter font-mono">{virtualEnergy}%</span>
                        <span className="text-xs font-bold text-cyan-600 mb-2 bg-cyan-900/20 px-2 py-1 rounded border border-cyan-900/50">STINT USAGE</span>
                    </div>
                    
                    <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${virtualEnergy}%` }}></div>
                    </div>
                </div>
            )}
            <div className="flex gap-4 h-32">
                
                {/* VITESSE */}
                <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SPEED</div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-6xl font-black text-white italic tracking-tighter">{Math.round(speed)}</span>
                        <span className="text-sm font-bold text-slate-500">KM/H</span>
                    </div>
                </div>

                {/* PÉDALES (Jauges verticales) */}
                <div className="w-32 bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex justify-center gap-4">
                    {/* FREIN (Rouge) */}
                    <div className="flex flex-col items-center gap-1 h-full w-full">
                        <div className="flex-1 w-4 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700">
                            <div 
                                className="absolute bottom-0 left-0 right-0 bg-red-600 transition-all duration-75 ease-out" 
                                style={{ height: `${brake}%` }}
                            ></div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500">BRK</span>
                    </div>

                    {/* ACCÉLÉRATEUR (Vert) */}
                    <div className="flex flex-col items-center gap-1 h-full w-full">
                        <div className="flex-1 w-4 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700">
                            <div 
                                className="absolute bottom-0 left-0 right-0 bg-emerald-500 transition-all duration-75 ease-out" 
                                style={{ height: `${throttle}%` }}
                            ></div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500">THR</span>
                    </div>
                </div>
            </div>
             {/* TOURS EFFECTUÉS (DÉPLACÉ) */}
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
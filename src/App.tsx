import React, { useState, useEffect, useMemo } from 'react';
import { 
  Fuel, RotateCcw, Users, Flag, Timer, X, Save, AlertOctagon, 
  Settings, Play, Pause, CloudRain, Sun, Cloud, Wifi, 
  Calculator, StopCircle, Clock, FileText, ChevronRight, Phone, Trash2, Map as MapIcon, AlertTriangle
} from 'lucide-react';

// --- IMPORT DE L'IMAGE DEPUIS ASSETS ---
// Assure-toi que le nom du fichier est exact (majuscules/minuscules)
import trackMapImg from './assets/track-map.jpg'; 

// --- IMPORT FIREBASE ---
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";

// 👇 --- TA CONFIGURATION FIREBASE --- 👇
const firebaseConfig = {
  apiKey: "AIzaSyAezT5Np6-v18OBR1ICV3uHoFViQB555sg",
  authDomain: "le-mans-strat.firebaseapp.com",
  projectId: "le-mans-strat",
  storageBucket: "le-mans-strat.firebasestorage.app",
  messagingSenderId: "1063156323054",
  appId: "1:1063156323054:web:81e74528a75ffb770099ff"

};
// 👆 --------------------------------- 👆

// Initialisation
let db;
try {
  if (firebaseConfig.apiKey) {
      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
  }
} catch (error) { console.error("Firebase Error", error); }

const SESSION_ID = "lemans-2025-race";

// 🛡️ SÉCURITÉ ANTI-CRASH
const getSafeDriver = (driver) => {
  return driver || { name: "---", phone: "", color: "from-slate-700 to-slate-800", text: "text-slate-500" };
};

const RaceStrategyApp = () => {
  // --- STATE ---
  const [status, setStatus] = useState("CONNECTING...");
  const [showSettings, setShowSettings] = useState(false);
  const [showFuelCalc, setShowFuelCalc] = useState(false);
  const [viewMode, setViewMode] = useState("STRATEGY");
  
  const [calcLaps, setCalcLaps] = useState("");
  const [calcFuel, setCalcFuel] = useState("");

  const [localRaceTime, setLocalRaceTime] = useState(24 * 3600);
  const [localStintTime, setLocalStintTime] = useState(0);
  const [pitStopTimer, setPitStopTimer] = useState(0);

  const [gameState, setGameState] = useState({
    currentLap: 1,
    raceTime: 24 * 60 * 60,
    stintStartTime: Date.now(),
    isRaceRunning: false,
    isPitStopActive: false,
    pitStopStartTime: 0,
    weather: "DRY",
    fuelCons: 3.65,
    tankCapacity: 105,
    lapsTarget: 380,
    isEmergency: false,
    drivers: [
      { id: 1, name: "Antoine", phone: "06 00 00 00 00", color: "from-blue-600 to-blue-700", text: "text-blue-400" },
      { id: 2, name: "Enzo", phone: "06 00 00 00 00", color: "from-emerald-600 to-emerald-700", text: "text-emerald-400" },
      { id: 3, name: "Ewan", phone: "06 00 00 00 00", color: "from-purple-600 to-purple-700", text: "text-purple-400" },
      { id: 4, name: "Pilote 4", phone: "00 00 00 00 00", color: "from-amber-600 to-amber-700", text: "text-amber-400" }
    ],
    activeDriverIndex: 0,
    incidents: [], 
    stintNotes: {}
  });

  // --- SYNC ---
  useEffect(() => {
    if (!db) { setStatus("OFFLINE (No DB)"); return; }
    const docRef = doc(db, "strategies", SESSION_ID);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) { setGameState(docSnap.data()); setStatus("LIVE SYNC"); }
      else { setDoc(docRef, gameState).then(() => setStatus("LIVE SYNC")); }
    });
    return () => unsubscribe();
  }, []);

  // --- TIMERS ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState.isRaceRunning) setLocalRaceTime(prev => Math.max(0, prev - 1));
      else setLocalRaceTime(gameState.raceTime);

      if (gameState.isRaceRunning) setLocalStintTime(Math.floor((Date.now() - gameState.stintStartTime) / 1000));
      if (gameState.isPitStopActive) setPitStopTimer(Math.floor((Date.now() - gameState.pitStopStartTime) / 1000));
      else setPitStopTimer(0);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // --- ACTIONS ---
  const syncUpdate = (data) => {
    if (!db) { setGameState(prev => ({...prev, ...data})); return; }
    updateDoc(doc(db, "strategies", SESSION_ID), data);
  };

  const addIncident = () => {
    const newInc = { id: Date.now(), lap: gameState.currentLap, time: formatTime(localRaceTime), text: "" };
    syncUpdate({ incidents: [newInc, ...gameState.incidents] });
  };
  const deleteIncident = (id) => syncUpdate({ incidents: gameState.incidents.filter(inc => inc.id !== id) });
  const updateIncidentInfo = (id, txt) => syncUpdate({ incidents: gameState.incidents.map(inc => inc.id === id ? { ...inc, text: txt } : inc) });
  const updateDriverInfo = (idx, field, val) => {
    const newDrivers = [...gameState.drivers];
    newDrivers[idx] = { ...newDrivers[idx], [field]: val };
    syncUpdate({ drivers: newDrivers });
  };
  const handleDriverSwap = () => syncUpdate({ activeDriverIndex: (gameState.activeDriverIndex + 1) % gameState.drivers.length, stintStartTime: Date.now(), isPitStopActive: false });
  const togglePitStop = () => syncUpdate({ isPitStopActive: !gameState.isPitStopActive, pitStopStartTime: Date.now() });
  const applyFuelCalc = () => {
    const l = parseFloat(calcLaps), f = parseFloat(calcFuel);
    if (l > 0 && f > 0) { syncUpdate({ fuelCons: parseFloat((f / l).toFixed(3)) }); setShowFuelCalc(false); setCalcLaps(""); setCalcFuel(""); }
  };
  const formatTime = (s) => {
    if(isNaN(s)) return "00:00";
    const h = Math.floor(s/3600).toString().padStart(2,'0'), m = Math.floor((s%3600)/60).toString().padStart(2,'0'), sec = (s%60).toString().padStart(2,'0');
    return `${h}:${m}:${sec}`;
  };

  // --- STRATEGY ---
  const strategyData = useMemo(() => {
    if (!gameState.drivers || gameState.drivers.length === 0) return { stints: [], lapsPerTank: 0 };
    const safeCons = gameState.fuelCons || 3.5, lapsPerTank = Math.floor(gameState.tankCapacity / safeCons);
    const totalStops = Math.max(0, Math.ceil(gameState.lapsTarget / lapsPerTank) - 1);
    const stints = [];
    let lapCounter = 0;
    
    for (let i = 0; i <= totalStops; i++) {
      const isLast = i === totalStops, lapsThisStint = isLast ? (gameState.lapsTarget - lapCounter) : lapsPerTank;
      const endLap = lapCounter + lapsThisStint;
      const driver = getSafeDriver(gameState.drivers[(gameState.activeDriverIndex + i) % gameState.drivers.length]);
      const isActive = gameState.currentLap >= lapCounter && gameState.currentLap < endLap;
      stints.push({ id: i, stopNum: i+1, startLap: lapCounter, endLap, fuel: (lapsThisStint * safeCons).toFixed(1), driver, isActive, note: isActive ? "CURRENT" : (isLast ? "FINISH" : "BOX") });
      lapCounter += lapsThisStint;
    }
    return { stints, lapsPerTank };
  }, [gameState]);

  const activeStint = strategyData.stints.find(s => s.isActive) || strategyData.stints[0];
  const activeDriver = getSafeDriver(gameState.drivers[gameState.activeDriverIndex]);
  const progressPercent = activeStint ? Math.min(100, Math.max(0, ((gameState.currentLap - activeStint.startLap) / (activeStint.endLap - activeStint.startLap || 1)) * 100)) : 0;

  // --- CSS (CORRECTIF PLEIN ECRAN) ---
  const css = `
    :root, body, #root { width: 100vw; height: 100vh; margin: 0; padding: 0; max-width: none !important; overflow: hidden; background-color: #020408; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
    .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
    .map-invert { filter: invert(1) hue-rotate(180deg) contrast(0.9); opacity: 0.9; }
  `;

  return (
    <div className="w-screen h-screen bg-[#020408] text-slate-200 flex flex-col font-sans overflow-hidden">
      <style>{css}</style>
      
      {/* HEADER */}
      <div className="h-16 glass-panel flex items-center justify-between px-6 sticky top-0 z-50 shrink-0 w-full">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded transform skew-x-[-10deg]"><Flag className="text-white transform skew-x-[10deg]" size={20}/></div>
          <div>
            <h1 className="font-bold text-lg lg:text-xl tracking-tighter text-white italic">LMU <span className="text-indigo-500">24H</span></h1>
            <div className={`text-[10px] font-bold tracking-widest flex items-center gap-1 ${status.includes('LIVE') ? 'text-emerald-500' : 'text-red-500'}`}><Wifi size={10}/> {status}</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 bg-black/40 px-6 py-1.5 rounded-lg border border-white/5">
           <div className="text-right">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">RACE TIME</div>
              <div className={`font-mono text-2xl lg:text-3xl font-bold leading-none ${localRaceTime < 3600 ? 'text-red-500' : 'text-white'}`}>{formatTime(localRaceTime)}</div>
           </div>
           <button onClick={() => syncUpdate({ isRaceRunning: !gameState.isRaceRunning })} className={`p-2 rounded-full border transition-all ${gameState.isRaceRunning ? 'border-amber-500 text-amber-500 bg-amber-900/10' : 'border-emerald-500 text-emerald-500 bg-emerald-900/10'}`}>
              {gameState.isRaceRunning ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor" className="ml-0.5"/>}
           </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white/10 rounded text-slate-400"><Settings size={20}/></button>
          <button onClick={addIncident} className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 px-3 py-2 rounded font-bold text-xs uppercase"><AlertOctagon size={16}/> <span className="hidden sm:inline">Incident</span></button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 lg:p-6 gap-6 w-full">
        {/* LEFT */}
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-4 h-full overflow-hidden">
          <div className="glass-panel rounded-xl p-6 relative overflow-hidden group shrink-0">
             <div className={`absolute top-0 right-0 w-[60%] h-full bg-gradient-to-l ${activeDriver.color} opacity-10 transform skew-x-12`}></div>
             <div className="flex justify-between items-start mb-6 relative">
                <div>
                   <div className="flex items-center gap-2 mb-1">{gameState.isPitStopActive ? <span className="bg-yellow-500 text-black px-1.5 rounded text-[9px] font-bold animate-pulse">PIT STOP</span> : <span className="text-[9px] font-bold text-slate-400 tracking-widest flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> DRIVER</span>}</div>
                   <h2 className="text-3xl lg:text-4xl font-black text-white italic uppercase tracking-tighter truncate max-w-[250px]">{activeDriver.name}</h2>
                   {activeDriver.phone && <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-1"><Phone size={10} /> {activeDriver.phone}</div>}
                   <div className="flex items-center gap-2 mt-3 text-indigo-300 font-mono text-xs lg:text-sm bg-indigo-500/10 px-2 py-1 rounded w-fit border border-indigo-500/20"><Clock size={14} /> Stint: {formatTime(localStintTime)}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-gradient-to-br ${activeDriver.color} flex items-center justify-center border border-white/10 shadow-lg`}><Users size={20} className="text-white" /></div>
                   <button onClick={handleDriverSwap} className="text-[9px] font-bold uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700">Swap</button>
                </div>
             </div>
             <div className="mb-5 bg-black/20 p-3 rounded-lg border border-white/5">
                <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 mb-2 uppercase"><span>Lap {gameState.currentLap}</span>{activeStint && <span className="text-indigo-400">Box Lap: {activeStint.endLap}</span>}</div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5 overflow-hidden"><div className={`h-full bg-gradient-to-r ${activeDriver.color}`} style={{ width: `${progressPercent}%` }}></div></div>
             </div>
             <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => syncUpdate({currentLap: Math.max(1, gameState.currentLap - 1)})} className="h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs font-bold border border-slate-700">- 1 LAP</button>
                <button onClick={() => syncUpdate({currentLap: gameState.currentLap + 1})} className="h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-lg font-bold shadow-lg border border-indigo-400/50">+ 1 LAP</button>
             </div>
             <div className="grid grid-cols-2 gap-2">
                 <div className="bg-black/30 rounded p-1 flex gap-1">{['DRY', 'DAMP', 'WET'].map(w => <button key={w} onClick={() => syncUpdate({weather: w})} className={`flex-1 flex justify-center items-center py-1 rounded text-[10px] ${gameState.weather === w ? 'bg-slate-600 text-white shadow' : 'text-slate-600'}`}>{w === 'DRY' ? <Sun size={14}/> : w === 'DAMP' ? <Cloud size={14}/> : <CloudRain size={14}/>}</button>)}</div>
                 <button onClick={togglePitStop} className={`flex items-center justify-center gap-2 rounded text-xs font-bold uppercase border transition-all ${gameState.isPitStopActive ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500 animate-pulse' : 'bg-slate-800 text-slate-400 border-slate-700'}`}><StopCircle size={16}/> {gameState.isPitStopActive ? formatTime(pitStopTimer) : "Pit Timer"}</button>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4 shrink-0">
             <div className="glass-panel rounded-xl p-3 flex flex-col justify-between h-24">
                <div className="flex justify-between items-start"><div className="text-slate-500 text-[9px] font-bold uppercase"><Fuel size={12} className="inline mr-1"/> AVG FUEL</div><button onClick={() => setShowFuelCalc(true)} className="text-indigo-400 hover:text-white"><Calculator size={12}/></button></div>
                <div className="text-2xl lg:text-3xl font-mono font-bold text-white tracking-tighter">{gameState.fuelCons}</div>
             </div>
             <div className="glass-panel rounded-xl p-3 flex flex-col justify-between h-24">
                <div className="text-slate-500 text-[9px] font-bold uppercase"><RotateCcw size={12} className="inline mr-1"/> STINT MAX</div>
                <div className="text-2xl lg:text-3xl font-mono font-bold text-emerald-400 tracking-tighter">{strategyData.lapsPerTank}</div>
             </div>
          </div>
          <div className="glass-panel rounded-xl flex-1 flex flex-col overflow-hidden min-h-[150px]">
             <div className="p-2 border-b border-white/5 bg-black/20 text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 flex justify-between items-center shrink-0"><span>RACE LOG</span><span className="text-[9px] opacity-50">{gameState.incidents.length} EVENTS</span></div>
             <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {gameState.incidents.length === 0 && <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-2"><AlertTriangle size={24} className="opacity-20"/><span className="text-xs">No incidents recorded</span></div>}
                {gameState.incidents.map((inc) => (
                   <div key={inc.id} className="bg-slate-900/50 p-2 rounded border-l-2 border-red-500/50 flex flex-col gap-1 group">
                      <div className="flex justify-between items-start">
                         <div className="flex gap-2 items-center"><span className="text-[9px] font-mono text-slate-500">{inc.time}</span><span className="text-[10px] text-red-300 font-bold uppercase">Lap {inc.lap}</span></div>
                         <button onClick={() => deleteIncident(inc.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                      </div>
                      <input type="text" placeholder="Add details..." value={inc.text || ""} onChange={(e) => updateIncidentInfo(inc.id, e.target.value)} className="bg-transparent border-b border-slate-800 hover:border-slate-600 focus:border-indigo-500 w-full text-xs text-slate-300 placeholder-slate-700 outline-none pb-0.5 transition-colors"/>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 glass-panel rounded-xl flex flex-col overflow-hidden shadow-2xl border-t-2 border-indigo-500 relative w-full">
           <div className="p-3 border-b border-white/5 bg-slate-900/50 flex justify-between items-center shrink-0">
              <div className="flex gap-1 p-1 bg-black/30 rounded-lg">
                 <button onClick={() => setViewMode("STRATEGY")} className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === "STRATEGY" ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><FileText size={14}/> Strategy</button>
                 <button onClick={() => setViewMode("MAP")} className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === "MAP" ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><MapIcon size={14}/> Map</button>
              </div>
              <button onClick={() => syncUpdate({isEmergency: !gameState.isEmergency})} className={`px-2 py-1 rounded text-[9px] font-bold border ${gameState.isEmergency ? 'bg-red-600 text-white border-red-600 animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{gameState.isEmergency ? '⚠ SAFETY CAR' : 'GREEN FLAG'}</button>
           </div>
           
           {viewMode === "STRATEGY" ? (
             <div className="flex-1 overflow-auto custom-scrollbar bg-[#050a10]">
                <table className="w-full text-left text-sm border-collapse">
                   <thead className="sticky top-0 bg-[#050a10] z-10 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
                      <tr><th className="p-3 w-10 text-center">#</th><th className="p-3">Driver</th><th className="p-3">Window</th><th className="p-3 text-right">Fuel</th><th className="p-3 text-center">Action</th><th className="p-3">Notes</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {strategyData.stints.map((stint) => (
                         <tr key={stint.id} className={`group hover:bg-white/[0.02] ${stint.isActive ? 'bg-indigo-500/10' : ''}`}>
                            <td className="p-3 text-center font-mono font-bold text-xs text-slate-600">{stint.stopNum}</td>
                            <td className="p-3"><span className={`font-bold text-xs uppercase ${stint.isActive ? 'text-white' : 'text-slate-400'}`}>{stint.driver.name}</span></td>
                            <td className="p-3 font-mono text-xs text-slate-300 flex items-center gap-1">{stint.startLap} <ChevronRight size={10} className="text-slate-600"/> {stint.endLap}</td>
                            <td className="p-3 text-right font-mono text-xs text-slate-300">{stint.fuel}</td>
                            <td className="p-3 text-center"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${stint.isActive ? 'border-indigo-500/30 text-indigo-300' : 'border-slate-700 text-slate-500'}`}>{stint.note}</span></td>
                            <td className="p-3"><input type="text" value={gameState.stintNotes[stint.stopNum] || ""} onChange={(e) => syncUpdate({ stintNotes: { ...gameState.stintNotes, [stint.stopNum]: e.target.value }})} className="bg-transparent border-b border-transparent focus:border-indigo-500 w-full text-xs text-slate-300 outline-none font-mono placeholder-slate-800" placeholder="..."/></td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           ) : (
             <div className="flex-1 bg-[#e5e5e5] flex items-center justify-center p-8 overflow-hidden relative">
                 {/* UTILISATION DE L'IMAGE IMPORTEE */}
                 <img src={trackMapImg} alt="Track Map" className="max-w-full max-h-full object-contain map-invert drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                 <div className="absolute bottom-4 right-4 text-black font-bold text-xs opacity-50">LE MANS 13.626 KM</div>
             </div>
           )}
        </div>
      </div>

      {/* MODALS */}
      {showFuelCalc && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="glass-panel w-full max-w-sm rounded-xl p-5 border border-slate-700">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4"><Calculator size={18}/> Calculator</h3>
              <div className="space-y-3">
                 <input type="number" value={calcLaps} onChange={e=>setCalcLaps(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white font-mono" placeholder="Laps done"/>
                 <input type="number" value={calcFuel} onChange={e=>setCalcFuel(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white font-mono" placeholder="Fuel used (L)"/>
                 <div className="flex gap-2 pt-2"><button onClick={()=>setShowFuelCalc(false)} className="flex-1 bg-slate-800 text-slate-300 py-2 rounded text-sm font-bold">Cancel</button><button onClick={applyFuelCalc} className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm font-bold">Apply</button></div>
              </div>
           </div>
        </div>
      )}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="glass-panel w-full max-w-lg rounded-xl p-6 border border-slate-700 space-y-4">
              <div className="flex justify-between items-center"><h2 className="text-lg font-bold text-white">SETTINGS</h2><button onClick={()=>setShowSettings(false)}><X className="text-slate-400"/></button></div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] text-slate-500 font-bold">TANK (L)</label><input type="number" value={gameState.tankCapacity} onChange={(e)=>syncUpdate({tankCapacity: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                 <div><label className="text-[10px] text-slate-500 font-bold">TARGET LAPS</label><input type="number" value={gameState.lapsTarget} onChange={(e)=>syncUpdate({lapsTarget: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
              </div>
              <div className="space-y-2 pt-2"><label className="text-[10px] text-slate-500 font-bold">DRIVERS & PHONES</label>{gameState.drivers && gameState.drivers.map((d, idx) => (<div key={d.id || idx} className="flex gap-2"><input type="text" value={d.name} onChange={(e) => updateDriverInfo(idx, 'name', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder="Name"/><input type="text" value={d.phone || ""} onChange={(e) => updateDriverInfo(idx, 'phone', e.target.value)} className="w-32 bg-slate-900 border border-slate-700 rounded p-2 text-slate-300 font-mono text-sm" placeholder="Tel"/></div>))}</div>
           </div>
        </div>
      )}
    </div>
  );
};

export default RaceStrategyApp;
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Fuel, RotateCcw, Users, Flag, X, Save, AlertOctagon, 
  Settings, Play, Pause, CloudRain, Sun, Cloud, Wifi, 
  Clock, FileText, ChevronRight, Phone, Trash2, Map as MapIcon, AlertTriangle, CheckCircle2, Plus, Minus, Home, Trophy
} from 'lucide-react';

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

// --- IMPORT IMAGES ---
import trackMapImg from './assets/track-map.jpg'; 
import lmp2CarImg from './assets/lmp2-car.jpg'; 
// 👇 AJOUT DE L'IMAGE HYPERCAR ICI 👇
import hypercarCarImg from './assets/hypercar-car.jpg'; 

const getSafeDriver = (driver) => {
  return driver || { id: 'unknown', name: "---", phone: "", color: "#3b82f6", text: "text-slate-500" };
};

// --- CSS GLOBAL ---
const globalCss = `
  :root, body, #root { width: 100vw; height: 100vh; margin: 0; padding: 0; max-width: none !important; overflow: hidden; background-color: #020408; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
  .map-invert { filter: invert(1) hue-rotate(180deg) contrast(0.9); opacity: 0.9; }
  .row-done { opacity: 0.3; }
  .row-current { background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; }
  .row-next { background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; animation: pulse-row 2s infinite; }
  @keyframes pulse-row { 0% { background: rgba(245, 158, 11, 0.05); } 50% { background: rgba(245, 158, 11, 0.15); } 100% { background: rgba(245, 158, 11, 0.05); } }
  select option { background: #0f172a; color: white; }
`;

// --- COMPOSANT : TABLEAU DE BORD D'UNE ÉQUIPE ---
const TeamDashboard = ({ teamId, teamName, teamColor, onBack }) => {
  const SESSION_ID = `lemans-2025-${teamId}`; 

  // --- STATE ---
  const [status, setStatus] = useState("CONNECTING...");
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState("STRATEGY");
  
  const [localRaceTime, setLocalRaceTime] = useState(24 * 3600);
  const [localStintTime, setLocalStintTime] = useState(0);

  const [gameState, setGameState] = useState({
    currentStint: 0,
    raceTime: 24 * 60 * 60,
    stintDuration: 0,
    stintStartTime: Date.now(),
    isRaceRunning: false,
    weather: "DRY",
    fuelCons: 3.65,
    tankCapacity: 105,
    lapsTarget: 380,
    isEmergency: false,
    drivers: [],
    activeDriverId: 0,
    incidents: [], 
    stintNotes: {},
    stintAssignments: {} 
  });

  // --- SYNC ENGINE ---
  useEffect(() => {
    if (!db) { setStatus("OFFLINE (No DB)"); return; }
    const docRef = doc(db, "strategies", SESSION_ID);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) { 
          const data = docSnap.data();
          if (typeof data.currentStint !== 'number') data.currentStint = 0;
          if (!data.stintAssignments) data.stintAssignments = {};
          if (!data.drivers) data.drivers = [];
          if (data.raceTime >= 24 * 60 * 60) data.isRaceRunning = false;

          setGameState(data); 
          setLocalRaceTime(data.raceTime);
          setLocalStintTime(data.stintDuration || 0);
          setStatus("LIVE"); 
      } else {
          const initialData = { 
              ...gameState, 
              drivers: [{id: 1, name: "Driver 1", color: teamId === 'hypercar' ? '#ef4444' : '#3b82f6', phone: ""}] 
          };
          setDoc(docRef, initialData).then(() => setStatus("CREATED"));
      }
    });
    return () => unsubscribe();
  }, [SESSION_ID]);

  // --- TIMERS LOOP ---
  useEffect(() => {
    let interval = null;
    if (gameState.isRaceRunning) {
        interval = setInterval(() => {
            setLocalRaceTime(prev => Math.max(0, prev - 1));
            setLocalStintTime(prev => prev + 1);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.isRaceRunning]);

  // --- ACTIONS ---
  const syncUpdate = (data) => {
    if (!db) { setGameState(prev => ({...prev, ...data})); return; }
    updateDoc(doc(db, "strategies", SESSION_ID), data);
  };

  const toggleRaceTimer = () => {
    if (gameState.isRaceRunning) syncUpdate({ isRaceRunning: false, raceTime: localRaceTime, stintDuration: localStintTime });
    else syncUpdate({ isRaceRunning: true });
  };

  const resetRaceTimer = () => {
      if(confirm("⚠️ RESET COMPLET DE LA COURSE ?")) {
          syncUpdate({ isRaceRunning: false, raceTime: 24 * 60 * 60, stintDuration: 0, currentStint: 0, incidents: [] });
          setLocalRaceTime(24 * 60 * 60);
          setLocalStintTime(0);
      }
  };
  
  const addDriver = () => {
      const newId = Date.now();
      const newDriver = { id: newId, name: "New Driver", phone: "", color: "#64748b" };
      syncUpdate({ drivers: [...gameState.drivers, newDriver] });
  };
  const removeDriver = (id) => {
      if (gameState.drivers.length <= 1) return; 
      syncUpdate({ drivers: gameState.drivers.filter(d => d.id !== id) });
  };
  const updateDriverInfo = (id, field, val) => {
      syncUpdate({ drivers: gameState.drivers.map(d => d.id === id ? { ...d, [field]: val } : d) });
  };

  const assignDriverToStint = (stintIndex, driverId) => {
      const id = Number(driverId);
      const newAssignments = { ...gameState.stintAssignments, [stintIndex]: id };
      if (stintIndex === gameState.currentStint) syncUpdate({ stintAssignments: newAssignments, activeDriverId: id });
      else syncUpdate({ stintAssignments: newAssignments });
  };

  const confirmPitStop = () => {
    const nextStint = (gameState.currentStint || 0) + 1;
    let nextDriverId = gameState.stintAssignments[nextStint];
    if (!nextDriverId && gameState.drivers.length > 0) {
        const currentIdx = gameState.drivers.findIndex(d => d.id === gameState.activeDriverId);
        nextDriverId = gameState.drivers[(currentIdx + 1) % gameState.drivers.length].id;
    }
    syncUpdate({ currentStint: nextStint, activeDriverId: nextDriverId, stintDuration: 0 });
    setLocalStintTime(0);
  };

  const undoStint = () => {
      if(gameState.currentStint > 0) {
        const prevStint = gameState.currentStint - 1;
        const prevDriverId = gameState.stintAssignments[prevStint] || (gameState.drivers[0]?.id);
        syncUpdate({ currentStint: prevStint, activeDriverId: prevDriverId });
      }
  };

  const updateFuel = (delta) => syncUpdate({ fuelCons: Number((gameState.fuelCons + delta).toFixed(2)) });
  
  const addIncident = () => {
    const newInc = { id: Date.now(), lap: "Stint " + (gameState.currentStint + 1), time: formatTime(localRaceTime), text: "" };
    syncUpdate({ incidents: [newInc, ...gameState.incidents] });
  };
  const deleteIncident = (id) => syncUpdate({ incidents: gameState.incidents.filter(inc => inc.id !== id) });
  const updateIncidentInfo = (id, txt) => syncUpdate({ incidents: gameState.incidents.map(inc => inc.id === id ? { ...inc, text: txt } : inc) });

  const formatTime = (s) => {
    if(isNaN(s)) return "00:00";
    const h = Math.floor(s/3600).toString().padStart(2,'0'), m = Math.floor((s%3600)/60).toString().padStart(2,'0'), sec = (s%60).toString().padStart(2,'0');
    return `${h}:${m}:${sec}`;
  };

  const strategyData = useMemo(() => {
    if (!gameState.drivers || gameState.drivers.length === 0) return { stints: [], lapsPerTank: 0 };
    const safeCons = gameState.fuelCons || 3.5;
    const safeTank = gameState.tankCapacity || 105;
    const lapsPerTank = Math.floor(safeTank / safeCons);
    const totalStops = Math.max(0, Math.ceil((gameState.lapsTarget || 380) / lapsPerTank) - 1);
    const stints = [];
    let lapCounter = 0;
    
    for (let i = 0; i <= totalStops; i++) {
      const isLast = i === totalStops;
      const lapsThisStint = isLast ? ((gameState.lapsTarget || 380) - lapCounter) : lapsPerTank;
      const endLap = lapCounter + lapsThisStint;
      let driverId = gameState.stintAssignments[i];
      if (!driverId && gameState.drivers.length > 0) driverId = gameState.drivers[i % gameState.drivers.length].id;
      const driver = getSafeDriver(gameState.drivers.find(d => d.id === driverId));
      
      stints.push({ 
          id: i, stopNum: i+1, startLap: lapCounter, endLap, 
          fuel: isLast ? (lapsThisStint * safeCons).toFixed(1) + " L" : "FULL ("+safeTank+" L)", 
          driver, driverId, isCurrent: i === gameState.currentStint, isNext: i === gameState.currentStint + 1, isDone: i < gameState.currentStint, 
          note: isLast ? "FINISH" : "BOX" 
      });
      lapCounter += lapsThisStint;
    }
    return { stints, lapsPerTank };
  }, [gameState]);

  const activeDriver = getSafeDriver(gameState.drivers.find(d => d.id === gameState.activeDriverId));

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#020408] text-slate-200 font-sans">
      
      {/* HEADER */}
      <div className="h-16 glass-panel flex items-center justify-between px-6 sticky top-0 z-50 shrink-0 w-full">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"><Home size={20}/></button>
          <div className={`p-2 rounded transform skew-x-[-10deg] ${teamColor}`}><Flag className="text-white transform skew-x-[10deg]" size={20}/></div>
          <div>
            <h1 className="font-bold text-lg lg:text-xl tracking-tighter text-white italic uppercase">{teamName} <span className="text-slate-500">24H</span></h1>
            <div className={`text-[10px] font-bold tracking-widest flex items-center gap-1 ${status.includes('LIVE') ? 'text-emerald-500' : 'text-red-500'}`}><Wifi size={10}/> {status}</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 bg-black/40 px-6 py-1.5 rounded-lg border border-white/5">
           <div className="text-right"><div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">RACE TIME</div><div className={`font-mono text-2xl lg:text-3xl font-bold leading-none ${localRaceTime < 3600 ? 'text-red-500' : 'text-white'}`}>{formatTime(localRaceTime)}</div></div>
           <button onClick={toggleRaceTimer} className={`p-2 rounded-full border transition-all ${gameState.isRaceRunning ? 'border-amber-500 text-amber-500 bg-amber-900/10' : 'border-emerald-500 text-emerald-500 bg-emerald-900/10'}`}>{gameState.isRaceRunning ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor" className="ml-0.5"/>}</button>
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
             <div className="absolute top-0 right-0 w-[60%] h-full opacity-20 transform skew-x-12" style={{ background: `linear-gradient(to left, ${activeDriver.color}, transparent)` }}></div>
             <div className="flex justify-between items-start mb-6 relative">
                <div>
                   <div className="flex items-center gap-2 mb-1"><span className="text-[9px] font-bold text-slate-400 tracking-widest flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> DRIVER (STINT {(gameState.currentStint || 0) + 1})</span></div>
                   <h2 className="text-3xl lg:text-4xl font-black text-white italic uppercase tracking-tighter truncate max-w-[250px]">{activeDriver.name}</h2>
                   {activeDriver.phone && <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-1"><Phone size={10} /> {activeDriver.phone}</div>}
                   <div className="flex items-center gap-2 mt-3 text-indigo-300 font-mono text-xs lg:text-sm bg-indigo-500/10 px-2 py-1 rounded w-fit border border-indigo-500/20"><Clock size={14} /> Stint: {formatTime(localStintTime)}</div>
                </div>
                <div className="flex flex-col items-end gap-2"><div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center border border-white/10 shadow-lg" style={{ backgroundColor: activeDriver.color }}><Users size={20} className="text-white" /></div></div>
             </div>
             <div className="mb-4">
                <button onClick={confirmPitStop} className="w-full h-16 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-black text-xl uppercase shadow-lg shadow-indigo-900/50 border border-indigo-400/50 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"><CheckCircle2 size={28} /> Pit Stop Done</button>
                <div className="flex justify-between mt-2 px-1"><button onClick={undoStint} className="text-[10px] text-slate-500 hover:text-red-400 underline">Mistake? Undo Stop</button></div>
             </div>
             <div className="bg-black/30 rounded p-1 flex gap-1 mb-4">{['DRY', 'DAMP', 'WET'].map(w => <button key={w} onClick={() => syncUpdate({weather: w})} className={`flex-1 flex justify-center items-center py-1 rounded text-[10px] ${gameState.weather === w ? 'bg-slate-600 text-white shadow' : 'text-slate-600'}`}>{w === 'DRY' ? <Sun size={14}/> : w === 'DAMP' ? <Cloud size={14}/> : <CloudRain size={14}/>}</button>)}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 shrink-0">
             <div className="glass-panel rounded-xl p-3 flex flex-col justify-between h-24">
                <div className="flex justify-between items-center"><div className="text-slate-500 text-[9px] font-bold uppercase"><Fuel size={12} className="inline mr-1"/> CONS</div></div>
                <div className="flex items-center justify-between mt-1">
                    <div className="text-2xl lg:text-3xl font-mono font-bold text-white tracking-tighter">{gameState.fuelCons}</div>
                    <div className="flex flex-col gap-1"><button onClick={()=>updateFuel(0.05)} className="w-6 h-4 flex items-center justify-center bg-slate-800 rounded hover:bg-indigo-600"><Plus size={8}/></button><button onClick={()=>updateFuel(-0.05)} className="w-6 h-4 flex items-center justify-center bg-slate-800 rounded hover:bg-indigo-600"><Minus size={8}/></button></div>
                </div>
                <div className="text-[9px] text-slate-500">L / Lap</div>
             </div>
             <div className="glass-panel rounded-xl p-3 flex flex-col justify-between h-24">
                <div className="text-slate-500 text-[9px] font-bold uppercase"><RotateCcw size={12} className="inline mr-1"/> STINT MAX</div>
                <div className="text-2xl lg:text-3xl font-mono font-bold text-emerald-400 tracking-tighter">{strategyData.lapsPerTank}</div>
                <div className="text-[9px] text-slate-500">Laps autonomy</div>
             </div>
          </div>

          <div className="glass-panel rounded-xl flex-1 flex flex-col overflow-hidden min-h-[150px]">
             <div className="p-2 border-b border-white/5 bg-black/20 text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 flex justify-between items-center shrink-0"><span>RACE LOG</span><span className="text-[9px] opacity-50">{gameState.incidents.length} EVENTS</span></div>
             <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {gameState.incidents.length === 0 && <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-2"><AlertTriangle size={24} className="opacity-20"/><span className="text-xs">No incidents recorded</span></div>}
                {gameState.incidents.map((inc) => (
                   <div key={inc.id} className="bg-slate-900/50 p-2 rounded border-l-2 border-red-500/50 flex flex-col gap-1 group">
                      <div className="flex justify-between items-start">
                         <div className="flex gap-2 items-center"><span className="text-[9px] font-mono text-slate-500">{inc.time}</span><span className="text-[10px] text-red-300 font-bold uppercase">{inc.lap}</span></div>
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
                      <tr><th className="p-3 w-10 text-center">#</th><th className="p-3">Driver Selection</th><th className="p-3">Window</th><th className="p-3 text-right">Refuel</th><th className="p-3 text-center">Status</th><th className="p-3">Notes</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {strategyData.stints.map((stint) => (
                         <tr key={stint.id} className={`group hover:bg-white/[0.02] ${stint.isCurrent ? 'row-current' : ''} ${stint.isNext ? 'row-next' : ''} ${stint.isDone ? 'row-done' : ''}`}>
                            <td className="p-3 text-center font-mono font-bold text-xs text-slate-600">{stint.stopNum}</td>
                            <td className="p-3">
                                <select value={stint.driverId || ""} onChange={(e) => assignDriverToStint(stint.id, e.target.value)} className="bg-transparent border border-slate-700 rounded px-2 py-1 text-xs font-bold text-white focus:border-indigo-500 focus:bg-slate-900 outline-none w-full max-w-[150px]">
                                    {gameState.drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-300 flex items-center gap-1">{stint.startLap} <ChevronRight size={10} className="text-slate-600"/> {stint.endLap}</td>
                            <td className="p-3 text-right font-mono text-xs text-slate-300 font-bold">{stint.fuel}</td>
                            <td className="p-3 text-center">
                                {stint.isCurrent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">CURRENT</span>}
                                {stint.isNext && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1">NEXT STOP</span>}
                                {!stint.isCurrent && !stint.isNext && <span className="text-[9px] text-slate-600 border border-slate-800 px-1 rounded">{stint.note}</span>}
                            </td>
                            <td className="p-3"><input type="text" value={gameState.stintNotes[stint.stopNum] || ""} onChange={(e) => syncUpdate({ stintNotes: { ...gameState.stintNotes, [stint.stopNum]: e.target.value }})} className="bg-transparent border-b border-transparent focus:border-indigo-500 w-full text-xs text-slate-300 outline-none font-mono placeholder-slate-800" placeholder="..."/></td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           ) : (
             <div className="flex-1 bg-[#e5e5e5] flex items-center justify-center p-8 overflow-hidden relative">
                 <img src={trackMapImg} alt="Track Map" className="max-w-full max-h-full object-contain map-invert drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                 <div className="absolute bottom-4 right-4 text-black font-bold text-xs opacity-50">LE MANS 13.626 KM</div>
             </div>
           )}
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="glass-panel w-full max-w-lg rounded-xl p-6 border border-slate-700 space-y-4">
              <div className="flex justify-between items-center"><h2 className="text-lg font-bold text-white">SETTINGS</h2><button onClick={()=>setShowSettings(false)}><X className="text-slate-400"/></button></div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] text-slate-500 font-bold">TANK (L)</label><input type="number" value={gameState.tankCapacity} onChange={(e)=>syncUpdate({tankCapacity: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                 <div><label className="text-[10px] text-slate-500 font-bold">TARGET LAPS</label><input type="number" value={gameState.lapsTarget} onChange={(e)=>syncUpdate({lapsTarget: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                 <div><label className="text-[10px] text-slate-500 font-bold">MANUAL CONS (L)</label><input type="number" step="0.01" value={gameState.fuelCons} onChange={(e)=>syncUpdate({fuelCons: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
              </div>
              <div className="space-y-2 pt-2">
                 <div className="flex justify-between items-center"><label className="text-[10px] text-slate-500 font-bold">DRIVERS MANAGEMENT</label><button onClick={addDriver} className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded font-bold flex items-center gap-1"><Plus size={10}/> ADD</button></div>
                 <div className="max-h-60 overflow-y-auto space-y-2">
                    {gameState.drivers && gameState.drivers.map((d) => (
                        <div key={d.id} className="flex gap-2 items-center">
                           <input type="color" value={d.color || "#3b82f6"} onChange={(e) => updateDriverInfo(d.id, 'color', e.target.value)} className="w-8 h-8 bg-transparent border-none cursor-pointer rounded"/>
                           <input type="text" value={d.name} onChange={(e) => updateDriverInfo(d.id, 'name', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder="Name"/>
                           <input type="text" value={d.phone || ""} onChange={(e) => updateDriverInfo(d.id, 'phone', e.target.value)} className="w-28 bg-slate-900 border border-slate-700 rounded p-2 text-slate-300 font-mono text-sm" placeholder="Tel"/>
                           <button onClick={() => removeDriver(d.id)} className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                 </div>
                 <button onClick={resetRaceTimer} className="w-full py-2 border border-red-900 text-red-500 hover:bg-red-900/20 rounded text-xs uppercase font-bold mt-4 flex items-center justify-center gap-2"><RotateCcw size={14}/> RESET RACE</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT : SÉLECTION DE L'ÉQUIPE ---
const RaceStrategyApp = () => {
  const [selectedTeam, setSelectedTeam] = useState(null); 

  if (!selectedTeam) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[#020408] gap-8 font-sans relative overflow-hidden">
        <style>{globalCss}</style>
        
        {/* BACKGROUND ACCUEIL */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-red-900/20 opacity-30 animate-pulse z-0"></div>

        <h1 className="text-4xl font-black text-white italic z-10">LE MANS <span className="text-indigo-500">24H</span> STRATEGY</h1>
        
        <div className="flex gap-6 z-10">
          {/* BOUTON HYPERCAR AVEC IMAGE */}
          <button onClick={() => setSelectedTeam('hypercar')} className="w-72 h-48 rounded-3xl relative overflow-hidden group shadow-2xl hover:scale-105 transition-all duration-300 border border-red-500/30">
             {/* IMAGE FOND HYPERCAR */}
             <img src={hypercarCarImg} alt="Hypercar" className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
             {/* OVERLAY ROUGE */}
             <div className="absolute inset-0 bg-gradient-to-t from-red-950/95 via-red-900/60 to-black/30 mix-blend-multiply transition-opacity group-hover:opacity-90"></div>
             {/* CONTENU */}
             <div className="relative z-10 flex flex-col items-center justify-center h-full text-white p-4">
                 <Trophy size={56} className="mb-2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"/>
                 <span className="font-black text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tight">HYPERCAR</span>
                 <span className="text-sm text-red-100 mt-2 font-bold bg-red-700/80 px-3 py-0.5 rounded-full drop-shadow">WEC TOP CLASS</span>
             </div>
          </button>

          {/* BOUTON LMP2 AVEC IMAGE */}
          <button onClick={() => setSelectedTeam('lmp2')} className="w-72 h-48 rounded-3xl relative overflow-hidden group shadow-2xl hover:scale-105 transition-all duration-300 border border-blue-500/30">
             {/* IMAGE FOND LMP2 */}
             <img src={lmp2CarImg} alt="LMP2" className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
             {/* OVERLAY BLEU */}
             <div className="absolute inset-0 bg-gradient-to-t from-blue-950/95 via-blue-900/60 to-black/30 mix-blend-multiply transition-opacity group-hover:opacity-90"></div>
             {/* CONTENU */}
             <div className="relative z-10 flex flex-col items-center justify-center h-full text-white p-4">
                 <Users size={56} className="mb-2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"/>
                 <span className="font-black text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tight">LMP2</span>
                 <span className="text-sm text-blue-100 mt-2 font-bold bg-blue-600/80 px-3 py-0.5 rounded-full drop-shadow">ORECA 07</span>
             </div>
          </button>
        </div>
        <div className="text-slate-500 text-sm mt-8 font-bold tracking-widest uppercase z-10">Select your team to access the Pit Wall</div>
      </div>
    );
  }

  return (
    <>
      <style>{globalCss}</style> 
      <TeamDashboard 
        teamId={selectedTeam} 
        teamName={selectedTeam === 'hypercar' ? 'HYPERCAR' : 'LMP2'}
        teamColor={selectedTeam === 'hypercar' ? 'bg-red-600' : 'bg-blue-600'}
        onBack={() => setSelectedTeam(null)} 
      />
    </>
  );
};

export default RaceStrategyApp;
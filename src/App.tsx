import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, Fuel, RotateCcw, Users, Flag, 
  Timer, Phone, FileText, X, Save, AlertOctagon, 
  Settings, ChevronRight, Play, Pause, CloudRain, Sun, Cloud, Wifi, WifiOff
} from 'lucide-react';

// --- IMPORT FIREBASE ---
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, getDoc } from "firebase/firestore";

// 👇 --- COLLE TA CONFIGURATION FIREBASE ICI --- 👇
const firebaseConfig = {
  apiKey: "AIzaSyAezT5Np6-v18OBR1ICV3uHoFViQB555sg",
  authDomain: "le-mans-strat.firebaseapp.com",
  projectId: "le-mans-strat",
  storageBucket: "le-mans-strat.firebasestorage.app",
  messagingSenderId: "1063156323054",
  appId: "1:1063156323054:web:81e74528a75ffb770099ff"
};
// 👆 ------------------------------------------ 👆

// Initialisation Firebase
let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error("Erreur init Firebase. Vérifie ta config.", error);
}

// ID de la session (Pour que tout le monde se connecte au même endroit)
const SESSION_ID = "lemans-2025-race";

const RaceStrategyApp = () => {
  // --- STATE ---
  const [status, setStatus] = useState("CONNECTING...");
  
  // Données synchronisées
  const [gameState, setGameState] = useState({
    currentLap: 0,
    raceTime: 24 * 60 * 60,
    isRaceRunning: false,
    weather: "DRY",
    currentTyre: "SOFT",
    fuelCons: 3.65,
    tankCapacity: 105,
    lapsTarget: 380,
    stintsPerDriver: 2,
    isEmergency: false,
    drivers: [
      { id: 1, name: "Antoine", phone: "Radio Check", color: "from-blue-600 to-blue-700", border: "border-blue-500", text: "text-blue-400", bg: "bg-blue-500/20" },
      { id: 2, name: "Enzo", phone: "Radio Check", color: "from-emerald-600 to-emerald-700", border: "border-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/20" },
      { id: 3, name: "Ewan", phone: "Radio Check", color: "from-purple-600 to-purple-700", border: "border-purple-500", text: "text-purple-400", bg: "bg-purple-500/20" }
    ],
    incidents: [],
    stintNotes: {}
  });

  const [showSettings, setShowSettings] = useState(false);

  // --- SYNC ENGINE (Le coeur du système) ---
  useEffect(() => {
    if (!db) {
        setStatus("OFFLINE (Config Error)");
        return;
    }

    const docRef = doc(db, "strategies", SESSION_ID);

    // 1. Écouter les changements en temps réel
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setGameState(docSnap.data());
        setStatus("LIVE SYNC");
      } else {
        // Créer la DB si elle n'existe pas (Premier lancement)
        setStatus("CREATING SESSION...");
        setDoc(docRef, gameState).then(() => setStatus("LIVE SYNC"));
      }
    }, (error) => {
      console.error(error);
      setStatus("ERROR SYNC");
    });

    return () => unsubscribe();
  }, []);

  // Gestion du Chrono serveur
  useEffect(() => {
    let interval = null;
    // Si le serveur dit que ça tourne, on décrémente localement pour fluidité
    // (Idéalement on stockerait le timestamp de départ, mais pour une soirée entre amis ça suffit)
    if (gameState.isRaceRunning && gameState.raceTime > 0) {
      interval = setInterval(() => {
        // On ne met pas à jour la DB chaque seconde pour ne pas exploser les quotas, 
        // on fait confiance au compteur local et on sync les pauses.
        setGameState(prev => ({...prev, raceTime: prev.raceTime - 1}));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.isRaceRunning]);


  // --- FONCTIONS DE MISE A JOUR (Envoient vers Firebase) ---
  const syncUpdate = async (fieldsToUpdate) => {
    if (!db) return;
    try {
        // Optimistic UI update (immédiat)
        setGameState(prev => ({ ...prev, ...fieldsToUpdate }));
        // Server update
        const docRef = doc(db, "strategies", SESSION_ID);
        await updateDoc(docRef, fieldsToUpdate);
    } catch (e) {
        console.error("Erreur save:", e);
    }
  };

  const handleDriverUpdate = (id, field, value) => {
    const newDrivers = gameState.drivers.map(d => d.id === id ? { ...d, [field]: value } : d);
    syncUpdate({ drivers: newDrivers });
  };

  const addIncident = () => {
    const newIncident = {
      id: Date.now(),
      lap: gameState.currentLap,
      time: formatRaceTime(gameState.raceTime),
      type: "INCIDENT"
    };
    syncUpdate({ incidents: [newIncident, ...gameState.incidents] });
  };

  const handleStintNoteChange = (stopNum, text) => {
    const newNotes = { ...gameState.stintNotes, [stopNum]: text };
    syncUpdate({ stintNotes: newNotes });
  };

  // --- CALCULS STRATÉGIE (Identique v2) ---
  const strategyData = useMemo(() => {
    const safeCons = gameState.fuelCons > 0 ? gameState.fuelCons : 3.5;
    const safeTank = gameState.tankCapacity > 0 ? gameState.tankCapacity : 100;
    const lapsPerTank = Math.floor(safeTank / safeCons) || 1;
    const totalStops = Math.max(0, Math.ceil(gameState.lapsTarget / lapsPerTank) - 1);
    
    const stints = [];
    let lapCounter = 0;
    let driverIndex = 0;
    let stintCountForDriver = 0;

    for (let i = 0; i <= totalStops; i++) {
      const isLastStint = i === totalStops;
      const lapsThisStint = isLastStint ? (gameState.lapsTarget - lapCounter) : lapsPerTank;
      const stintEndLap = lapCounter + lapsThisStint;
      const currentDriver = gameState.drivers[driverIndex % gameState.drivers.length];
      const isActive = gameState.currentLap >= lapCounter && gameState.currentLap < stintEndLap;
      
      let actionType = "FUEL ONLY";
      if (stintCountForDriver + 1 >= gameState.stintsPerDriver) actionType = "DRIVER SWAP";
      if (isLastStint) actionType = "FINISH";

      stints.push({
        id: i,
        stopNum: i + 1,
        startLap: lapCounter,
        endLap: stintEndLap,
        laps: lapsThisStint,
        fuelNeeded: (lapsThisStint * safeCons).toFixed(1),
        driver: currentDriver,
        notes: actionType,
        customNote: gameState.stintNotes[i+1] || "",
        isActive
      });

      lapCounter += lapsThisStint;
      stintCountForDriver++;
      if (stintCountForDriver >= gameState.stintsPerDriver) {
        driverIndex++;
        stintCountForDriver = 0;
      }
    }
    return { stints, lapsPerTank, totalStops };
  }, [gameState]);

  const activeStint = strategyData.stints.find(s => s.isActive) || strategyData.stints[0];
  const progressPercent = activeStint ? Math.min(100, Math.max(0, ((gameState.currentLap - activeStint.startLap) / activeStint.laps) * 100)) : 0;

  const formatRaceTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- STYLE CSS SCROLLBAR ---
  const css = `
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
    .glass-panel { background: rgba(13, 18, 30, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); }
  `;

  return (
    <div className="h-screen bg-[#050a14] font-sans text-slate-200 overflow-hidden flex flex-col selection:bg-indigo-500/30">
      <style>{css}</style>
      
      {/* HEADER */}
      <div className="relative z-50 glass-panel h-16 flex items-center justify-between px-6 shadow-xl shrink-0 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-2 rounded transform -skew-x-12 shadow-lg">
            <Flag className="text-white transform skew-x-12" size={20} fill="currentColor" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tighter text-white leading-none italic">LE MANS <span className="text-indigo-500">24H</span></h1>
            <div className={`text-[10px] font-bold tracking-widest uppercase mt-0.5 flex items-center gap-1.5 ${status === 'LIVE SYNC' ? 'text-emerald-500' : 'text-slate-500'}`}>
               {status === 'LIVE SYNC' ? <Wifi size={10} /> : <WifiOff size={10}/>} {status}
            </div>
          </div>
        </div>

        {/* TIMER */}
        <div className="hidden lg:flex items-center gap-6 bg-black/40 px-6 py-2 rounded border border-white/10">
           <div className="flex flex-col items-center">
              <div className={`font-mono text-3xl font-bold leading-none tracking-tight ${gameState.raceTime < 3600 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {formatRaceTime(gameState.raceTime)}
              </div>
           </div>
           <button 
              onClick={() => syncUpdate({ isRaceRunning: !gameState.isRaceRunning })}
              className={`p-2 rounded-full border transition-all ${gameState.isRaceRunning ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-emerald-500/20 border-emerald-500 text-emerald-500'}`}
           >
              {gameState.isRaceRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
           </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-all">
            <Settings size={20} />
          </button>
          <button onClick={addIncident} className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/50 px-4 py-2 rounded font-bold uppercase text-xs tracking-wider">
            <AlertOctagon size={16} /> <span className="hidden sm:inline">Report</span>
          </button>
        </div>
      </div>

      {/* GRID */}
      <div className="relative z-10 flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden h-[calc(100vh-64px)]">
        
        {/* LEFT PANEL */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
          {/* DRIVER WIDGET */}
          <div className="glass-panel rounded-xl p-6 relative overflow-hidden group shrink-0 shadow-2xl">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                      {gameState.isEmergency ? <span className="animate-pulse text-red-500">⚠ SAFETY CAR</span> : <span className="text-emerald-500">● TRACK GREEN</span>}
                   </span>
                   <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">{activeStint.driver.name}</h2>
                </div>
                <div className={`w-12 h-12 rounded bg-gradient-to-br ${activeStint.driver.color} flex items-center justify-center border border-white/10`}>
                    <Users size={24} className="text-white" />
                </div>
             </div>
             
             <div className="mb-4">
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1 uppercase font-bold">
                   <span>Lap {gameState.currentLap}</span>
                   <span className="text-white">Box: Lap {activeStint.endLap}</span>
                </div>
                <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden border border-white/10">
                   <div className={`h-full bg-gradient-to-r ${activeStint.driver.color}`} style={{ width: `${progressPercent}%` }}></div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-2">
                <button onClick={() => syncUpdate({currentLap: Math.max(0, gameState.currentLap - 1)})} className="h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-sm font-bold border border-slate-700">- 1 LAP</button>
                <button onClick={() => syncUpdate({currentLap: gameState.currentLap + 1})} className="h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-bold shadow-lg border border-indigo-400/50 uppercase">+ 1 LAP</button>
             </div>

             <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2">
                 <div className="flex bg-slate-900 rounded border border-slate-700 p-0.5">
                    {['DRY', 'DAMP', 'WET'].map(w => (
                        <button key={w} onClick={() => syncUpdate({weather: w})} className={`flex-1 flex justify-center py-1 rounded text-[10px] ${gameState.weather === w ? 'bg-slate-600 text-white' : 'text-slate-500'}`}>{w === 'DRY' ? <Sun size={12}/> : w === 'DAMP' ? <Cloud size={12}/> : <CloudRain size={12}/>}</button>
                    ))}
                 </div>
                 <div className="flex gap-1">
                     {['S', 'M', 'H'].map(t => (
                         <button key={t} onClick={() => syncUpdate({currentTyre: t === 'S' ? 'SOFT' : t === 'M' ? 'MED' : 'HARD'})} className={`flex-1 rounded text-[10px] font-bold border ${gameState.currentTyre.startsWith(t === 'S' ? 'SOFT' : t === 'M' ? 'MED' : 'HARD') ? 'bg-white text-black border-white' : 'border-slate-700 text-slate-500'}`}>{t}</button>
                     ))}
                 </div>
             </div>
          </div>

          {/* TELEMETRY */}
          <div className="grid grid-cols-2 gap-4 shrink-0">
             <div className="glass-panel rounded-xl p-3">
                <div className="text-slate-500 text-[9px] font-bold uppercase mb-2"><Fuel size={12} className="inline mr-1"/> CONS (L/Lap)</div>
                <div className="flex items-end justify-between">
                   <span className="text-2xl font-mono font-bold text-white">{gameState.fuelCons}</span>
                   <input type="range" min="3.0" max="5.0" step="0.05" value={gameState.fuelCons} onChange={(e) => syncUpdate({fuelCons: Number(e.target.value)})} className="w-16 h-1 bg-slate-700 rounded-full appearance-none accent-indigo-500"/>
                </div>
             </div>
             <div className="glass-panel rounded-xl p-3">
                <div className="text-slate-500 text-[9px] font-bold uppercase mb-2"><RotateCcw size={12} className="inline mr-1"/> STINT LAPS</div>
                <div className="flex items-end justify-between">
                   <span className={`text-2xl font-mono font-bold ${strategyData.lapsPerTank < 8 ? 'text-red-400' : 'text-emerald-400'}`}>{strategyData.lapsPerTank}</span>
                   <span className="text-[9px] text-slate-500">Max</span>
                </div>
             </div>
          </div>

          {/* INCIDENTS */}
          <div className="glass-panel rounded-xl flex flex-col flex-1 overflow-hidden min-h-[100px]">
             <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {gameState.incidents.map((inc) => (
                   <div key={inc.id} className="bg-slate-900/80 p-2 rounded border-l-2 border-red-500 flex gap-2">
                      <div className="text-[10px] font-mono text-slate-500 pt-0.5">{inc.time}</div>
                      <div>
                         <div className="text-[10px] font-bold text-white uppercase">Incident - Lap {inc.lap}</div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT PANEL: STRATEGY */}
        <div className="lg:col-span-8 glass-panel rounded-xl flex flex-col overflow-hidden shadow-2xl border-t-4 border-t-indigo-500">
           <div className="p-3 border-b border-white/5 bg-slate-900/50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2"><FileText size={16} className="text-indigo-500"/> Strategy Plan</h3>
              <button onClick={() => syncUpdate({isEmergency: !gameState.isEmergency})} className={`px-2 py-1 rounded text-[10px] font-bold border ${gameState.isEmergency ? 'bg-red-600 text-white border-red-600 animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                {gameState.isEmergency ? '⚠ FCY / SC' : 'GREEN FLAG'}
              </button>
           </div>
           
           <div className="flex-1 overflow-auto custom-scrollbar bg-[#0b101b]">
              <table className="w-full text-left text-sm border-collapse">
                 <thead className="sticky top-0 bg-[#0b101b] z-10 text-[9px] font-bold text-slate-500 uppercase tracking-widest shadow-lg border-b border-white/5">
                    <tr>
                       <th className="p-3 text-center w-10">#</th>
                       <th className="p-3">Driver</th>
                       <th className="p-3">Window</th>
                       <th className="p-3 text-right">Fuel</th>
                       <th className="p-3 text-center">Plan</th>
                       <th className="p-3">Notes</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {strategyData.stints.map((stint) => (
                       <tr key={stint.id} className={`group hover:bg-white/[0.02] ${stint.isActive ? 'bg-indigo-500/10' : ''}`}>
                          <td className="p-3 text-center font-mono font-bold text-xs text-slate-600">{stint.stopNum}</td>
                          <td className="p-3 flex items-center gap-2">
                                <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[9px] ${stint.driver.bg} ${stint.driver.text} border ${stint.driver.border}`}>{stint.driver.name.charAt(0)}</div>
                                <span className={`font-bold text-xs uppercase ${stint.isActive ? 'text-white' : 'text-slate-400'}`}>{stint.driver.name}</span>
                          </td>
                          <td className="p-3 font-mono text-xs text-slate-300">{stint.startLap} <span className="text-slate-600">→</span> {stint.endLap}</td>
                          <td className="p-3 text-right font-mono text-xs text-slate-300">{stint.fuelNeeded}</td>
                          <td className="p-3 text-center"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-400">{stint.notes}</span></td>
                          <td className="p-3">
                             <input type="text" value={stint.customNote} onChange={(e) => handleStintNoteChange(stint.stopNum, e.target.value)} className="bg-transparent border-b border-transparent focus:border-indigo-500 w-full text-xs text-slate-300 placeholder-slate-800 outline-none font-mono" placeholder="--"/>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* MODAL SETTINGS */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-[#0f172a] rounded-xl w-full max-w-lg border border-slate-700 shadow-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white uppercase">Setup Team</h2>
              {gameState.drivers.map((driver) => (
                 <div key={driver.id} className="flex gap-2 items-center">
                    <div className={`w-6 h-6 rounded ${driver.bg} flex items-center justify-center text-xs text-white`}>{driver.id}</div>
                    <input type="text" value={driver.name} onChange={(e) => handleDriverUpdate(driver.id, 'name', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-sm flex-1"/>
                 </div>
              ))}
              <div className="flex justify-end pt-2"><button onClick={() => setShowSettings(false)} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold">CLOSE</button></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default RaceStrategyApp;
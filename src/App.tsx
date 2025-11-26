import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, Fuel, RotateCcw, Activity, Users, Flag, 
  Share2, Clock, Zap, BarChart3, Timer, Phone, 
  FileText, Plus, X, Save, AlertOctagon, Settings
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";

// --- CONFIG INITIALE ---
// Garde ta logique Firebase ici (simplifiée pour l'affichage)
let app, auth, db, isFirebaseAvailable = false;
try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseAvailable = true;
  }
} catch (e) { console.warn("Mode Local"); }

const SESSION_ID = "team-lemans-2025-v4-pro";
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default';

const RaceStrategyApp = () => {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState("Init..."); 
  
  // Paramètres Course
  const [tankCapacity, setTankCapacity] = useState(75);
  const [fuelCons, setFuelCons] = useState(6.25);
  const [stintsPerDriver, setStintsPerDriver] = useState(2);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [currentLap, setCurrentLap] = useState(0); 
  const [lapTarget] = useState(372); 
  
  // NOUVEAU : Incidents & Notes & Settings
  const [showSettings, setShowSettings] = useState(false);
  const [incidents, setIncidents] = useState([]); // [{id, lap, time, note}]
  const [stintNotes, setStintNotes] = useState({}); // { 1: "Change Tires", 2: "Push" }
  
  // NOUVEAU : Drivers éditables avec Téléphone
  const [drivers, setDrivers] = useState([
    { id: 1, name: "Antoine", phone: "06 00 00 00 00", color: "from-blue-600 to-blue-700", border: "border-blue-500", text: "text-blue-400" },
    { id: 2, name: "Enzo", phone: "06 00 00 00 00", color: "from-emerald-600 to-emerald-700", border: "border-emerald-500", text: "text-emerald-400" },
    { id: 3, name: "Ewan", phone: "06 00 00 00 00", color: "from-purple-600 to-purple-700", border: "border-purple-500", text: "text-purple-400" }
  ]);

  // --- SYNC FIREBASE (Partielle pour l'exemple) ---
  useEffect(() => {
    // ... (Garde ta logique d'auth ici)
    if(isFirebaseAvailable) setSyncStatus("LIVE"); 
    else setSyncStatus("Local Mode");
  }, []);

  // --- LOGIQUE METIER ---
  const handleDriverUpdate = (id, field, value) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const addIncident = () => {
    const newIncident = {
      id: Date.now(),
      lap: currentLap,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      type: "INCIDENT"
    };
    setIncidents([newIncident, ...incidents]);
  };

  const handleStintNoteChange = (stopNum, text) => {
    setStintNotes(prev => ({...prev, [stopNum]: text}));
  };

  const strategyData = useMemo(() => {
    const safeCons = fuelCons > 0 ? fuelCons : 6.25;
    const safeTank = tankCapacity > 0 ? tankCapacity : 75;
    const lapsPerTank = Math.floor(safeTank / safeCons) || 1;
    const totalStops = Math.max(0, Math.ceil(lapTarget / lapsPerTank) - 1);
    
    const stints = [];
    let lapCounter = 0;
    let driverIndex = 0;
    let stintCountForDriver = 0;

    for (let i = 0; i <= totalStops; i++) {
      const isLastStint = i === totalStops;
      const lapsThisStint = isLastStint ? (lapTarget - lapCounter) : lapsPerTank;
      const stintEndLap = lapCounter + lapsThisStint;
      const currentDriver = drivers[driverIndex % drivers.length];
      const isActive = currentLap >= lapCounter && currentLap < stintEndLap;
      
      stints.push({
        id: i,
        stopNum: i + 1,
        startLap: lapCounter,
        endLap: stintEndLap,
        laps: lapsThisStint,
        fuelNeeded: (lapsThisStint * safeCons).toFixed(2),
        driver: currentDriver,
        notes: isLastStint ? "FINISH" : (stintCountForDriver + 1 === stintsPerDriver ? "DRIVER SWAP" : "FUEL ONLY"),
        customNote: stintNotes[i+1] || "", // Récupère la note perso
        isActive
      });

      lapCounter += lapsThisStint;
      stintCountForDriver++;
      if (stintCountForDriver >= stintsPerDriver) {
        driverIndex++;
        stintCountForDriver = 0;
      }
    }
    return { stints, lapsPerTank, totalStops };
  }, [fuelCons, tankCapacity, lapTarget, drivers, stintsPerDriver, currentLap, stintNotes]);

  const activeStint = strategyData.stints.find(s => s.isActive) || strategyData.stints[0];
  const progressPercent = activeStint ? Math.min(100, Math.max(0, ((currentLap - activeStint.startLap) / activeStint.laps) * 100)) : 0;

  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${m.toString().padStart(2, '0')}`;
  };

  // --- UI COMPONENTS ---
  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-slate-200 selection:bg-indigo-500 selection:text-white overflow-hidden flex flex-col">
      
      {/* ARRIÈRE PLAN DYNAMIQUE */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[20%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[150px]"></div>
        {isEmergencyMode && <div className="absolute inset-0 bg-red-900/10 animate-pulse z-0"></div>}
      </div>

      {/* HEADER TOP BAR */}
      <div className="relative z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <Flag className="text-white fill-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white leading-none">STRATEGY <span className="text-indigo-500">PRO</span></h1>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
               <span className={`w-1.5 h-1.5 rounded-full ${syncStatus.includes('LIVE') ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-600'}`}></span>
               {syncStatus}
            </div>
          </div>
        </div>

        {/* HUD CENTRAL */}
        <div className="hidden md:flex items-center gap-8 bg-black/20 px-6 py-2 rounded-full border border-white/5">
           <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase">RACE TIME</span>
              <span className="font-mono text-xl font-bold text-white leading-none">{formatTime(currentLap * 3.7)}</span>
           </div>
           <div className="w-px h-8 bg-slate-800"></div>
           <div className="flex flex-col items-center cursor-pointer hover:text-white transition-colors" onClick={() => setShowSettings(true)}>
              <span className="text-[10px] text-slate-500 font-bold uppercase">DRIVERS</span>
              <div className="flex -space-x-2 mt-1">
                 {drivers.map(d => (
                   <div key={d.id} className={`w-6 h-6 rounded-full border-2 border-slate-900 bg-gradient-to-br ${d.color}`}></div>
                 ))}
              </div>
           </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
             onClick={() => setShowSettings(!showSettings)}
             className="p-2.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all border border-transparent hover:border-slate-700"
          >
            <Settings size={20} />
          </button>
          <button 
             onClick={addIncident}
             className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 rounded-lg font-bold transition-all active:scale-95 group"
          >
            <AlertOctagon size={18} className="group-hover:animate-ping" />
            <span className="hidden sm:inline">REPORT INCIDENT</span>
            <span className="ml-1 bg-red-600 text-white text-xs px-1.5 rounded">{incidents.length}</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="relative z-10 flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* LEFT PANEL: ACTIVE CONTEXT (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2">
          
          {/* DRIVER CARD */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${activeStint.driver.color}`}></div>
            <div className="flex justify-between items-start mb-4">
               <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">DRIVER ON TRACK</span>
                  <h2 className="text-4xl font-black text-white mt-1">{activeStint.driver.name}</h2>
                  <div className="flex items-center gap-2 mt-2 text-indigo-300 bg-indigo-500/10 w-fit px-2 py-1 rounded text-xs font-mono">
                    <Phone size={12} /> {activeStint.driver.phone}
                  </div>
               </div>
               <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${activeStint.driver.color} flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform duration-500`}>
                  <Users size={28} className="text-white" />
               </div>
            </div>
            
            {/* PROGRESS */}
            <div className="mb-6">
               <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
                 <span>LAP {currentLap}</span>
                 <span className="text-white font-bold">BOX IN {activeStint.endLap - currentLap} LAPS</span>
               </div>
               <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                  <div className={`h-full bg-gradient-to-r ${activeStint.driver.color} transition-all duration-700`} style={{ width: `${progressPercent}%` }}></div>
               </div>
            </div>

            {/* CONTROLS */}
            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => setCurrentLap(Math.max(0, currentLap - 1))} className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold border border-slate-700">- 1 LAP</button>
               <button onClick={() => setCurrentLap(currentLap + 1)} className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/50 border border-indigo-400">+ 1 LAP</button>
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="text-slate-500 text-xs font-bold uppercase mb-1">FUEL CONS</div>
                <div className="flex items-baseline gap-1">
                   <span className="text-2xl font-mono font-bold text-white">{fuelCons}</span>
                   <span className="text-xs text-slate-400">L/Lap</span>
                </div>
                <input type="range" min="5" max="8" step="0.05" value={fuelCons} onChange={(e) => setFuelCons(Number(e.target.value))} className="w-full mt-2 h-1 bg-slate-700 rounded-full appearance-none accent-indigo-500"/>
             </div>
             <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="text-slate-500 text-xs font-bold uppercase mb-1">LAPS / TANK</div>
                <div className={`text-2xl font-mono font-bold ${strategyData.lapsPerTank < 8 ? 'text-red-500' : 'text-emerald-400'}`}>
                   {strategyData.lapsPerTank}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Stops: {strategyData.totalStops}</div>
             </div>
          </div>

          {/* INCIDENT LOG */}
          <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[200px]">
             <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <h3 className="font-bold text-slate-300 text-sm flex items-center gap-2">
                   <AlertTriangle size={14} className="text-amber-500"/> INCIDENT LOG
                </h3>
                <span className="text-xs font-mono text-slate-500">{incidents.length} EVENTS</span>
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {incidents.length === 0 && <div className="text-center text-slate-600 text-xs py-4">No incidents reported yet. Drive safe!</div>}
                {incidents.map((inc) => (
                   <div key={inc.id} className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center gap-3 animate-in slide-in-from-left-2">
                      <div className="bg-red-500/20 text-red-500 p-1.5 rounded">
                         <AlertOctagon size={14} />
                      </div>
                      <div>
                         <div className="text-xs font-bold text-red-300">INCIDENT REPORTED</div>
                         <div className="text-[10px] text-slate-500 font-mono">LAP {inc.lap} • {inc.time}</div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT PANEL: STRATEGY TABLE (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden h-full">
           <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                 <Timer className="text-indigo-500"/> MASTER STRATEGY
              </h3>
              <div className="flex gap-2">
                 <button onClick={() => setIsEmergencyMode(!isEmergencyMode)} className={`px-3 py-1.5 rounded text-xs font-bold border ${isEmergencyMode ? 'bg-red-500 text-white border-red-600' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {isEmergencyMode ? 'EMERGENCY ON' : 'NORMAL OP'}
                 </button>
              </div>
           </div>
           
           <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm border-collapse">
                 <thead className="sticky top-0 bg-slate-950 z-10 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                       <th className="p-4 border-b border-slate-800">Stint</th>
                       <th className="p-4 border-b border-slate-800">Driver</th>
                       <th className="p-4 border-b border-slate-800">Window (Laps)</th>
                       <th className="p-4 border-b border-slate-800 text-right">Fuel</th>
                       <th className="p-4 border-b border-slate-800">Action</th>
                       <th className="p-4 border-b border-slate-800 w-1/4">Notes</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800">
                    {strategyData.stints.map((stint) => (
                       <tr key={stint.id} className={`group hover:bg-slate-800/30 transition-colors ${stint.isActive ? 'bg-indigo-900/10' : ''}`}>
                          <td className="p-4 font-mono font-bold text-slate-400">
                             #{stint.stopNum}
                             {stint.isActive && <span className="ml-2 inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>}
                          </td>
                          <td className="p-4">
                             <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${stint.driver.text.replace('text-', 'bg-')}`}></div>
                                <span className={`font-bold ${stint.driver.text}`}>{stint.driver.name}</span>
                             </div>
                          </td>
                          <td className="p-4 font-mono text-slate-300">
                             {stint.startLap} <span className="text-slate-600">→</span> {stint.endLap}
                          </td>
                          <td className="p-4 font-mono text-right text-slate-300">
                             {stint.fuelNeeded}<span className="text-slate-600 text-xs ml-0.5">L</span>
                          </td>
                          <td className="p-4">
                             <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${
                                stint.notes.includes('SWAP') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                stint.notes.includes('FINISH') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                'bg-slate-800 text-slate-400 border-slate-700'
                             }`}>
                                {stint.notes}
                             </span>
                          </td>
                          <td className="p-4">
                             <div className="relative group/input">
                                <input 
                                  type="text" 
                                  placeholder="Add note..." 
                                  value={stint.customNote}
                                  onChange={(e) => handleStintNoteChange(stint.stopNum, e.target.value)}
                                  className="bg-transparent border-b border-transparent focus:border-indigo-500 w-full text-xs py-1 text-slate-300 placeholder-slate-600 focus:outline-none transition-colors hover:border-slate-700"
                                />
                                <FileText size={12} className="absolute right-0 top-1.5 text-slate-600 opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none" />
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

      </div>

      {/* MODAL SETTINGS (DRIVERS) */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="text-indigo-500" /> TEAM MANAGEMENT
                 </h2>
                 <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                 </button>
              </div>
              <div className="p-6 space-y-6">
                 {drivers.map((driver) => (
                    <div key={driver.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                       <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${driver.color} flex items-center justify-center shrink-0`}>
                          <span className="font-bold text-white text-lg">{driver.name.charAt(0)}</span>
                       </div>
                       <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                          <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Driver Name</label>
                             <input 
                                type="text" 
                                value={driver.name} 
                                onChange={(e) => handleDriverUpdate(driver.id, 'name', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none text-sm font-bold"
                             />
                          </div>
                          <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Phone Number</label>
                             <div className="relative">
                                <Phone size={14} className="absolute left-3 top-2.5 text-slate-500" />
                                <input 
                                   type="text" 
                                   value={driver.phone} 
                                   onChange={(e) => handleDriverUpdate(driver.id, 'phone', e.target.value)}
                                   className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-slate-300 focus:border-indigo-500 focus:outline-none text-sm font-mono"
                                />
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
                 
                 <div className="bg-amber-900/10 border border-amber-500/20 p-4 rounded-xl flex gap-3 items-start">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-amber-200/80">
                       <p className="font-bold text-amber-500 mb-1">Configuration Note</p>
                       Changes made here are applied locally immediately. Ensure all phone numbers are formatted internationally if using SMS integration later.
                    </div>
                 </div>
              </div>
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
                 <button onClick={() => setShowSettings(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2">
                    <Save size={16} /> SAVE CHANGES
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default RaceStrategyApp;
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, Fuel, RotateCcw, Activity, Users, Flag, 
  Share2, Clock, Zap, BarChart3, Timer, Phone, 
  FileText, Plus, X, Save, AlertOctagon, Settings, ChevronRight
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// --- CONFIG INITIALE ---
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

const RaceStrategyApp = () => {
  // --- STATE ---
  const [syncStatus, setSyncStatus] = useState("Init..."); 
  
  // Paramètres Course
  const [tankCapacity, setTankCapacity] = useState(75);
  const [fuelCons, setFuelCons] = useState(6.25);
  const [stintsPerDriver, setStintsPerDriver] = useState(2);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [currentLap, setCurrentLap] = useState(0); 
  const [lapTarget] = useState(372); 
  
  // UI & Data
  const [showSettings, setShowSettings] = useState(false);
  const [incidents, setIncidents] = useState([]); 
  const [stintNotes, setStintNotes] = useState({}); 
  
  const [drivers, setDrivers] = useState([
    { id: 1, name: "Antoine", phone: "06 00 00 00 00", color: "from-blue-600 to-blue-700", border: "border-blue-500", text: "text-blue-400", bg: "bg-blue-500/20" },
    { id: 2, name: "Enzo", phone: "06 00 00 00 00", color: "from-emerald-600 to-emerald-700", border: "border-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/20" },
    { id: 3, name: "Ewan", phone: "06 00 00 00 00", color: "from-purple-600 to-purple-700", border: "border-purple-500", text: "text-purple-400", bg: "bg-purple-500/20" }
  ]);

  // --- SYNC FIREBASE ---
  useEffect(() => {
    if(isFirebaseAvailable) setSyncStatus("LIVE"); 
    else setSyncStatus("LOCAL");
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
        customNote: stintNotes[i+1] || "",
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

  // --- STYLES CSS (Scrollbars) ---
  const css = `
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.8); border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.8); }
    .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
  `;

  // --- UI COMPONENTS ---
  return (
    <div className="h-screen bg-[#0b0f19] font-sans text-slate-200 overflow-hidden flex flex-col selection:bg-indigo-500/30">
      <style>{css}</style>
      
      {/* BACKGROUND FX */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
        {isEmergencyMode && <div className="absolute inset-0 bg-red-900/10 animate-pulse"></div>}
      </div>

      {/* HEADER (Fixe, hauteur 64px) */}
      <div className="relative z-50 glass-panel h-16 flex items-center justify-between px-6 shadow-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <Flag className="text-white" size={20} fill="currentColor" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white leading-none">STRATEGY <span className="text-indigo-400">PRO</span></h1>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
               <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'LIVE' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-600'}`}></span>
               {syncStatus} MODE
            </div>
          </div>
        </div>

        {/* HUD CENTRAL */}
        <div className="hidden lg:flex items-center gap-8 bg-slate-900/50 px-8 py-2 rounded-full border border-white/5 shadow-inner">
           <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">RACE TIME</span>
              <span className="font-mono text-xl font-bold text-white leading-none tracking-tight">{formatTime(currentLap * 3.7)}</span>
           </div>
           <div className="w-px h-6 bg-slate-700"></div>
           <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">LAP</span>
              <span className="font-mono text-xl font-bold text-white leading-none tracking-tight">{currentLap} <span className="text-slate-500 text-sm">/ {lapTarget}</span></span>
           </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all">
            <Settings size={20} />
          </button>
          <button 
             onClick={addIncident}
             className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 rounded-lg font-bold transition-all active:scale-95 group"
          >
            <AlertOctagon size={18} className="group-hover:animate-ping" />
            <span className="hidden sm:inline">INCIDENT</span>
            {incidents.length > 0 && <span className="ml-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{incidents.length}</span>}
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT (Grid System) */}
      <div className="relative z-10 flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden h-[calc(100vh-64px)]">
        
        {/* --- LEFT PANEL: DRIVER & CONTROLS (col-span-4) --- */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
          
          {/* DRIVER WIDGET (Main Focus) */}
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group shrink-0 shadow-2xl">
            <div className={`absolute top-0 right-0 w-[60%] h-full bg-gradient-to-l ${activeStint.driver.color} opacity-10 transform skew-x-12`}></div>
            
            <div className="flex justify-between items-start mb-6">
               <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CURRENTLY DRIVING</span>
                  </div>
                  <h2 className="text-5xl font-black text-white tracking-tighter">{activeStint.driver.name}</h2>
                  <div className="flex items-center gap-2 mt-3 text-indigo-300 bg-slate-900/50 border border-slate-700/50 w-fit px-3 py-1.5 rounded-full text-xs font-mono">
                    <Phone size={12} /> {activeStint.driver.phone}
                  </div>
               </div>
               
               {/* Driver Icon Box */}
               <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${activeStint.driver.color} flex items-center justify-center shadow-lg shadow-indigo-900/20 border border-white/10`}>
                  <Users size={32} className="text-white" />
               </div>
            </div>
            
            {/* FUEL & STINT PROGRESS */}
            <div className="space-y-4">
                <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800">
                    <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
                        <span>STINT PROGRESS</span>
                        <span className="text-white font-bold">BOX: LAP {activeStint.endLap}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700/50 relative">
                        <div className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r ${activeStint.driver.color} transition-all duration-700`} style={{ width: `${progressPercent}%` }}>
                            <div className="absolute right-0 top-0 bottom-0 w-px bg-white/50 shadow-[0_0_10px_white]"></div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-mono uppercase">
                        <span>Laps done: {currentLap - activeStint.startLap}</span>
                        <span>To go: {activeStint.endLap - currentLap}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                   <button onClick={() => setCurrentLap(Math.max(0, currentLap - 1))} className="h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold border border-slate-700 transition-colors">- 1 LAP</button>
                   <button onClick={() => setCurrentLap(currentLap + 1)} className="h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 border border-indigo-400/50 transition-colors">+ 1 LAP</button>
                </div>
            </div>
          </div>

          {/* SECONDARY STATS (Grid 2x1) */}
          <div className="grid grid-cols-2 gap-4 shrink-0">
             <div className="glass-panel rounded-xl p-4 flex flex-col justify-between">
                <div className="text-slate-500 text-[10px] font-bold uppercase flex items-center gap-1"><Fuel size={12}/> CONSUMPTION</div>
                <div className="flex items-end justify-between mt-2">
                   <span className="text-3xl font-mono font-bold text-white tracking-tighter">{fuelCons}</span>
                   <span className="text-[10px] text-slate-400 mb-1">L/Lap</span>
                </div>
                <input type="range" min="5" max="8" step="0.05" value={fuelCons} onChange={(e) => setFuelCons(Number(e.target.value))} className="w-full mt-3 h-1.5 bg-slate-800 rounded-full appearance-none accent-indigo-500 cursor-pointer"/>
             </div>
             
             <div className="glass-panel rounded-xl p-4 flex flex-col justify-between">
                <div className="text-slate-500 text-[10px] font-bold uppercase flex items-center gap-1"><RotateCcw size={12}/> AUTONOMY</div>
                <div className="flex items-end justify-between mt-2">
                   <span className={`text-3xl font-mono font-bold tracking-tighter ${strategyData.lapsPerTank < 8 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {strategyData.lapsPerTank}
                   </span>
                   <span className="text-[10px] text-slate-400 mb-1">Laps</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 bg-slate-800/50 px-2 py-1 rounded text-center">
                    {strategyData.totalStops} Pitstops total
                </div>
             </div>
          </div>

          {/* INCIDENT LOG (Fills remaining height) */}
          <div className="glass-panel rounded-2xl flex flex-col flex-1 overflow-hidden min-h-[150px]">
             <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
                <h3 className="font-bold text-slate-300 text-xs flex items-center gap-2">
                   <AlertTriangle size={14} className="text-amber-500"/> RACE CONTROL LOG
                </h3>
             </div>
             <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {incidents.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                        <Flag size={24} className="mb-2"/>
                        <span className="text-xs">Race clean.</span>
                    </div>
                )}
                {incidents.map((inc) => (
                   <div key={inc.id} className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 flex gap-3 group hover:border-red-500/30 transition-colors">
                      <div className="bg-red-500/10 text-red-500 w-8 h-8 rounded flex items-center justify-center shrink-0">
                         <AlertOctagon size={16} />
                      </div>
                      <div>
                         <div className="text-xs font-bold text-red-200">INCIDENT REPORTED</div>
                         <div className="text-[10px] text-slate-500 font-mono mt-0.5">LAP {inc.lap} • {inc.time}</div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* --- RIGHT PANEL: STRATEGY TABLE (col-span-8) --- */}
        <div className="lg:col-span-8 glass-panel rounded-2xl flex flex-col overflow-hidden shadow-2xl">
           
           {/* Table Toolbar */}
           <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                 <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Timer className="text-indigo-500" size={18}/> MASTER STRATEGY
                 </h3>
                 <div className="h-4 w-px bg-slate-700"></div>
                 <div className="flex gap-2">
                     <span className="flex items-center gap-1 text-[10px] uppercase text-slate-400"><span className="w-2 h-2 rounded-sm bg-blue-500/20 border border-blue-500/50"></span> Swap</span>
                     <span className="flex items-center gap-1 text-[10px] uppercase text-slate-400"><span className="w-2 h-2 rounded-sm bg-slate-800 border border-slate-600"></span> Fuel</span>
                 </div>
              </div>
              
              <button onClick={() => setIsEmergencyMode(!isEmergencyMode)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isEmergencyMode ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                 {isEmergencyMode ? '⚠ EMERGENCY MODE' : 'NORMAL OPERATION'}
              </button>
           </div>
           
           {/* Table Content (Scrollable) */}
           <div className="flex-1 overflow-auto custom-scrollbar bg-slate-900/20">
              <table className="w-full text-left text-sm border-collapse">
                 <thead className="sticky top-0 bg-[#0f172a] z-10 text-[10px] font-bold text-slate-500 uppercase tracking-wider shadow-md">
                    <tr>
                       <th className="p-4 border-b border-slate-800 w-16 text-center">#</th>
                       <th className="p-4 border-b border-slate-800">Driver</th>
                       <th className="p-4 border-b border-slate-800">Laps Window</th>
                       <th className="p-4 border-b border-slate-800 text-right">Fuel (L)</th>
                       <th className="p-4 border-b border-slate-800">Pit Action</th>
                       <th className="p-4 border-b border-slate-800 w-1/3">Engineer Notes</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/50">
                    {strategyData.stints.map((stint) => (
                       <tr key={stint.id} className={`group transition-all hover:bg-white/[0.02] ${stint.isActive ? 'bg-indigo-500/10 hover:bg-indigo-500/15' : ''}`}>
                          
                          {/* Stint Number */}
                          <td className="p-4 text-center">
                             <div className={`font-mono font-bold ${stint.isActive ? 'text-indigo-400 scale-110' : 'text-slate-600'} transition-transform`}>
                                {stint.stopNum}
                             </div>
                          </td>

                          {/* Driver */}
                          <td className="p-4">
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${stint.driver.bg} ${stint.driver.text} border ${stint.driver.border} border-opacity-30`}>
                                   {stint.driver.name.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                   <span className={`font-bold text-sm ${stint.isActive ? 'text-white' : 'text-slate-400'}`}>{stint.driver.name}</span>
                                   {stint.isActive && <span className="text-[9px] text-indigo-400 uppercase font-bold animate-pulse">On Track</span>}
                                </div>
                             </div>
                          </td>

                          {/* Windows */}
                          <td className="p-4">
                             <div className="flex items-center gap-2 font-mono text-sm text-slate-300">
                                <span className={stint.isActive ? 'text-white font-bold' : ''}>{stint.startLap}</span>
                                <ChevronRight size={12} className="text-slate-600"/>
                                <span className={stint.isActive ? 'text-white font-bold' : ''}>{stint.endLap}</span>
                             </div>
                             <div className="text-[10px] text-slate-500 mt-0.5">{stint.laps} laps stint</div>
                          </td>

                          {/* Fuel */}
                          <td className="p-4 text-right font-mono text-slate-300">
                             {stint.fuelNeeded}
                          </td>

                          {/* Action Tag */}
                          <td className="p-4">
                             <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase inline-flex items-center gap-1 ${
                                stint.notes.includes('SWAP') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                stint.notes.includes('FINISH') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                'bg-slate-800 text-slate-400 border-slate-700'
                             }`}>
                                {stint.notes}
                             </span>
                          </td>

                          {/* Notes Input */}
                          <td className="p-4">
                             <div className="relative group/input">
                                <input 
                                  type="text" 
                                  placeholder="Strategy note..." 
                                  value={stint.customNote}
                                  onChange={(e) => handleStintNoteChange(stint.stopNum, e.target.value)}
                                  className="bg-transparent border-b border-slate-800 focus:border-indigo-500 w-full text-xs py-1.5 text-slate-300 placeholder-slate-600 focus:outline-none transition-colors"
                                />
                                <FileText size={12} className="absolute right-0 top-2 text-slate-600 opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none" />
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

      </div>

      {/* --- MODAL SETTINGS (Identique mais z-index corrigé) --- */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="glass-panel bg-[#0f172a] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 border-slate-700">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="text-indigo-500" /> TEAM MANAGEMENT
                 </h2>
                 <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                 </button>
              </div>
              <div className="p-6 space-y-4">
                 {drivers.map((driver) => (
                    <div key={driver.id} className="flex flex-col md:flex-row gap-4 items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                       <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${driver.color} flex items-center justify-center shrink-0 shadow-lg`}>
                          <span className="font-bold text-white">{driver.name.charAt(0)}</span>
                       </div>
                       <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                          <input 
                             type="text" value={driver.name} 
                             onChange={(e) => handleDriverUpdate(driver.id, 'name', e.target.value)}
                             className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                             placeholder="Name"
                          />
                          <input 
                             type="text" value={driver.phone} 
                             onChange={(e) => handleDriverUpdate(driver.id, 'phone', e.target.value)}
                             className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-300 text-sm font-mono focus:border-indigo-500 outline-none"
                             placeholder="Phone"
                          />
                       </div>
                    </div>
                 ))}
              </div>
              <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end">
                 <button onClick={() => setShowSettings(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20">
                    <Save size={16} /> SAVE
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default RaceStrategyApp;
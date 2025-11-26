import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  Fuel, 
  RotateCcw, 
  Activity, 
  Users, 
  Flag, 
  CloudLightning, 
  Share2, 
  Clock,
  WifiOff,
  CheckCircle
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";

// --- 1. INITIALISATION SÉCURISÉE (SAFE MODE) ---
let app, auth, db;
let isFirebaseAvailable = false;

try {
  // Vérification stricte de l'environnement
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseAvailable = true;
  }
} catch (e) {
  console.warn("Firebase non disponible, passage en mode local.", e);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const SESSION_ID = "team-lemans-2025-v2";

const RaceStrategyApp = () => {
  // --- 2. ÉTAT (STATE) ---
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState("Initialisation..."); 
  
  // Paramètres Course
  const [tankCapacity, setTankCapacity] = useState(75);
  const [fuelCons, setFuelCons] = useState(6.25);
  const [stintsPerDriver, setStintsPerDriver] = useState(2);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [currentLap, setCurrentLap] = useState(0); 

  // Données Pilotes (Statiques et Sûres)
  const [lapTarget] = useState(372); 
  const [drivers] = useState([
    { id: 1, name: "Antoine", color: "bg-blue-100 text-blue-800 border-blue-200", iconColor: "text-blue-800" },
    { id: 2, name: "Enzo", color: "bg-green-100 text-green-800 border-green-200", iconColor: "text-green-800" },
    { id: 3, name: "Ewan", color: "bg-purple-100 text-purple-800 border-purple-200", iconColor: "text-purple-800" }
  ]);
  
  const [alerts, setAlerts] = useState([]);

  // --- 3. SYNCHRONISATION (SI DISPONIBLE) ---
  useEffect(() => {
    if (!isFirebaseAvailable) {
      setSyncStatus("Mode Local");
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth Error", e);
        setSyncStatus("Erreur Auth");
      }
    };
    initAuth();
    
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !isFirebaseAvailable) return;

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'strategies', SESSION_ID);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Mise à jour sécurisée des valeurs
          if (data.fuelCons) setFuelCons(Number(data.fuelCons));
          if (data.tankCapacity) setTankCapacity(Number(data.tankCapacity));
          if (data.stintsPerDriver) setStintsPerDriver(Number(data.stintsPerDriver));
          if (data.isEmergencyMode !== undefined) setIsEmergencyMode(!!data.isEmergencyMode);
          if (data.currentLap !== undefined) setCurrentLap(Number(data.currentLap));
          setSyncStatus("Synchronisé");
        } else {
          setDoc(docRef, {
            fuelCons: 6.25, tankCapacity: 75, stintsPerDriver: 2, isEmergencyMode: false, currentLap: 0,
            lastUpdated: new Date().toISOString()
          });
        }
      }, (error) => {
        console.error("Sync Error", error);
        setSyncStatus("Hors Ligne");
      });
      return () => unsubscribe();
    } catch (e) {
      setSyncStatus("Erreur Locale");
    }
  }, [user]);

  const updateStrategy = async (updates) => {
    // Mise à jour locale immédiate
    if (updates.fuelCons !== undefined) setFuelCons(Number(updates.fuelCons));
    if (updates.tankCapacity !== undefined) setTankCapacity(Number(updates.tankCapacity));
    if (updates.stintsPerDriver !== undefined) setStintsPerDriver(Number(updates.stintsPerDriver));
    if (updates.isEmergencyMode !== undefined) setIsEmergencyMode(updates.isEmergencyMode);
    if (updates.currentLap !== undefined) setCurrentLap(Number(updates.currentLap));

    if (user && isFirebaseAvailable) {
      setSyncStatus("Sauvegarde...");
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'strategies', SESSION_ID);
        await updateDoc(docRef, { ...updates, lastUpdated: new Date().toISOString(), updatedBy: user.uid });
        setSyncStatus("Synchronisé");
      } catch (e) {
        setSyncStatus("Erreur Sync");
      }
    }
  };

  // --- 4. MOTEUR DE CALCUL ---
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
      
      const currentDriver = drivers[driverIndex % drivers.length]; // Protection index
      const isActive = currentLap >= lapCounter && currentLap < stintEndLap;
      
      stints.push({
        id: i,
        stopNum: i + 1,
        startLap: lapCounter,
        endLap: stintEndLap,
        laps: lapsThisStint,
        fuelNeeded: (lapsThisStint * safeCons).toFixed(2),
        driver: currentDriver,
        notes: isLastStint ? "Arrivée" : (stintCountForDriver + 1 === stintsPerDriver ? "Changement Pilote" : "Plein Carburant"),
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
  }, [fuelCons, tankCapacity, lapTarget, drivers, stintsPerDriver, currentLap]);

  // Calcul Statistique
  const driverStats = useMemo(() => {
    const stats = drivers.map(d => ({ ...d, totalLaps: 0, timeOnTrack: 0 }));
    if (!strategyData.stints) return stats;

    strategyData.stints.forEach(stint => {
      const dIndex = drivers.findIndex(d => d.id === stint.driver.id);
      if (dIndex >= 0) {
        stats[dIndex].totalLaps += stint.laps;
        stats[dIndex].timeOnTrack += (stint.laps * 3.7); // Est. 3m42s par tour
      }
    });
    return stats;
  }, [strategyData, drivers]);

  // Récupération sécurisée du Stint Actuel
  const activeStint = strategyData.stints.find(s => s.isActive) || strategyData.stints[0] || {
    driver: drivers[0],
    startLap: 0,
    endLap: 10,
    laps: 10,
    stopNum: 1,
    notes: "Départ",
    fuelNeeded: "0"
  };

  const progressPercent = activeStint.laps > 0 
    ? Math.min(100, Math.max(0, ((currentLap - activeStint.startLap) / activeStint.laps) * 100))
    : 0;

  // Gestion des Alertes
  useEffect(() => {
    const newAlerts = [];
    if (strategyData.lapsPerTank < 8) newAlerts.push({ type: 'critical', msg: "Relais très courts (< 8 tours). Vérifier conso." });
    if (fuelCons * strategyData.lapsPerTank > tankCapacity) newAlerts.push({ type: 'critical', msg: "Conso dépasse le réservoir !" });
    if (isEmergencyMode) newAlerts.push({ type: 'warning', msg: "MODE URGENCE ACTIVÉ" });
    setAlerts(newAlerts);
  }, [strategyData, isEmergencyMode, fuelCons, tankCapacity]);

  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${m.toString().padStart(2, '0')}`;
  };

  // --- 5. INTERFACE UTILISATEUR (UI) ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      
      {/* HEADER */}
      <div className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <Flag className="text-white fill-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Le Mans 2025</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {syncStatus === 'Synchronisé' ? <CloudLightning size={12} className="text-green-500"/> : <WifiOff size={12} />}
                <span>{syncStatus}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <div className="text-xs text-slate-400 uppercase font-bold">Temps Course</div>
              <div className="font-mono text-xl font-bold text-yellow-400 flex items-center gap-2">
                <Clock size={16} /> {formatTime(currentLap * 3.7)}
              </div>
            </div>
            <button className="bg-slate-800 p-2 rounded-lg text-slate-300 hover:text-white transition-colors" title="Partager">
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        
        {/* ALERTES */}
        {alerts.map((alert, idx) => (
          <div key={idx} className={`mb-4 p-4 rounded-lg flex items-center gap-3 border-l-4 ${alert.type === 'critical' ? 'bg-red-50 text-red-700 border-red-500' : 'bg-amber-50 text-amber-800 border-amber-500'}`}>
            <AlertTriangle size={20} />
            <span className="font-bold">{alert.msg}</span>
          </div>
        ))}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* GAUCHE : PILOTE & CONTRÔLES (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* CARTE PILOTE */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
              <div className="p-6 text-center">
                <div className="uppercase text-xs font-bold text-slate-400 mb-2">Pilote en Piste</div>
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-3 border-4 bg-slate-50 ${activeStint.driver.color.includes('blue') ? 'border-blue-100' : activeStint.driver.color.includes('green') ? 'border-green-100' : 'border-purple-100'}`}>
                  <Users size={40} className={activeStint.driver.iconColor} />
                </div>
                <h2 className="text-3xl font-black text-slate-800">{activeStint.driver.name}</h2>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded text-sm font-mono text-slate-600 font-bold">
                  {activeStint.notes.toUpperCase()}
                </div>
                
                {/* Progression */}
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-slate-400 mb-1 font-bold">
                    <span>Tour {currentLap}</span>
                    <span>Fin: {activeStint.endLap}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                {/* Boutons Tours */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button onClick={() => updateStrategy({ currentLap: Math.max(0, currentLap - 1) })} className="py-2 px-4 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50">-1 Tour</button>
                  <button onClick={() => updateStrategy({ currentLap: currentLap + 1 })} className="py-2 px-4 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 shadow-lg">+1 Tour</button>
                </div>
              </div>
            </div>

            {/* PARAMÈTRES */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-blue-600" /> Stratégie
              </h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-slate-600">Conso (L/Tour)</label>
                    <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 rounded">{fuelCons.toFixed(2)}</span>
                  </div>
                  <input type="range" min="5.0" max="8.0" step="0.05" value={fuelCons} onChange={(e) => updateStrategy({ fuelCons: parseFloat(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">Relais par Pilote</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(num => (
                      <button key={num} onClick={() => updateStrategy({ stintsPerDriver: num })} className={`py-2 text-sm font-bold rounded-md transition-all ${stintsPerDriver === num ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>{num}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { const ideal = tankCapacity / (Math.floor(tankCapacity/fuelCons) + 1); updateStrategy({ fuelCons: parseFloat(ideal.toFixed(2)) }); }} className="p-3 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-100 hover:bg-emerald-100 flex flex-col items-center gap-1">
                    <Fuel size={16} /> OPTIMISER
                  </button>
                  <button onClick={() => updateStrategy({ fuelCons: 6.25, stintsPerDriver: 2, isEmergencyMode: false })} className="p-3 bg-slate-50 text-slate-600 font-bold text-xs rounded-lg border border-slate-200 hover:bg-slate-100 flex flex-col items-center gap-1">
                    <RotateCcw size={16} /> RESET
                  </button>
                </div>

                <button onClick={() => updateStrategy({ isEmergencyMode: !isEmergencyMode })} className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${isEmergencyMode ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                  <AlertTriangle size={16} /> {isEmergencyMode ? 'STOP URGENCE' : 'MODE URGENCE'}
                </button>
              </div>
            </div>

            {/* STATS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Users size={18} /> Répartition</h3>
              <div className="space-y-3">
                {driverStats.map(d => (
                  <div key={d.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                       <div className={`w-3 h-3 rounded-full ${d.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                       <span className="font-semibold">{d.name}</span>
                    </div>
                    <div className="font-mono font-bold text-slate-700">{formatTime(d.timeOnTrack)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DROITE : TABLEAU (8 cols) */}
          <div className="lg:col-span-8 h-full">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Plan de Course</h3>
                <div className="flex gap-4">
                   <div className="bg-white px-3 py-1 rounded border shadow-sm text-center">
                     <span className="text-[10px] text-slate-400 uppercase font-bold block">Arrêts</span>
                     <span className="font-bold text-lg">{strategyData.totalStops}</span>
                   </div>
                   <div className="bg-white px-3 py-1 rounded border shadow-sm text-center">
                     <span className="text-[10px] text-slate-400 uppercase font-bold block">Tours/Plein</span>
                     <span className={`font-bold text-lg ${strategyData.lapsPerTank < 10 ? 'text-red-600' : 'text-emerald-600'}`}>{strategyData.lapsPerTank}</span>
                   </div>
                </div>
              </div>

              <div className="overflow-auto flex-1 h-[600px]">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Stint</th>
                      <th className="px-5 py-3">Fenêtre</th>
                      <th className="px-5 py-3">Pilote</th>
                      <th className="px-5 py-3">Fuel</th>
                      <th className="px-5 py-3">Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {strategyData.stints.map((stint) => (
                      <tr key={stint.id} className={`transition-colors ${stint.isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-3 font-medium border-r border-slate-100">
                          #{stint.stopNum} {stint.isActive && <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-1"></span>}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{stint.startLap} → <b>{stint.endLap}</b></td>
                        <td className="px-5 py-3"><span className={`px-2 py-1 rounded text-xs font-bold border ${stint.driver.color}`}>{stint.driver.name}</span></td>
                        <td className="px-5 py-3 font-mono">
                          {stint.fuelNeeded} L {parseFloat(stint.fuelNeeded) > tankCapacity && <AlertTriangle size={14} className="inline text-red-500"/>}
                        </td>
                        <td className="px-5 py-3">
                          {stint.notes.includes('Change') ? <span className="text-blue-700 font-bold text-xs flex gap-1"><Users size={12}/> CHANGE</span> : 
                           stint.notes.includes('Arrivée') ? <span className="text-emerald-700 font-bold text-xs flex gap-1"><Flag size={12}/> ARRIVÉE</span> : 
                           <span className="text-slate-400 text-xs">Fuel Only</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RaceStrategyApp;
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Fuel, RotateCcw, Users, Flag, X, Save, AlertOctagon, 
  Settings, Play, Pause, CloudRain, Sun, Cloud, Wifi, 
  Clock, FileText, ChevronRight, Phone, Trash2, Map as MapIcon, 
  AlertTriangle, CheckCircle2, Plus, Minus, Home, Trophy, 
  MessageSquare, Send, ArrowDownCircle, Activity, Battery, Zap 
} from 'lucide-react';

// --- IMPORT NOUVEAUX COMPOSANTS ---
import StrategyView from './components/StrategyView';
import MapView from './components/MapView';
import ChatView from './components/ChatView';
import TelemetryView from './components/TelemetryView'; 

// --- IMPORT FIREBASE ---
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

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
import lmp2CarImg from './assets/lmp2-car.jpg'; 
import hypercarCarImg from './assets/Hypercar.jpg'; 
import baguetteImg from './assets/Baguette.png';

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

  /* --- ANIMATION BAGUETTES --- */
  @keyframes fall {
    0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
  }
  .baguette-fall {
    position: absolute;
    top: -10%;
    animation: fall linear infinite;
    pointer-events: none; 
    opacity: 0.6;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
  }
`;

const generateBaguettes = (count) => {
  const baguettes = [];
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100 + '%';
    const animationDuration = Math.random() * 10 + 5 + 's'; 
    const animationDelay = Math.random() * -15 + 's'; 
    const scale = Math.random() * 0.5 + 0.3; 
    baguettes.push(<img key={i} src={baguetteImg} className="baguette-fall" alt="" style={{ left, animationDuration, animationDelay, transform: `scale(${scale})` }} />);
  }
  return baguettes;
};

// Fonction pour formater les temps en heures:minutes:secondes
const formatTime = (s) => {
    if(isNaN(s) || s < 0) return "00:00:00";
    const h = Math.floor(s/3600).toString().padStart(2,'0'), m = Math.floor((s%3600)/60).toString().padStart(2,'0'), sec = (s%60).toString().padStart(2,'0');
    return `${h}:${m}:${sec}`;
};

// Fonction pour formater les temps au tour (X:XX.X)
const formatLapTime = (s) => {
    if (isNaN(s) || s <= 0) return "---";
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`; 
};

// Fonction pour calculer le delta et la classe de couleur
const getLapTimeDelta = (estimatedTime, realTimeAvg) => {
    const delta = realTimeAvg - estimatedTime;

    let colorClass = 'text-white';
    let deltaSign = '';
    if (delta > 0.5) { // Plus lent
        colorClass = 'text-red-500';
        deltaSign = '+';
    } else if (delta < -0.5) { // Plus rapide
        colorClass = 'text-emerald-500';
    } else if (delta !== 0) { // Léger décalage
        colorClass = 'text-amber-500';
        deltaSign = delta > 0 ? '+' : '';
    }
    const displayDelta = delta !== 0 ? `${deltaSign}${delta.toFixed(2)}s` : '±0.0s';
    
    return { colorClass, displayDelta, realTimeAvg };
};


// --- COMPOSANT DASHBOARD ---
const TeamDashboard = ({ teamId, teamName, teamColor, onTeamSelect }) => { 
  const SESSION_ID = `lemans-2025-${teamId}`; 
  const CHAT_ID = "lemans-2025-global-radio"; 
  const isHypercar = teamId === 'hypercar';

  const [status, setStatus] = useState("CONNECTING...");
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState("STRATEGY");
  
  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [username, setUsername] = useState("Engineer");
  const [globalMessages, setGlobalMessages] = useState([]); 
  
  // Démarre le Race Time en fonction de la durée de course (24h par défaut)
  const [localRaceTime, setLocalRaceTime] = useState(24 * 3600);
  const [localStintTime, setLocalStintTime] = useState(0);

  const [gameState, setGameState] = useState({
    currentStint: 0,
    raceTime: 24 * 60 * 60, // Durée TOTALE stockée. C'est la valeur de reset.
    stintDuration: 0,
    stintStartTime: Date.now(),
    isRaceRunning: false,
    
    // Météo et état de la piste - MOCK DATA
    weather: "SUNNY", 
    airTemp: 25,     
    trackWetness: 0, 
    
    fuelCons: 3.65, // Consommation pour LMP2 (L/Lap)
    veCons: 2.5,    // Consommation pour Hypercar (%/Lap)
    tankCapacity: 105, // Capacité du réservoir.
    
    // Paramètres basés sur la durée
    raceDurationHours: 24, 
    avgLapTimeSeconds: 210, // Temps ESTIMÉ pour la stratégie
    
    isEmergency: false,
    drivers: [],
    activeDriverId: 0,
    incidents: [], 
    chatMessages: [], 
    stintNotes: {},
    stintAssignments: {},
    position: 4, 
    telemetry: {
        laps: 124,
        fuel: { current: 45.5, max: 105, lastLapCons: 3.62, averageCons: 3.65 },
        virtualEnergy: 88, 
        tires: { fl: 92, fr: 89, rl: 95, rr: 94 },
        currentLapTimeSeconds: 212.5, 
        last3LapAvgSeconds: 211.2 
    },
    // Données spécifiques à la stratégie VE (si Hypercar)
    stintVirtualEnergy: { 1: 90, 2: 85, 3: 92 } 
  });

  // --- SYNC ENGINE (STRATÉGIE) ---
  useEffect(() => {
    if (!db) { 
        setStatus("LOCAL MODE (No DB)"); 
        setGameState(prev => ({...prev, drivers: [{id: 1, name: "Driver 1", color: "#ef4444", phone: ""}]}));
        return; 
    }

    const docRef = doc(db, "strategies", SESSION_ID);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) { 
          const data = docSnap.data();
          
          const newRaceDurationHours = typeof data.raceDurationHours === 'number' ? data.raceDurationHours : gameState.raceDurationHours;
          const totalRaceSeconds = newRaceDurationHours * 3600;

          // --- CORRECTION: MAPPING DES DONNÉES LIVE DU BRIDGE VERS L'OBJET TELEMETRY ---
          const liveTelemetry = {
              ...gameState.telemetry, 
              laps: data.currentLap ?? gameState.telemetry.laps,
              
              // Mise à jour du Fuel
              fuel: {
                  ...gameState.telemetry.fuel,
                  current: data.fuelRemainingL ?? gameState.telemetry.fuel.current,
                  max: data.fuelTankCapacityL ?? gameState.telemetry.fuel.max, // NOUVEAU: Capacité du réservoir
                  averageCons: data.fuelConsumptionPerLapL ?? gameState.telemetry.fuel.averageCons,
                  lastLapCons: data.fuelConsumptionLastLapL ?? gameState.telemetry.fuel.lastLapCons,
              },
              
              // Mise à jour des Pneus (USURE RESTANTE)
              tires: {
                  fl: data.tireWearFL ?? gameState.telemetry.tires.fl,
                  fr: data.tireWearFR ?? gameState.telemetry.tires.fr,
                  rl: data.tireWearRL ?? gameState.telemetry.tires.rl,
                  rr: data.tireWearRR ?? gameState.telemetry.tires.rr,
              },
              // Mise à jour conso/usure par tour (données brutes pour StrategyView)
              avgWearPerLapFL: data.avgWearPerLapFL ?? 0,
              avgWearPerLapFR: data.avgWearPerLapFR ?? 0,
              avgWearPerLapRL: data.avgWearPerLapRL ?? 0,
              avgWearPerLapRR: data.avgWearPerLapRR ?? 0,
              
              // Temps du dernier tour
              lastLapTimeSeconds: data.lapTimeLast ?? gameState.telemetry.currentLapTimeSeconds,
              
              virtualEnergy: data.engineMode === 3 ? 99 : (data.engineMode === 2 ? 1 : gameState.telemetry.virtualEnergy), // MAPPING SIMPLIFIÉ ERS -> VE (Regen=99, Propulse=1)
          };
          // --- FIN DE LA CORRECTION ---

          const safeData = {
              ...gameState, 
              ...data,      
              drivers: data.drivers || [],
              stintAssignments: data.stintAssignments || {},
              currentStint: typeof data.currentStint === 'number' ? data.currentStint : 0,
              position: typeof data.position === 'number' ? data.position : gameState.position, 
              raceDurationHours: newRaceDurationHours,
              avgLapTimeSeconds: typeof data.avgLapTimeSeconds === 'number' ? data.avgLapTimeSeconds : gameState.avgLapTimeSeconds, 
              raceTime: typeof data.raceTime === 'number' ? data.raceTime : totalRaceSeconds,
              weather: data.weather || gameState.weather,
              airTemp: typeof data.airTemp === 'number' ? data.airTemp : gameState.airTemp,
              trackWetness: typeof data.trackWetness === 'number' ? data.trackWetness : gameState.trackWetness,
              fuelCons: typeof data.fuelCons === 'number' ? data.fuelCons : gameState.fuelCons,
              veCons: typeof data.veCons === 'number' ? data.veCons : gameState.veCons, 
              telemetry: liveTelemetry
          };

          setGameState(safeData); 
          
          // --- DÉBUT SYNCHRONISATION TEMPS RESTANT LIVE ---
          let newLocalRaceTime = safeData.raceTime;
          
          // 1. Si la course est en cours (safeData.isRaceRunning)
          // 2. ET si le bridge envoie un temps restant (sessionTimeRemainingSeconds) 
          // On utilise la valeur live pour forcer le compteur local, même si ce n'est pas le mode "Race" officiel.
          if (
              safeData.isRaceRunning &&
              typeof data.sessionTimeRemainingSeconds === 'number' && 
              data.sessionTimeRemainingSeconds >= 0
          ) {
              newLocalRaceTime = data.sessionTimeRemainingSeconds;
          }
          
          setLocalRaceTime(newLocalRaceTime); // <- Utilisation de la source déterminée
          // --- FIN SYNCHRONISATION TEMPS RESTANT LIVE ---

          setLocalStintTime(safeData.stintDuration || 0);
          setStatus("LIVE SYNC"); 
      } else {
          // Si le document n'existe pas, on l'initialise
          const initialRaceTime = gameState.raceDurationHours * 3600;

          const initialData = { 
              ...gameState, 
              drivers: [{id: 1, name: "Driver 1", color: teamId === 'hypercar' ? '#ef4444' : '#3b82f6', phone: ""}],
              activeDriverId: 1,
              raceTime: initialRaceTime,
          };
          setDoc(docRef, initialData).then(() => setStatus("CREATED")).catch(err => setStatus("ERROR CREATE"));
      }
    }, (error) => {
        console.error("Firebase listen error:", error);
        setStatus("ERROR SYNC");
    });

    return () => unsubscribe();
  }, [SESSION_ID]);

  // --- HOOK pour synchroniser localRaceTime quand raceDurationHours change (dans les settings) ---
  useEffect(() => {
    // Cette logique ne devrait s'appliquer que si la course n'a pas commencé ou si la source LIVE n'est pas active.
    // L'ajout de "sessionTimeRemainingSeconds" ci-dessus prime.
    if (!gameState.isRaceRunning) {
        const totalSeconds = gameState.raceDurationHours * 3600;
        if (localRaceTime !== totalSeconds) {
            setLocalRaceTime(totalSeconds);
            syncUpdate({ raceTime: totalSeconds });
        }
    }
  }, [gameState.raceDurationHours, gameState.isRaceRunning]);


  // --- SYNC ENGINE (CHAT) ---
  useEffect(() => {
    if (!db) return;
    const chatRef = doc(db, "strategies", CHAT_ID);
    const unsubChat = onSnapshot(chatRef, (docSnap) => {
        if (docSnap.exists()) {
            setGlobalMessages(docSnap.data().messages || []);
        } else {
            setDoc(chatRef, { messages: [] });
        }
    });
    return () => unsubChat();
  }, []);

  // --- TIMERS LOOP (Le compte à rebours local qui continue si la source live s'arrête) ---
  useEffect(() => {
    let interval = null;
    if (gameState.isRaceRunning && localRaceTime > 0) {
        interval = setInterval(() => {
            setLocalRaceTime(prev => {
                if (prev <= 0) {
                    syncUpdate({ isRaceRunning: false, raceTime: 0 });
                    return 0;
                }
                return prev - 1;
            });
            setLocalStintTime(prev => prev + 1);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.isRaceRunning, localRaceTime]); 


  // --- ACTIONS ---
  const syncUpdate = (data) => {
    if (!db) { setGameState(prev => ({...prev, ...data})); return; }
    updateDoc(doc(db, "strategies", SESSION_ID), data).catch(e => console.error("Update Error", e));
  };

  const updateStintVE = (stintId, value) => {
      syncUpdate({ stintVirtualEnergy: { ...gameState.stintVirtualEnergy, [stintId]: value } });
  };
  
  const sendMessage = () => {
      if (!chatInput.trim()) return;
      if (!db) return;

      const newMessage = {
          id: Date.now(),
          user: username || "Anon",
          team: teamName, 
          teamColor: teamColor,
          text: chatInput,
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };

      const chatRef = doc(db, "strategies", CHAT_ID);
      updateDoc(chatRef, { messages: arrayUnion(newMessage) }).catch(e => console.error("Chat Error", e));
      setChatInput("");
  };

  const toggleRaceTimer = () => {
    // Quand on démarre/arrête la course, on met à jour la valeur persistée (raceTime) 
    // avec la valeur actuelle du compteur (localRaceTime)
    if (gameState.isRaceRunning) {
        syncUpdate({ isRaceRunning: false, raceTime: localRaceTime, stintDuration: localStintTime });
    } else {
        syncUpdate({ isRaceRunning: true });
    }
  };

  const resetRaceTimer = () => {
      console.log("WARNING: RESET COMPLET DE LA COURSE DEMANDÉ.");
      const initialRaceTime = gameState.raceDurationHours * 3600;
      
      const resetData = { 
          isRaceRunning: false, 
          raceTime: initialRaceTime, 
          stintDuration: 0, 
          currentStint: 0, 
          incidents: [], 
          chatMessages: [],
          stintVirtualEnergy: {}
      };
      
      if (db) {
          syncUpdate(resetData);
      }
      setLocalRaceTime(initialRaceTime);
      setLocalStintTime(0);
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
      // Mise à jour du pilote actif si l'assignation concerne le stint actuel
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
    if (!nextDriverId && gameState.drivers.length > 0) nextDriverId = gameState.drivers[0].id;

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

  // Mise à jour de la conso pour l'élément actif (Fuel ou VE)
  const updateCons = (delta) => {
      if (isHypercar) {
          syncUpdate({ veCons: Number((gameState.veCons + delta).toFixed(2)) });
      } else {
          syncUpdate({ fuelCons: Number((gameState.fuelCons + delta).toFixed(2)) });
      }
  }
  
  const addIncident = () => {
    const newInc = { id: Date.now(), lap: "Stint " + (gameState.currentStint + 1), time: formatTime(localRaceTime), text: "" };
    syncUpdate({ incidents: [newInc, ...gameState.incidents] });
  };
  const deleteIncident = (id) => syncUpdate({ incidents: gameState.incidents.filter(inc => inc.id !== id) });
  const updateIncidentInfo = (id, txt) => syncUpdate({ incidents: gameState.incidents.map(inc => inc.id === id ? { ...inc, text: txt } : inc) });


  const strategyData = useMemo(() => {
    if (!gameState.drivers || gameState.drivers.length === 0) return { stints: [], totalLaps: 0, lapsPerTank: 0, lapsPerVE: 0 };
    
    // --- CALCUL DU NOMBRE TOTAL DE TOURS (TARGET) basé sur le temps ---
    const totalRaceSeconds = (gameState.raceDurationHours || 24) * 3600;
    const calculatedTotalLaps = Math.max(1, Math.floor(totalRaceSeconds / (gameState.avgLapTimeSeconds || 210)));
    const totalLapsTarget = calculatedTotalLaps; 
    // --------------------------------------------------------

    const safeCons = (gameState.fuelCons > 0) ? gameState.fuelCons : 3.65;
    const safeTank = (gameState.telemetry.fuel.max > 0) ? gameState.telemetry.fuel.max : 105; // UTILISE LA MAX TANK DE LA TÉLÉMÉTRIE
    const safeVECons = (gameState.veCons > 0) ? gameState.veCons : 2.5;
    
    // Calcul de l'autonomie Fuel
    const lapsPerTank = Math.floor(safeTank / safeCons);
    
    // Calcul de l'autonomie VE (basé sur 100%)
    const lapsPerVE = Math.floor(100 / safeVECons); 

    const safeLapsPerStint = isHypercar ? lapsPerVE : lapsPerTank; // L'autonomie est définie par la VE pour les Hypercars
    
    // Le nombre de stops est basé sur l'autonomie la plus critique
    const finalLapsPerStint = Math.max(1, safeLapsPerStint);

    const totalStops = Math.max(0, Math.ceil(totalLapsTarget / finalLapsPerStint) - 1);
    const stints = [];
    let lapCounter = 0;
    
    for (let i = 0; i <= totalStops; i++) {
      const isLast = i === totalStops;
      const lapsThisStint = isLast ? (totalLapsTarget - lapCounter) : finalLapsPerStint;
      const endLap = lapCounter + lapsThisStint;
      let driverId = gameState.stintAssignments[i];
      if (!driverId && gameState.drivers.length > 0) driverId = gameState.drivers[i % gameState.drivers.length].id;
      const driver = getSafeDriver(gameState.drivers.find(d => d.id === driverId));
      
      let fuelDisplay = "";
      if (isLast) {
          fuelDisplay = (lapsThisStint * safeCons).toFixed(1) + " L";
      } else {
          fuelDisplay = "FULL (" + safeTank + " L)";
      }

      stints.push({ 
          id: i, stopNum: i+1, startLap: lapCounter, endLap, 
          fuel: fuelDisplay, 
          veTarget: (lapsThisStint * safeVECons).toFixed(1) + "%", // VE consommée pour ce stint
          driver, driverId, isCurrent: i === gameState.currentStint, isNext: i === gameState.currentStint + 1, isDone: i < gameState.currentStint, 
          note: isLast ? "FINISH" : "BOX" 
      });
      lapCounter += lapsThisStint;
    }
    // On retourne le nombre total de tours calculé
    return { stints, lapsPerTank: finalLapsPerStint, totalLaps: totalLapsTarget }; 
  }, [gameState]);

  const activeDriver = useMemo(() => {
      if (!gameState.drivers || gameState.drivers.length === 0) return getSafeDriver(null);
      return getSafeDriver(gameState.drivers.find(d => d.id === gameState.activeDriverId));
  }, [gameState.drivers, gameState.activeDriverId]);

  // 🏎️ CORRECTION : On récupère le pilote directement depuis les données du tableau (Next Stint)
  const nextDriverInfo = useMemo(() => {
      const nextStintIndex = (gameState.currentStint || 0) + 1;
      const nextStintObj = strategyData.stints.find(s => s.id === nextStintIndex);

      if (nextStintObj && nextStintObj.driver) {
          return nextStintObj.driver;
      }
      return getSafeDriver(null);
  }, [gameState.currentStint, strategyData]);

  // Utilisation du delta de temps réel/estimé pour l'affichage
  const lapTimeDeltaInfo = getLapTimeDelta(gameState.avgLapTimeSeconds, gameState.telemetry.last3LapAvgSeconds);

  // Fonction pour afficher l'icône météo
  const getWeatherIcon = (weather) => {
    switch (weather) {
      case 'SUNNY':
        return <Sun size={14} className="text-yellow-400"/>;
      case 'CLOUDY':
        return <Cloud size={14} className="text-slate-400"/>;
      case 'RAIN':
      case 'WET':
        return <CloudRain size={14} className="text-blue-400"/>;
      default:
        return <Sun size={14} className="text-yellow-400"/>;
    }
  };


  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#020408] text-slate-200 font-sans">
      
      {/* HEADER */}
      <div className="h-16 glass-panel flex items-center justify-between px-6 sticky top-0 z-50 shrink-0 w-full">
        <div className="flex items-center gap-4">
          <button onClick={() => onTeamSelect(null)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"><Home size={20}/></button>
          <div className={`p-2 rounded transform skew-x-[-10deg] ${teamColor}`}><Flag className="text-white transform skew-x-[10deg]" size={20}/></div>
          <div>
            <h1 className="font-bold text-lg lg:text-xl tracking-tighter text-white italic uppercase">{teamName} <span className="text-slate-500">24H</span></h1>
            <div className={`text-[10px] font-bold tracking-widest flex items-center gap-1 ${status.includes('LIVE') ? 'text-emerald-500' : 'text-red-500'}`}><Wifi size={10}/> {status}</div>
          </div>
        </div>
        
        {/* AFFICHAGE DE LA POSITION DANS LE HEADER */}
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 bg-black/40 px-6 py-1.5 rounded-lg border border-white/5">
                <div className="text-right">
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">POSITION</div>
                    <div className="font-mono text-3xl font-black leading-none text-white">P{gameState.position}</div>
                </div>
            </div>
            <div className="hidden md:flex items-center gap-4 bg-black/40 px-6 py-1.5 rounded-lg border border-white/5">
               <div className="text-right"><div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">RACE TIME</div><div class={`font-mono text-2xl lg:text-3xl font-bold leading-none ${localRaceTime < 3600 ? 'text-red-500' : 'text-white'}`}>{formatTime(localRaceTime)}</div></div>
               <button onClick={toggleRaceTimer} className={`p-2 rounded-full border transition-all ${gameState.isRaceRunning ? 'border-amber-500 text-amber-500 bg-amber-900/10' : 'border-emerald-500 text-emerald-500 bg-emerald-900/10'}`}>{gameState.isRaceRunning ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor" className="ml-0.5"/>}</button>
            </div>
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
                   <div className="flex items-center gap-2 mb-1">
                     <span className="text-[9px] font-bold text-slate-400 tracking-widest flex items-center gap-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> 
                       DRIVER (STINT {(gameState.currentStint || 0) + 1})
                     </span>
                   </div>
                   
                   {/* Affichage de la position et du nom du pilote */}
                   <div className="flex items-center gap-4">
                       {/* Position stylisée */}
                       <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xl italic shadow-lg shadow-indigo-900/50">
                           {gameState.position}
                       </div>
                       {/* Nom du pilote (grande taille) */}
                       <h2 className="text-3xl lg:text-4xl font-black text-white italic uppercase tracking-tighter truncate max-w-[250px]">{activeDriver.name}</h2>
                   </div>
                   {/* FIN DE LA CORRECTION */}
                   
                   {activeDriver.phone && <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-1"><Phone size={10} /> {activeDriver.phone}</div>}
                   <div className="flex items-center gap-2 mt-3 text-indigo-300 font-mono text-xs lg:text-sm bg-indigo-500/10 px-2 py-1 rounded w-fit border border-indigo-500/20"><Clock size={14} /> Stint: {formatTime(localStintTime)}</div>
                </div>
                <div className="flex flex-col items-end gap-2"><div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center border border-white/10 shadow-lg" style={{ backgroundColor: activeDriver.color }}><Users size={20} className="text-white" /></div></div>
             </div>
             
             <div className="mb-4">
                <button onClick={confirmPitStop} className="w-full h-16 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-black text-xl uppercase shadow-lg shadow-indigo-900/50 border border-indigo-400/50 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"><CheckCircle2 size={28} /> Pit Stop Done</button>
                <div className="flex justify-between mt-2 px-1"><button onClick={undoStint} className="text-[10px] text-slate-500 hover:text-red-400 underline">Mistake? Undo Stop</button></div>
             </div>
             
             {/* NOUVEAU BLOC COMPARATIF TEMPS */}
             <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700 shadow-lg relative mb-4">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                    <span>Lap Time Comparatif (Avg 3 Laps)</span>
                    <span className={lapTimeDeltaInfo.colorClass}>{lapTimeDeltaInfo.displayDelta}</span>
                </div>
                <div className="flex justify-between items-center mt-2 font-mono text-lg font-black text-white">
                    <span className="text-slate-500 text-base font-medium">Est.: <span className="text-indigo-400">{formatLapTime(gameState.avgLapTimeSeconds)}</span></span>
                    <span>Real: <span className={lapTimeDeltaInfo.colorClass}>{formatLapTime(lapTimeDeltaInfo.realTimeAvg)}</span></span>
                </div>
                <div className="text-[9px] text-slate-600 pt-1">Time difference vs. current strategy estimate.</div>
             </div>

             {/* BLOC INFO "NEXT DRIVER" */}
             <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700 flex items-center justify-between mb-4 shadow-lg relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                <div>
                   <div className="flex items-center gap-2 text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-0.5">
                      <ArrowDownCircle size={12} /> Next Driver
                   </div>
                   <div className="text-xl font-black text-white uppercase italic tracking-tighter">{nextDriverInfo.name}</div>
                </div>
                {nextDriverInfo.phone && nextDriverInfo.phone !== "" && (
                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded px-2 py-1.5">
                        <Phone size={14} className="text-green-500"/>
                        <span className="text-xs font-mono font-bold text-green-400">{nextDriverInfo.phone}</span>
                    </div>
                )}
             </div>

             {/* AFFICHAGE MÉTÉO (Remplaçant les boutons supprimés) */}
             <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700 flex justify-between items-center text-sm font-bold shadow-lg">
                <div className="flex items-center gap-2 text-slate-400">
                    {getWeatherIcon(gameState.weather)}
                    <span className="text-white uppercase">{gameState.weather}</span>
                    <span className="text-slate-500 font-normal">({gameState.airTemp}°C)</span>
                </div>
                <div className="flex items-center gap-2 text-blue-400">
                    <CloudRain size={14}/>
                    <span className="text-white">{gameState.trackWetness}%</span>
                    <span className="text-slate-500 font-normal">Wet</span>
                </div>
             </div>
             {/* FIN AFFICHAGE MÉTÉO */}

          </div>

          <div className="grid grid-cols-2 gap-4 shrink-0">
             {/* CONSO / VE CONS */}
             <div className="glass-panel rounded-xl p-3 flex flex-col justify-between h-24">
                <div className="flex justify-between items-center">
                    <div className={`${isHypercar ? 'text-cyan-500' : 'text-slate-500'} text-[9px] font-bold uppercase flex items-center gap-1`}>
                        {isHypercar ? <Zap size={12} className="inline mr-1"/> : <Fuel size={12} className="inline mr-1"/>} 
                        {isHypercar ? 'VE CONS' : 'FUEL CONS'}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                    <div className="text-2xl lg:text-3xl font-mono font-bold text-white tracking-tighter">
                        {isHypercar ? gameState.veCons : gameState.fuelCons}
                    </div>
                    <div className="flex flex-col gap-1">
                        <button onClick={()=>updateCons(0.05)} className="w-6 h-4 flex items-center justify-center bg-slate-800 rounded hover:bg-indigo-600"><Plus size={8}/></button>
                        <button onClick={()=>updateCons(-0.05)} className="w-6 h-4 flex items-center justify-center bg-slate-800 rounded hover:bg-indigo-600"><Minus size={8}/></button>
                    </div>
                </div>
                <div className="text-[9px] text-slate-500">
                    {isHypercar ? '% / Lap' : 'L / Lap'}
                </div>
             </div>
             {/* TOTAL LAPS (Autonomie basée sur l'élément critique) */}
             <div className="glass-panel rounded-xl p-3 flex flex-col justify-between h-24">
                <div className="text-slate-500 text-[9px] font-bold uppercase"><Trophy size={12} className="inline mr-1"/> TOTAL LAPS (EST.)</div>
                <div className="text-2xl lg:text-3xl font-mono font-bold text-emerald-400 tracking-tighter">{strategyData.totalLaps}</div>
                <div className="text-[9px] text-slate-500">Based on {gameState.raceDurationHours}H @ {gameState.avgLapTimeSeconds}s</div>
             </div>
          </div>

          {/* Le bloc VIRTUAL ENERGY a été supprimé ici, comme demandé. */}

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

        {/* RIGHT - PANNEAU PRINCIPAL */}
        <div className="flex-1 glass-panel rounded-xl flex flex-col overflow-hidden shadow-2xl border-t-2 border-indigo-500 relative w-full">
           <div className="p-3 border-b border-white/5 bg-slate-900/50 flex justify-between items-center shrink-0">
              <div className="flex gap-1 p-1 bg-black/30 rounded-lg">
                 <button onClick={() => setViewMode("STRATEGY")} className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === "STRATEGY" ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><FileText size={14}/> Strategy</button>
                 
                 {/* NOUVEAU BOUTON TELEMETRY */}
                 <button onClick={() => setViewMode("TELEMETRY")} className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === "TELEMETRY" ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><Activity size={14}/> Telemetry</button>
                 
                 <button onClick={() => setViewMode("MAP")} className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === "MAP" ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><MapIcon size={14}/> Map</button>
                 <button onClick={() => setViewMode("CHAT")} className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === "CHAT" ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><MessageSquare size={14}/> Chat</button>
              </div>
              <button onClick={() => syncUpdate({isEmergency: !gameState.isEmergency})} className={`px-2 py-1 rounded text-[9px] font-bold border ${gameState.isEmergency ? 'bg-red-600 text-white border-red-600 animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{gameState.isEmergency ? '⚠ SAFETY CAR' : 'GREEN FLAG'}</button>
           </div>
           
           {/* AFFICHAGE DES VUES */}
           {viewMode === "STRATEGY" && (
             <StrategyView 
               strategyData={strategyData}
               drivers={gameState.drivers}
               stintNotes={gameState.stintNotes}
               onAssignDriver={assignDriverToStint}
               onUpdateNote={(stopNum, val) => syncUpdate({ stintNotes: { ...gameState.stintNotes, [stopNum]: val }})}
               
               // PROPS DE TEMPS
               estimatedTime={gameState.avgLapTimeSeconds}
               realTimeAvg={gameState.telemetry.last3LapAvgSeconds}
               
               // PROPS VIRTUAL ENERGY
               isHypercar={isHypercar}
               telemetryData={gameState.telemetry}
             />
           )}

           {viewMode === "TELEMETRY" && (
             <TelemetryView 
                telemetryData={gameState.telemetry}
                isHypercar={isHypercar}
                position={gameState.position} 
                avgLapTimeSeconds={gameState.avgLapTimeSeconds} 
                // PASSAGE DES NOUVELLES DONNÉES MÉTÉO
                weather={gameState.weather}
                airTemp={gameState.airTemp}
                trackWetness={gameState.trackWetness}
             />
           )}

           {viewMode === "MAP" && (
             <MapView />
           )}

           {viewMode === "CHAT" && (
             <ChatView 
                messages={globalMessages}
                username={username}
                setUsername={setUsername}
                chatInput={chatInput}
                setChatInput={setChatInput}
                onSendMessage={sendMessage}
             />
           )}
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="glass-panel w-full max-w-lg rounded-xl p-6 border border-slate-700 space-y-4">
              <div className="flex justify-between items-center"><h2 className="text-lg font-bold text-white">SETTINGS</h2><button onClick={()=>setShowSettings(false)}><X className="text-slate-400"/></button></div>
              <div className="grid grid-cols-2 gap-4">
                 
                 {/* CHAMP DURÉE DE COURSE */}
                 <div><label className="text-[10px] text-slate-500 font-bold">RACE DURATION (Hours)</label><input type="number" value={gameState.raceDurationHours} onChange={(e)=>syncUpdate({raceDurationHours: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                 
                 {/* CHAMP TEMPS MOYEN AU TOUR */}
                 <div><label className="text-[10px] text-slate-500 font-bold">AVG LAP TIME (Seconds)</label><input type="number" value={gameState.avgLapTimeSeconds} onChange={(e)=>syncUpdate({avgLapTimeSeconds: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                 
                 {/* Reste des champs de réglage */}
                 <div><label className="text-[10px] text-slate-500 font-bold">TANK (L)</label><input type="number" value={gameState.tankCapacity} onChange={(e)=>syncUpdate({tankCapacity: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                 
                 {/* CHAMP CONSO CONDITIONNEL DANS LES RÉGLAGES */}
                 <div>
                    {/* Le label s'adapte */}
                    <label className={`${isHypercar ? 'text-cyan-500' : 'text-slate-500'} text-[10px] font-bold`}>
                        {isHypercar ? 'VE CONS (%/Lap)' : 'FUEL CONS (L/Lap)'}
                    </label>
                    {/* L'input lit et écrit la variable appropriée */}
                    <input 
                        type="number" 
                        step="0.01" 
                        value={isHypercar ? gameState.veCons : gameState.fuelCons} 
                        onChange={(e)=> syncUpdate(isHypercar ? {veCons: Number(e.target.value)} : {fuelCons: Number(e.target.value)})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    />
                 </div>
              </div>
              <div className="space-y-2 pt-2">
                 {/* Nouveaux champs de réglages Météo/Piste pour le test */}
                 <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[10px] text-slate-500 font-bold">MÉTÉO (SUNNY/RAIN/CLOUDY)</label><input type="text" value={gameState.weather} onChange={(e)=>syncUpdate({weather: e.target.value.toUpperCase()})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                    <div><label className="text-[10px] text-slate-500 font-bold">TEMP AIR (°C)</label><input type="number" value={gameState.airTemp} onChange={(e)=>syncUpdate({airTemp: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                    <div><label className="text-[10px] text-slate-500 font-bold">WETNESS (%)</label><input type="number" value={gameState.trackWetness} onChange={(e)=>syncUpdate({trackWetness: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                 </div>
                 
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
                 {/* Champ pour modifier la position dans les réglages pour le test */}
                 <div className="pt-2"><label className="text-[10px] text-slate-500 font-bold">CURRENT POSITION</label><input type="number" value={gameState.position} onChange={(e)=>syncUpdate({position: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"/></div>
                 {/* Utilisation de console.log au lieu de confirm() pour le reset */}
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
        <div className="absolute inset-0 z-0">
           {/* BAGUETTES */}
           {generateBaguettes(40)}
           {/* COUCHE DE FOND SOMBRE + DÉGRADÉ */}
           <div className="absolute inset-0 bg-[#020408] opacity-80"></div>
           <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-red-900/40 opacity-50 animate-pulse"></div>
        </div>

        {/* ⚠️ AJOUT DE LA MENTION FBT ICI 👇 */}
        <span className="text-xs font-bold text-indigo-500 tracking-widest uppercase mb-[-20px] z-20 relative">FBT Technologies only</span>
        <h1 className="text-4xl font-black text-white italic z-20 relative">LE MANS <span className="text-indigo-500">24H</span> STRATEGY</h1>
        
        <div className="flex gap-6 z-20 relative">
          {/* BOUTON HYPERCAR AVEC IMAGE */}
          <button onClick={() => setSelectedTeam('hypercar')} className="w-72 h-48 rounded-3xl relative overflow-hidden group shadow-2xl hover:scale-105 transition-all duration-300 border border-red-500/30">
             <img src={hypercarCarImg} alt="Hypercar" className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
             <div className="absolute inset-0 bg-gradient-to-t from-red-950/95 via-red-900/60 to-black/30 mix-blend-multiply transition-opacity group-hover:opacity-90"></div>
             <div className="relative z-10 flex flex-col items-center justify-center h-full text-white p-4">
                 <span className="font-black text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tight">HYPERCAR</span>
                 <span className="text-sm text-red-100 mt-2 font-bold bg-red-700/80 px-3 py-0.5 rounded-full drop-shadow">WEC TOP CLASS</span>
             </div>
          </button>

          {/* BOUTON LMP2 AVEC IMAGE */}
          <button onClick={() => setSelectedTeam('lmp2')} className="w-72 h-48 rounded-3xl relative overflow-hidden group shadow-2xl hover:scale-105 transition-all duration-300 border border-blue-500/30">
             <img src={lmp2CarImg} alt="LMP2" className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
             <div className="absolute inset-0 bg-gradient-to-t from-blue-950/95 via-blue-900/60 to-black/30 mix-blend-multiply transition-opacity group-hover:opacity-90"></div>
             <div className="relative z-10 flex flex-col items-center justify-center h-full text-white p-4">
                 <span className="font-black text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tight">LMP2</span>
                 <span className="text-sm text-blue-100 mt-2 font-bold bg-blue-600/80 px-3 py-0.5 rounded-full drop-shadow">ORECA 07</span>
             </div>
          </button>
        </div>
        <div className="text-slate-500 text-sm mt-8 font-bold tracking-widest uppercase z-20 relative">Select your team to access the Pit Wall</div>
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
        onTeamSelect={setSelectedTeam} 
      />
    </>
  );
};

export default RaceStrategyApp;
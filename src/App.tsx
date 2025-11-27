import React, { useState, useMemo } from 'react';
import { Settings, Home, Wifi, Flag, AlertOctagon, Trophy, Pause, Play } from 'lucide-react';

// Imports des composants
import StrategyView from './components/views/StrategyView';
import MapView from './components/views/MapView';
import ChatView from './components/views/ChatView';
import TelemetryView from './components/views/TelemetryView';
import LandingPage from './components/LandingPage'; // Créez ce fichier avec le contenu de votre accueil
import SettingsModal from './components/SettingsModal'; // Créez ce fichier avec le contenu de votre modal

// Hooks & Utils
import { useRaceData } from './hooks/useRaceData';
import { getSafeDriver, formatTime } from './utils/helpers';
import { updateDoc, doc, arrayUnion } from "firebase/firestore";

const globalCss = `
  :root, body, #root { width: 100vw; height: 100vh; margin: 0; padding: 0; max-width: none !important; overflow: hidden; background-color: #020408; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
  .map-invert { filter: invert(1) hue-rotate(180deg) contrast(0.9); opacity: 0.9; }
  .row-done { opacity: 0.4; filter: grayscale(0.8); }
`;

const TeamDashboard = ({ teamId, teamName, teamColor, onTeamSelect }: any) => { 
  const isHypercar = teamId === 'hypercar';
  
  // Utilisation du Hook personnalisé
  const { 
      gameState, syncUpdate, status, localRaceTime, localStintTime, strategyData, confirmPitStop, db, CHAT_ID 
  } = useRaceData(teamId);

  const [viewMode, setViewMode] = useState("STRATEGY");
  const [showSettings, setShowSettings] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [username, setUsername] = useState("Engineer");
  const [globalMessages, setGlobalMessages] = useState<any[]>([]); // À connecter avec un hook chat séparé idéalement

  const activeDriver = getSafeDriver(gameState.drivers.find(d => d.id === gameState.activeDriverId));

  const sendMessage = () => {
      if (!chatInput.trim() || !db) return;
      const newMessage = {
          id: Date.now(),
          user: username,
          team: teamName, 
          teamColor: teamColor,
          text: chatInput,
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      updateDoc(doc(db, "strategies", CHAT_ID), { messages: arrayUnion(newMessage) });
      setChatInput("");
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#020408] text-slate-200 font-sans">
      <style>{globalCss}</style>
      
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
        
        <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 bg-black/40 px-6 py-1.5 rounded-lg border border-white/5">
               <div className="text-right"><div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">RACE TIME</div><div className={`font-mono text-2xl lg:text-3xl font-bold leading-none ${localRaceTime < 3600 ? 'text-red-500' : 'text-white'}`}>{formatTime(localRaceTime)}</div></div>
            </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white/10 rounded text-slate-400"><Settings size={20}/></button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 lg:p-6 gap-6 w-full">
        {/* LEFT PANEL (Sidebar simplifiée pour l'exemple) */}
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-4 h-full overflow-hidden">
             {/* Vous pouvez extraire ceci dans un composant Sidebar.tsx */}
             <div className="glass-panel rounded-xl p-6 relative overflow-hidden group shrink-0">
                 <h2 className="text-3xl font-black text-white italic uppercase">{activeDriver.name}</h2>
                 <div className="text-indigo-300 font-mono text-sm mt-2">Stint: {formatTime(localStintTime)}</div>
                 <button onClick={confirmPitStop} className="w-full mt-4 bg-indigo-600 text-white p-3 rounded font-bold">PIT STOP DONE</button>
             </div>
        </div>

        {/* RIGHT PANEL (Main View) */}
        <div className="flex-1 glass-panel rounded-xl flex flex-col overflow-hidden shadow-2xl border-t-2 border-indigo-500 relative w-full">
           <div className="p-3 border-b border-white/5 bg-slate-900/50 flex gap-2">
               {["STRATEGY", "TELEMETRY", "MAP", "CHAT"].map(mode => (
                   <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1 rounded text-xs font-bold ${viewMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{mode}</button>
               ))}
           </div>
           
           {/* VUES AVEC PROPS CORRECTES */}
           {viewMode === "STRATEGY" && (
             <StrategyView 
               strategyData={strategyData}
               drivers={gameState.drivers}
               stintNotes={gameState.stintNotes}
               onAssignDriver={(idx: number, id: any) => {
                   const newAssign = {...gameState.stintAssignments, [idx]: Number(id)};
                   syncUpdate({ stintAssignments: newAssign });
               }}
               onUpdateNote={(stopNum: any, val: any) => syncUpdate({ stintNotes: { ...gameState.stintNotes, [stopNum]: val }})}
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
                weather={gameState.weather}
                airTemp={gameState.airTemp}
                trackWetness={gameState.trackWetness}
             />
           )}

           {viewMode === "MAP" && <MapView />}

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

      {/* MODALS */}
      {showSettings && (
        <SettingsModal 
            gameState={gameState}
            syncUpdate={syncUpdate}
            onClose={() => setShowSettings(false)}
            isHypercar={isHypercar}
            onAddDriver={() => { /* logique add */ }}
            onRemoveDriver={(id: any) => { /* logique remove */ }}
            onUpdateDriver={(id: any, f: string, v: any) => { /* logique update */ }}
            onReset={() => { /* logique reset */ }}
        />
      )}
    </div>
  );
};

const RaceStrategyApp = () => {
  const [selectedTeam, setSelectedTeam] = useState(null); 

  if (!selectedTeam) {
    // Assurez-vous d'avoir créé LandingPage.tsx ou copiez le JSX ici
    return <LandingPage onSelectTeam={setSelectedTeam} />;
  }

  return (
    <TeamDashboard 
      teamId={selectedTeam} 
      teamName={selectedTeam === 'hypercar' ? 'HYPERCAR' : 'LMP2'}
      teamColor={selectedTeam === 'hypercar' ? 'bg-red-600' : 'bg-blue-600'}
      onTeamSelect={setSelectedTeam} 
    />
  );
};

export default RaceStrategyApp;
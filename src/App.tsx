import React, { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Settings, Home, Wifi, Flag, Clock, RotateCcw, ArrowRight, AlertTriangle, Plus} from 'lucide-react';
import { supabase } from './lib/supabaseClient.ts';

import StrategyView from './components/views/StrategyView';
import MapView from './components/views/MapView';
import ChatView from './components/views/ChatView';
import TelemetryView from './components/views/TelemetryView';
import LiveTimingView from './components/views/LiveTimingView';
import AnalysisView from './components/views/AnalysisView';
import LandingPage from './components/LandingPage';
import SettingsModal from './components/SettingsModal';

import { useRaceData } from './hooks/useRaceData';
import { getSafeDriver, formatTime } from './utils/helpers';

const globalCss = `
  :root, body, #root { width: 100vw; height: 100vh; margin: 0; padding: 0; max-width: none !important; overflow: hidden; background-color: #020408; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
  .map-invert { filter: invert(1) hue-rotate(180deg) contrast(0.9); opacity: 0.9; }
  .row-done { opacity: 0.4; filter: grayscale(0.8); }
`;

const TeamDashboard = ({ teamId }: { teamId: string }) => {
    const navigate = useNavigate();

    const tId = teamId.toLowerCase();
    let teamColor = 'bg-slate-600';
    if (tId.includes('hyper') || tId.includes('red')) teamColor = 'bg-red-600';
    else if (tId.includes('gt3') || tId.includes('lmgt3')) teamColor = 'bg-orange-500';
    else if (tId.includes('lmp3')) teamColor = 'bg-purple-600';
    else if (tId.includes('elms')) teamColor = 'bg-sky-500';
    else if (tId.includes('lmp2')) teamColor = 'bg-blue-600';

    const teamName = teamId.toUpperCase().replace('-', ' #');

    const {
        gameState, syncUpdate, status, localRaceTime, localStintTime, strategyData,
        confirmPitStop, undoPitStop, resetRace,
        CHAT_ID, isHypercar, isLMGT3,
        setManualFuelTarget, setManualVETarget,
        updateStintConfig // Pour l'éditeur de stratégie
    } = useRaceData(teamId);

    const [viewMode, setViewMode] = useState("STRATEGY");
    const [showSettings, setShowSettings] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [username, setUsername] = useState("Engineer");
    const [globalMessages] = useState<import('./types').ChatMessage[]>([]);

    const activeDriver = getSafeDriver(gameState.drivers.find(d => d.id === gameState.activeDriverId));
    const nextStint = strategyData?.stints?.find(s => s.isNext);
    const nextDriver = nextStint ? nextStint.driver : null;

    const handleLogout = () => {
        localStorage.removeItem('teamId');
        navigate('/');
    };

    const sendMessage = () => {
        if (!chatInput.trim()) return;
        const newMessage = {
            id: Date.now(),
            user: username,
            team: teamName,
            teamColor: teamColor,
            category: gameState.telemetry.carCategory || "Cat?",
            text: chatInput,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };

        (async () => {
            try {
                const { error } = await supabase.rpc('append_message', { p_id: CHAT_ID, p_msg: newMessage });
                if (error) {
                    const { data: row } = await supabase.from('strategies').select('messages').eq('id', CHAT_ID).maybeSingle();
                    const msgs = (Array.isArray(row?.messages) ? row?.messages : []) as import('./types').ChatMessage[];
                    await supabase.from('strategies').update({ messages: [...msgs, newMessage] }).eq('id', CHAT_ID);
                }
            } catch (e) { console.error(e); }
            setChatInput("");
        })();
    };

    const addIncident = () => {
        const text = prompt("Incident details:");
        if (text) {
            const newIncident = {
                id: Date.now(),
                time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                lap: gameState.telemetry.laps,
                text
            };
            syncUpdate({ incidents: [newIncident, ...gameState.incidents] });
        }
    };

    const addDriver = () => {
        const newId = Date.now();
        const newDriver = { id: newId, name: "New Driver", phone: "", color: "#64748b" };
        syncUpdate({ drivers: [...gameState.drivers, newDriver] });
    };

    const removeDriver = (id: number | string) => {
        if (gameState.drivers.length <= 1) return;
        syncUpdate({ drivers: gameState.drivers.filter(d => d.id !== id) });
    };

    const updateDriverInfo = (id: number | string, field: string, val: string | number) => {
        syncUpdate({ drivers: gameState.drivers.map(d => d.id === id ? { ...d, [field]: val } : d) });
    };

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-[#020408] text-slate-200 font-sans">
            <style>{globalCss}</style>

            {/* HEADER */}
            <div className="h-16 glass-panel flex items-center justify-between px-6 sticky top-0 z-50 shrink-0 w-full border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button onClick={handleLogout} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Change Team"><Home size={20}/></button>
                    <div className={`p-2 rounded transform skew-x-[-10deg] ${teamColor}`}><Flag className="text-white transform skew-x-[10deg]" size={20}/></div>
                    <div>
                        <h1 className="font-bold text-lg lg:text-xl tracking-tighter text-white italic uppercase">{teamName}</h1>
                        <div className={`text-[10px] font-bold tracking-widest flex items-center gap-1 ${status.includes('LIVE') ? 'text-emerald-500' : 'text-red-500'}`}><Wifi size={10}/> {status}</div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-end mr-2">
               <span className="text-white font-black text-sm uppercase tracking-wide">
                 {gameState.trackName || "TRACK"}
               </span>
                        <span className="text-indigo-400 text-[10px] font-bold tracking-widest uppercase bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-500/30">
                 {gameState.sessionType || "SESSION"}
               </span>
                    </div>
                    <div className="hidden md:flex items-center gap-4 bg-black/40 px-6 py-1.5 rounded-lg border border-white/5 shadow-inner">
                        <div className="text-right">
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">RACE TIME</div>
                            <div className={`font-mono text-2xl lg:text-3xl font-bold leading-none ${localRaceTime < 3600 ? 'text-red-500' : 'text-white'}`}>{formatTime(localRaceTime)}</div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white/10 rounded text-slate-400"><Settings size={20}/></button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 lg:p-6 gap-6 w-full">

                {/* SIDEBAR */}
                <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-4 h-full overflow-hidden">

                    {/* 1. ACTIVE DRIVER */}
                    <div className="glass-panel rounded-xl p-6 relative overflow-hidden group shrink-0 border-l-4 border-l-indigo-500">
                        <div className="absolute top-2 right-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">CURRENT</div>
                        <h2 className="text-3xl font-black text-white italic uppercase truncate">{activeDriver.name}</h2>

                        {/* TIMERS */}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded p-2">
                                <div className="text-[9px] text-indigo-300 font-bold uppercase flex items-center gap-1">
                                    <Clock size={10}/> Current Stint
                                </div>
                                <div className="font-mono text-xl font-bold text-white">
                                    {formatTime(localStintTime)}
                                </div>
                            </div>
                            {/* Affichage du temps total si disponible (supposons que vous l'ayez ajouté aux drivers) */}
                            <div className="bg-slate-800/50 border border-white/5 rounded p-2">
                                <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                    <Clock size={10}/> Total Drive
                                </div>
                                <div className="font-mono text-xl font-bold text-slate-200">
                                    {formatTime(activeDriver.totalDriveTime || 0)}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-4">
                            <button onClick={confirmPitStop} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded font-bold transition-all shadow-lg shadow-indigo-900/20 active:scale-95">
                                CONFIRM PIT STOP
                            </button>
                            <button onClick={undoPitStop} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 p-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                                <RotateCcw size={12}/> UNDO LAST STOP
                            </button>
                        </div>
                    </div>

                    {/* 2. NEXT DRIVER */}
                    <div className="glass-panel p-5 rounded-xl shrink-0 flex flex-col gap-2 border-l-4 border-l-slate-600">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <ArrowRight size={12}/> NEXT DRIVER
                        </div>
                        {nextDriver ? (
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-2xl text-white truncate">{nextDriver.name}</span>
                                <div className="h-4 w-4 rounded shadow-sm border border-white/20" style={{background: nextDriver.color}}></div>
                            </div>
                        ) : (
                            <span className="text-slate-600 font-mono text-sm italic">-- Check Strategy --</span>
                        )}
                    </div>

                    {/* 3. INCIDENTS */}
                    <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col gap-3 min-h-0 border-l-4 border-l-amber-500/50">
                        <div className="flex items-center justify-between shrink-0">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle size={12} className="text-amber-500"/> RACE LOG
                            </div>
                            <button onClick={addIncident} className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-white font-bold flex items-center gap-1 transition-colors"><Plus size={10}/> ADD</button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {gameState.incidents.length === 0 && <div className="text-center text-xs text-slate-700 py-4">No events</div>}
                            {gameState.incidents.map((inc: import('./types').Incident) => (
                                <div key={inc.id} className="bg-slate-900/80 p-3 rounded border-l-2 border-amber-500 hover:bg-slate-800 transition-colors">
                                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                                        <span className="text-amber-500 font-bold">{inc.time}</span>
                                        <span>Lap {inc.lap}</span>
                                    </div>
                                    <div className="text-xs text-slate-200 font-medium leading-tight">{inc.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="flex-1 glass-panel rounded-xl flex flex-col overflow-hidden shadow-2xl border-t-2 border-indigo-500 relative w-full">
                    <div className="p-3 border-b border-white/5 bg-slate-900/50 flex gap-2 shrink-0 overflow-x-auto">
                        {["STRATEGY", "TELEMETRY","LIVE", "MAP", "ANALYSIS", "CHAT"].map(mode => (
                            <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-1.5 rounded text-xs font-bold tracking-wide transition-all ${viewMode === mode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}>{mode}</button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                        {viewMode === "STRATEGY" && (
                            <StrategyView
                                strategyData={strategyData}
                                currentLap={gameState.telemetry.laps}
                                telemetry={gameState.telemetry}
                                drivers={gameState.drivers}
                                onUpdateStint={updateStintConfig}
                                onUpdateNote={(idx, val) => syncUpdate({ stintNotes: { ...gameState.stintNotes, [idx]: val } })}
                            />
                        )}
                        {viewMode === "LIVE" && (
                            <div className="h-full p-0 overflow-hidden rounded-xl border border-white/5">
                                <LiveTimingView
                                    telemetryData={gameState.telemetry}
                                    isHypercar={isHypercar}
                                    vehicles={gameState.allVehicles}
                                />
                            </div>
                        )}
                        {viewMode === "TELEMETRY" && (
                            <TelemetryView
                                telemetryData={gameState.telemetry}
                                isHypercar={isHypercar}
                                isLMGT3={isLMGT3}
                                position={gameState.position}
                                avgLapTimeSeconds={gameState.avgLapTimeSeconds}
                                weather={gameState.weather}
                                airTemp={gameState.airTemp}
                                trackTemp={gameState.trackTemp} // <--- AJOUTER CECI
                                trackWetness={gameState.trackWetness}
                                weatherForecast={gameState.weatherForecast}
                                targetFuelCons={strategyData.targetFuelCons}
                                targetVECons={strategyData.targetVECons}
                                onSetFuelTarget={setManualFuelTarget}
                                onSetVETarget={setManualVETarget}
                            />
                        )}
                        {viewMode === "MAP" && <MapView vehicles={gameState.allVehicles} myCarId={gameState.telemetry.position} savedMap={gameState.trackMap} onSaveMap={useRaceData(teamId).saveTrackMap} />}
                        {viewMode === "ANALYSIS" && <AnalysisView history={gameState.lapHistory} />}
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
            </div>

            {/* MODALS */}
            {showSettings && (
                <SettingsModal
                    gameState={gameState}
                    syncUpdate={syncUpdate}
                    onClose={() => setShowSettings(false)}
                    isHypercar={isHypercar}
                    isLMGT3={isLMGT3}
                    onAddDriver={addDriver}
                    onRemoveDriver={removeDriver}
                    onUpdateDriver={updateDriverInfo}
                    onReset={resetRace}
                />
            )}
        </div>
    );
};

const StrategyRoute = () => {
    const teamId = localStorage.getItem('teamId');
    if (!teamId) return <Navigate to="/" replace />;
    return <TeamDashboard teamId={teamId} />;
};

const RaceStrategyApp = () => {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/strategy" element={<StrategyRoute />} />
        </Routes>
    );
};

export default RaceStrategyApp;
import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Settings, Home, Wifi, Flag, Clock, RotateCcw, ArrowRight, AlertTriangle, Plus} from 'lucide-react';
import StrategyView from './components/views/StrategyView';
import MapView from './components/views/MapView';
import ChatView from './components/views/ChatView';
import TelemetryView from './components/views/TelemetryView';
import LiveTimingView from './components/views/LiveTimingView';
import AnalysisView from './components/views/AnalysisView';
import RaceControlView from './components/views/RaceControlView';
import SetupManagerView from './components/views/SetupManagerView';
import LandingPage from './components/LandingPage';
import SettingsModal from './components/SettingsModal';
import IncidentModal from './components/IncidentModal';
import { useRaceData } from './hooks/useRaceData';
import { getSafeDriver, formatTime } from './utils/helpers';
import ErrorBoundary from './components/ErrorBoundary';
import type { SessionMode } from './types';

const TABS_BY_SESSION: Record<SessionMode, string[]> = {
    RACE: ['STRATEGY', 'TELEMETRY', 'RACE CTRL', 'LIVE', 'MAP', 'SETUPS', 'ANALYSIS', 'CHAT'],
    QUALIFY: ['TELEMETRY', 'LIVE', 'RACE CTRL', 'MAP', 'SETUPS', 'ANALYSIS', 'CHAT'],
    PRACTICE: ['STRATEGY', 'TELEMETRY', 'LIVE', 'RACE CTRL', 'MAP', 'SETUPS', 'ANALYSIS', 'CHAT'],
    UNKNOWN: ['STRATEGY', 'TELEMETRY', 'RACE CTRL', 'LIVE', 'MAP', 'SETUPS', 'ANALYSIS', 'CHAT']
};

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
        isHypercar, isLMGT3,
        sessionMode,
        setManualFuelTarget, setManualVETarget,
        updateStintConfig,
        updateStintConfigBulk,
        saveTrackMap,
        setups, setupsLoading, setupsError, setupApplyStatus, applyingSetupId, fetchSetups, applySetup,
        lastTestedEndpoints,
        canManageLineup,
        canAccessAdmin,
        sendMessage: sendToVPS // On récupère la fonction du hook
    } = useRaceData(teamId);

    const [viewMode, setViewMode] = useState("STRATEGY");
    const [showSettings, setShowSettings] = useState(false);
    const [showRaceLog, setShowRaceLog] = useState(false);
    const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [username, setUsername] = useState("Engineer");
    const [layoutPresetVersion, setLayoutPresetVersion] = useState(0);

    const activeTabs = useMemo(() => TABS_BY_SESSION[sessionMode] || TABS_BY_SESSION.UNKNOWN, [sessionMode]);

    const layoutStorageKey = `layout_preset_${teamId}_${sessionMode}`;
    const layoutPreset = useMemo<'FOCUS' | 'BALANCED' | 'OVERVIEW'>(() => {
        const saved = localStorage.getItem(layoutStorageKey);
        if (saved === 'FOCUS' || saved === 'BALANCED' || saved === 'OVERVIEW') return saved;
        return sessionMode === 'RACE' || sessionMode === 'QUALIFY' ? 'FOCUS' : 'OVERVIEW';
    }, [layoutStorageKey, sessionMode, layoutPresetVersion]);

    const setAndPersistLayoutPreset = (preset: 'FOCUS' | 'BALANCED' | 'OVERVIEW') => {
        localStorage.setItem(layoutStorageKey, preset);
        setLayoutPresetVersion(v => v + 1);
    };

    const effectiveViewMode = activeTabs.includes(viewMode) ? viewMode : (activeTabs[0] || 'STRATEGY');

    const activeDriver = getSafeDriver(gameState.drivers.find(d => d.id === gameState.activeDriverId));
    const nextStint = strategyData?.stints?.find(s => s.isNext);
    const nextDriver = nextStint ? nextStint.driver : null;
    const nextDriverSource: 'config' | 'legacy' | 'auto' =
        (nextStint as { driverSource?: 'config' | 'legacy' | 'auto' } | undefined)?.driverSource ?? 'auto';

    const sessionLabel =
        sessionMode === 'RACE' ? 'RACE MODE' :
            sessionMode === 'QUALIFY' ? 'QUALIFY MODE' :
                sessionMode === 'PRACTICE' ? 'PRACTICE MODE' : 'SESSION MODE';

    const sidebarWidthClass =
        layoutPreset === 'FOCUS' ? 'lg:w-[360px]' :
            layoutPreset === 'OVERVIEW' ? 'lg:w-[480px]' :
                'lg:w-[420px]';
    const isRaceFocus = sessionMode === 'RACE' && layoutPreset === 'FOCUS';
    const playerVehicle = gameState.allVehicles.find(v => Number(v.is_player) === 1);

    const currentStint = strategyData?.stints?.find(s => s.isCurrent);
    const pitFuelDisplay = (() => {
        if (!currentStint) return gameState.telemetry.strategyPitFuel?.toFixed(1) || "0.0";
        if (currentStint.virtualEnergy && currentStint.virtualEnergy !== "-") {
            const veNeeded = parseFloat(currentStint.virtualEnergy) || 100;
            const ratio = currentStint.fuelEnergyRatio ?? 1.0;
            return (veNeeded * ratio).toFixed(1);
        }
        return gameState.telemetry.strategyPitFuel?.toFixed(1) || "0.0";
    })();

    useEffect(() => {
        const onGlobalKeyDown = (evt: KeyboardEvent) => {
            const target = evt.target as HTMLElement | null;
            const tag = (target?.tagName || '').toUpperCase();
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
            if (showSettings || showIncidentModal) return;

            const key = evt.key.toUpperCase();
            if (key === 'P') {
                evt.preventDefault();
                confirmPitStop();
            }
            if (key === 'U') {
                evt.preventDefault();
                undoPitStop();
            }
        };

        window.addEventListener('keydown', onGlobalKeyDown);
        return () => window.removeEventListener('keydown', onGlobalKeyDown);
    }, [confirmPitStop, undoPitStop, showSettings, showIncidentModal]);

    const handleLogout = () => {
        localStorage.removeItem('teamId');
        navigate('/');
    };

    const handleSendMessage = (overrideText?: string) => {
        const text = overrideText || chatInput;
        if (!text.trim()) return;
        const newMessage = {
            id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
            user: username,
            team: teamName,
            teamColor: teamColor,
            category: gameState.telemetry.carCategory || "Cat?",
            text,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };

        // Envoi via le hook (Socket.IO)
        sendToVPS(newMessage);
        setChatInput("");
    };

    const addIncident = () => {
        setShowIncidentModal(true);
    };

    const saveIncident = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const newIncident = {
            id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
            time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            lap: gameState.telemetry.laps,
            text: trimmed
        };
        syncUpdate({ incidents: [newIncident, ...gameState.incidents] });
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
        <div className="flex flex-col h-screen w-full overflow-hidden text-slate-200 font-sans">

            {/* HEADER */}
            <div className="h-16 fbt-panel flex items-center justify-between px-6 sticky top-0 z-50 shrink-0 w-full border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button onClick={handleLogout} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Change Team"><Home size={20}/></button>
                    <div className={`p-2 rounded transform skew-x-[-10deg] ${teamColor}`}><Flag className="text-white transform skew-x-[10deg]" size={20}/></div>
                    <div>
                        <h1 className="font-bold text-lg lg:text-xl tracking-tighter text-white italic uppercase">{teamName}</h1>
                        <div className={`text-[10px] font-bold tracking-widest flex items-center gap-1 ${status.includes('LIVE') ? 'text-emerald-500' : 'text-red-500'}`}><Wifi size={10}/> {status}</div>
                    </div>
                    <div className="hidden lg:flex w-20 fbt-tricolor-bar" />
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
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">CLOCK TIME</div>
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
                <div className={`w-full ${sidebarWidthClass} shrink-0 flex flex-col gap-4 h-full overflow-hidden`}>

                    {/* 1. ACTIVE DRIVER */}
                    <div className="fbt-panel rounded-xl p-6 relative overflow-hidden group shrink-0 border-l-4 border-l-indigo-500">
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
                            <button onClick={confirmPitStop} className="w-full bg-indigo-600 hover:bg-indigo-500 hover:-translate-y-0.5 text-white p-3 rounded font-bold transition-all shadow-lg shadow-indigo-900/20 active:scale-95">
                                {sessionMode === 'RACE' ? 'CONFIRM PIT STOP' : 'CONFIRM STINT CHANGE'}
                            </button>
                            <button onClick={undoPitStop} className="w-full bg-slate-800 hover:bg-slate-700 hover:-translate-y-0.5 text-slate-400 p-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all">
                                <RotateCcw size={12}/> UNDO LAST STOP
                            </button>
                        </div>
                    </div>

                    {/* 2. NEXT DRIVER */}
                    <div className="fbt-panel p-5 rounded-xl shrink-0 flex flex-col gap-2 border-l-4 border-l-slate-600">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <ArrowRight size={12}/> NEXT DRIVER
                        </div>
                        {nextDriver ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-bold text-2xl text-white truncate">{nextDriver.name}</span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                        nextDriverSource === 'config'
                                            ? 'text-emerald-300 border-emerald-500/30 bg-emerald-900/30'
                                            : nextDriverSource === 'legacy'
                                                ? 'text-amber-300 border-amber-500/30 bg-amber-900/30'
                                                : 'text-slate-400 border-slate-700/50 bg-slate-900/40'
                                    }`}>
                                        {nextDriverSource === 'config' ? 'CFG' : nextDriverSource === 'legacy' ? 'LEG' : 'AUTO'}
                                    </span>
                                </div>
                                <div className="h-4 w-4 rounded shadow-sm border border-white/20 shrink-0" style={{background: nextDriver.color}}></div>
                            </div>
                        ) : (
                            <span className="text-slate-600 font-mono text-sm italic">-- Check Strategy --</span>
                        )}
                    </div>

                    {/* 3. RACE ENGINEER COCKPIT */}
                    <div className="fbt-panel p-4 rounded-xl shrink-0 border-l-4 border-l-cyan-500/50">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Race Engineer</div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="rounded bg-slate-900/70 border border-white/5 p-2">
                                <div className="text-slate-500">Pit Fuel</div>
                                <div className="text-cyan-300 font-black">{pitFuelDisplay} L</div>
                            </div>
                            <div className="rounded bg-slate-900/70 border border-white/5 p-2">
                                <div className="text-slate-500">Pit Time</div>
                                <div className="text-amber-300 font-black">{(gameState.telemetry.strategyEstPitTime || 35).toFixed(1)} s</div>
                            </div>
                            <div className="rounded bg-slate-900/70 border border-white/5 p-2">
                                <div className="text-slate-500">VE Target</div>
                                <div className="text-emerald-300 font-black">{strategyData.targetVECons > 0 ? `${strategyData.targetVECons.toFixed(1)}%/lap` : '--'}</div>
                            </div>
                        </div>
                    </div>

                    {sessionMode === 'QUALIFY' && (
                        <div className="fbt-panel p-4 rounded-xl shrink-0 border-l-4 border-l-fuchsia-500/60">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] font-bold text-fuchsia-300 uppercase tracking-widest">Qualif Attack</div>
                                <div className="text-[10px] text-slate-500">Gap Next: {(Number(playerVehicle?.gap_next || 0)).toFixed(1)}s</div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="rounded bg-slate-900/70 border border-white/5 p-2">
                                    <div className="text-slate-500">Pos</div>
                                    <div className="text-white font-black">P{gameState.telemetry.position || '-'}</div>
                                </div>
                                <div className="rounded bg-slate-900/70 border border-white/5 p-2">
                                    <div className="text-slate-500">Best</div>
                                    <div className="text-emerald-300 font-black">{(gameState.telemetry.bestLap || 0) > 0 ? `${gameState.telemetry.bestLap.toFixed(2)}s` : '--'}</div>
                                </div>
                                <div className="rounded bg-slate-900/70 border border-white/5 p-2">
                                    <div className="text-slate-500">Last</div>
                                    <div className="text-cyan-300 font-black">{(gameState.telemetry.lastLap || 0) > 0 ? `${gameState.telemetry.lastLap.toFixed(2)}s` : '--'}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. SESSION CONTEXT */}
                    <div className={`fbt-panel p-4 rounded-xl ${isRaceFocus ? 'shrink-0' : 'flex-1 min-h-0'} flex flex-col gap-3 border-l-4 border-l-amber-500/50`}>
                        <div className="flex items-center justify-between shrink-0">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle size={12} className="text-amber-500"/> {sessionLabel}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={addIncident} className="text-[10px] bg-slate-800 hover:bg-slate-700 hover:-translate-y-0.5 px-2 py-1 rounded text-white font-bold flex items-center gap-1 transition-all"><Plus size={10}/> ADD</button>
                                <button onClick={() => setShowRaceLog(v => !v)} className="text-[10px] bg-slate-900 hover:bg-slate-800 hover:-translate-y-0.5 px-2 py-1 rounded text-slate-300 font-bold transition-all">
                                    {showRaceLog ? 'HIDE LOG' : 'SHOW LOG'}
                                </button>
                            </div>
                        </div>

                        {!isRaceFocus && (
                            <div className="rounded-lg border border-white/5 bg-slate-950/40 p-3 text-xs text-slate-400">
                            {sessionMode === 'RACE' && 'Focus: trafic sortie pit, fenêtres relais et exécution pit.'}
                            {sessionMode === 'QUALIFY' && 'Focus: préparation push lap, track evolution et fenêtre pneus.'}
                            {sessionMode === 'PRACTICE' && 'Focus: tests setup, runs carburant/VE et validation des pilotes.'}
                            {sessionMode === 'UNKNOWN' && 'Focus: en attente du type de session live.'}
                            </div>
                        )}

                        <div className={`${isRaceFocus ? 'max-h-36' : 'flex-1'} overflow-y-auto custom-scrollbar space-y-2 pr-1 ${showRaceLog ? '' : 'opacity-60'}`}>
                            {gameState.incidents.length === 0 && <div className="text-center text-xs text-slate-700 py-4">No events</div>}
                            {(showRaceLog ? gameState.incidents : gameState.incidents.slice(0, isRaceFocus ? 2 : 3)).map((inc: import('./types').Incident) => (
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
                <div className="flex-1 fbt-panel rounded-xl flex flex-col overflow-hidden shadow-2xl border-t-2 border-indigo-500 relative w-full">
                    <div className="p-3 border-b border-white/5 bg-slate-900/60 flex items-center justify-between gap-2 shrink-0 overflow-x-auto">
                        <div className="flex gap-2">
                        {activeTabs.map(mode => (
                            <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-1.5 rounded text-xs font-bold tracking-wide transition-all ${effectiveViewMode === mode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 border border-indigo-400/40' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}>{mode}</button>
                        ))}
                        </div>
                        <div className="hidden lg:flex items-center gap-1 text-[10px] font-bold">
                            {(['FOCUS', 'BALANCED', 'OVERVIEW'] as const).map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => setAndPersistLayoutPreset(preset)}
                                    className={`px-2 py-1 rounded border ${layoutPreset === preset ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50' : 'bg-slate-900 text-slate-500 border-slate-700'}`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                        {effectiveViewMode === "STRATEGY" && (
                            <ErrorBoundary fallbackLabel="Strategy">
                                <StrategyView
                                    strategyData={strategyData}
                                    sessionMode={sessionMode}
                                    currentLap={gameState.telemetry.laps}
                                    telemetry={gameState.telemetry}
                                    restApiData={gameState.restapi}
                                    drivers={gameState.drivers}
                                    onUpdateStint={updateStintConfig}
                                    onUpdateStintBulk={updateStintConfigBulk}
                                    onUpdateNote={(idx, val) => syncUpdate({ stintNotes: { ...gameState.stintNotes, [idx]: val } })}
                                />
                            </ErrorBoundary>
                        )}
                        {effectiveViewMode === "LIVE" && (
                            <ErrorBoundary fallbackLabel="Live Timing">
                                <div className="h-full p-0 overflow-hidden rounded-xl border border-white/5">
                                    <LiveTimingView
                                        telemetryData={gameState.telemetry}
                                        isHypercar={isHypercar}
                                        vehicles={gameState.allVehicles}
                                    />
                                </div>
                            </ErrorBoundary>
                        )}
                        {effectiveViewMode === "TELEMETRY" && (
                            <ErrorBoundary fallbackLabel="Telemetry">
                                <TelemetryView
                                    telemetryData={gameState.telemetry}
                                    isHypercar={isHypercar}
                                    isLMGT3={isLMGT3}
                                    position={gameState.position}
                                    avgLapTimeSeconds={gameState.avgLapTimeSeconds}
                                    weather={gameState.weather}
                                    airTemp={gameState.airTemp}
                                    trackTemp={gameState.trackTemp}
                                    trackWetness={gameState.trackWetness}
                                    trackGripLevel={gameState.trackGripLevel}
                                    weatherForecast={gameState.weatherForecast}
                                    targetFuelCons={strategyData.targetFuelCons}
                                    targetVECons={strategyData.targetVECons}
                                    onSetFuelTarget={setManualFuelTarget}
                                    onSetVETarget={setManualVETarget}
                                />
                            </ErrorBoundary>
                        )}
                        {effectiveViewMode === "RACE CTRL" && (
                            <ErrorBoundary fallbackLabel="Race Control">
                                <RaceControlView
                                    trackName={gameState.trackName}
                                    sessionType={gameState.sessionType}
                                    weather={gameState.weather}
                                    scActive={gameState.scActive}
                                    yellowFlag={gameState.yellowFlag}
                                    trackWetness={(gameState.trackWetness as number) || 0}
                                    rainIntensity={gameState.rainIntensity}
                                    telemetryData={gameState.telemetry}
                                    allVehicles={gameState.allVehicles}
                                    restApiData={gameState.restapi}
                                    extendedPitLimit={gameState.extendedPitLimit}
                                />
                            </ErrorBoundary>
                        )}
                        {effectiveViewMode === "MAP" && (
                            <ErrorBoundary fallbackLabel="Map">
                                <MapView
                                    vehicles={gameState.allVehicles}
                                    savedMap={gameState.trackMap}
                                    trackName={gameState.trackName}
                                    trackLength={gameState.trackLength}
                                    onSaveMap={saveTrackMap}
                                />
                            </ErrorBoundary>
                        )}
                        {effectiveViewMode === "SETUPS" && (
                            <ErrorBoundary fallbackLabel="Setups">
                                <SetupManagerView
                                    setups={setups}
                                    loading={setupsLoading}
                                    error={setupsError}
                                    applyingSetupId={applyingSetupId}
                                    applyStatus={setupApplyStatus}
                                    onRefresh={fetchSetups}
                                    onApply={applySetup}
                                    lastTestedEndpoints={lastTestedEndpoints}
                                />
                            </ErrorBoundary>
                        )}
                        {effectiveViewMode === "ANALYSIS" && (
                            <ErrorBoundary fallbackLabel="Analysis">
                                <AnalysisView />
                            </ErrorBoundary>
                        )}
                        {effectiveViewMode === "CHAT" && (
                            <ErrorBoundary fallbackLabel="Chat">
                                <ChatView
                                    messages={gameState.chatMessages}
                                    username={username}
                                    setUsername={setUsername}
                                    chatInput={chatInput}
                                    setChatInput={setChatInput}
                                    onSendMessage={handleSendMessage}
                                />
                            </ErrorBoundary>
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showIncidentModal && (
                <IncidentModal
                    lap={gameState.telemetry.laps}
                    onClose={() => setShowIncidentModal(false)}
                    onSave={(text) => {
                        saveIncident(text);
                        setShowIncidentModal(false);
                    }}
                />
            )}
            {showSettings && (
                <SettingsModal
                    teamId={teamId}
                    gameState={gameState}
                    syncUpdate={syncUpdate}
                    onClose={() => setShowSettings(false)}
                    isHypercar={isHypercar}
                    isLMGT3={isLMGT3}
                    canManageLineup={canManageLineup}
                    canAccessAdmin={canAccessAdmin}
                    onAddDriver={addDriver}
                    onRemoveDriver={removeDriver}
                    onUpdateDriver={(id, field, val) => updateDriverInfo(id, field, val as string | number)}
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
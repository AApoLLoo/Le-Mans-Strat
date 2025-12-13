import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Database, Trash2, Settings, Check, ChevronDown, ChevronRight } from 'lucide-react';

// CONFIGURATION API
const API_BASE_URL = "https://api.racetelemetrybyfbt.com";

// --- DEFINITION DES CANAUX DE DONNEES ---
interface ChannelConfig {
    id: string;
    label: string;
    color: string;
    category: string;
    unit?: string;
    dataKey: string | ((data: any) => number);
    yAxisId: string;
    domain?: [number | string, number | string];
}

const WHEEL_NAMES = ['FL', 'FR', 'RL', 'RR'];
const WHEEL_COLORS = ['#3b82f6', '#ef4444', '#eab308', '#22c55e'];

const createWheelChannels = (key: string, labelBase: string, category: string, unit: string, domain: any = ['auto', 'auto']): ChannelConfig[] => {
    return WHEEL_NAMES.map((pos, idx) => ({
        id: `${key}_${idx}`,
        label: `${labelBase} ${pos}`,
        color: WHEEL_COLORS[idx],
        category,
        unit,
        dataKey: (d: any) => (d[key] && Array.isArray(d[key])) ? d[key][idx] : 0,
        yAxisId: key,
        domain
    }));
};

const ALL_CHANNELS: ChannelConfig[] = [
    // GENERAL
    { id: 's', label: 'Speed', color: '#ffffff', category: 'General', unit: 'km/h', dataKey: 's', yAxisId: 'speed' },
    { id: 'r', label: 'RPM', color: '#eab308', category: 'General', unit: 'rpm', dataKey: 'r', yAxisId: 'rpm' },
    { id: 'g', label: 'Gear', color: '#a855f7', category: 'General', unit: '', dataKey: 'g', yAxisId: 'gear', domain: [0, 9] },

    // INPUTS (FILTERED)
    { id: 't', label: 'Throttle', color: '#22c55e', category: 'Inputs', unit: '%', dataKey: 't', yAxisId: 'pct', domain: [0, 100] },
    { id: 'b', label: 'Brake', color: '#ef4444', category: 'Inputs', unit: '%', dataKey: 'b', yAxisId: 'pct', domain: [0, 100] },
    { id: 'w', label: 'Steering', color: '#f59e0b', category: 'Inputs', unit: 'rad', dataKey: 'w', yAxisId: 'steer' },

    // INPUTS (RAW / UNFILTERED)
    { id: 'ut', label: 'Raw Throttle', color: '#166534', category: 'Inputs (Raw)', unit: '%', dataKey: 'ut', yAxisId: 'pct', domain: [0, 100] },
    { id: 'ub', label: 'Raw Brake', color: '#991b1b', category: 'Inputs (Raw)', unit: '%', dataKey: 'ub', yAxisId: 'pct', domain: [0, 100] },
    { id: 'uc', label: 'Raw Clutch', color: '#2563eb', category: 'Inputs (Raw)', unit: '%', dataKey: 'uc', yAxisId: 'pct', domain: [0, 100] },

    // AERO
    { id: 'drag', label: 'Drag', color: '#6366f1', category: 'Aero', unit: 'N', dataKey: 'drag', yAxisId: 'force' },
    { id: 'df_f', label: 'Downforce Front', color: '#8b5cf6', category: 'Aero', unit: 'N', dataKey: 'df_f', yAxisId: 'force' },
    { id: 'df_r', label: 'Downforce Rear', color: '#d946ef', category: 'Aero', unit: 'N', dataKey: 'df_r', yAxisId: 'force' },

    // SUSPENSION
    ...createWheelChannels('susp_def', 'Susp. Def.', 'Suspension', 'm'),
    ...createWheelChannels('rh', 'Ride Height', 'Ride Height', 'm'),
    ...createWheelChannels('susp_f', 'Susp. Force', 'Suspension Force', 'N'),

    // TYRES
    ...createWheelChannels('t_temp_c', 'Tyre Temp (C)', 'Tyre Temps', '°C'),
    ...createWheelChannels('t_temp_i', 'Tyre Temp (I)', 'Tyre Temps', '°C'),
    ...createWheelChannels('t_load', 'Tyre Load', 'Tyre Load', 'N'),

    // BRAKES
    ...createWheelChannels('brk_tmp', 'Brake Temp', 'Brakes', '°C'),
    ...createWheelChannels('brk_prs', 'Brake Press.', 'Brakes', 'Bar'),

    // FORCES
    ...createWheelChannels('lat_f', 'Lateral Force', 'Forces', 'N'),
    ...createWheelChannels('long_f', 'Longit. Force', 'Forces', 'N'),
];

const CATEGORIES = Array.from(new Set(ALL_CHANNELS.map(c => c.category)));

interface TelemetrySession {
    session_id: string;
    date: string;
    driver_name: string;
    car_category?: string;
}

interface TelemetryLap {
    lap_number: number;
    lap_time: number;
    samples?: any[];
}

const DetailedAnalysis = () => {
    // STATE
    const [sessions, setSessions] = useState<TelemetrySession[]>([]);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [laps, setLaps] = useState<TelemetryLap[]>([]);
    const [selectedLap, setSelectedLap] = useState<TelemetryLap | null>(null);
    const [loading, setLoading] = useState(false);

    // GESTION CANAUX
    const [activeChannels, setActiveChannels] = useState<string[]>(['s', 'r', 'g', 't', 'b']);
    const [showConfig, setShowConfig] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['General', 'Inputs']);

    // API Calls
    const fetchSessions = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/sessions`);
            if (res.ok) setSessions(await res.json());
        } catch (err) { console.error(err); }
    };
    useEffect(() => { fetchSessions(); }, []);

    const handleSelectSession = async (sessionId: string) => {
        if (!sessionId) { setSelectedSession(null); setLaps([]); return; }
        setSelectedSession(sessionId);
        setLoading(true);
        setSelectedLap(null);
        setLaps([]);
        try {
            const encodedId = encodeURIComponent(sessionId);
            console.log(`Fetching laps for: ${sessionId} (URL encoded: ${encodedId})`);
            const res = await fetch(`${API_BASE_URL}/api/analysis/sessions/${encodedId}/laps`);
            if (res.ok) {
                const data = await res.json();
                console.log(`Laps received:`, data.length); // Vérifie si on reçoit des données

                // Tri des tours
                setLaps(data.sort((a: any, b: any) => a.lap_number - b.lap_number));
            } else {
                // Affiche l'erreur si le serveur répond 404, 500, etc.
                console.error("Erreur serveur:", res.status, res.statusText);
                alert(`Erreur chargement tours: ${res.status} ${res.statusText}`);
            }
        } catch (error) {
            console.error("Erreur réseau:", error);
            alert("Erreur de connexion au serveur.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectLap = async (lapNumber: number) => {
        if (!selectedSession) return;
        setLoading(true);
        try {
            const encodedId = encodeURIComponent(selectedSession);
            const res = await fetch(`${API_BASE_URL}/api/telemetry/${encodedId}/${lapNumber}`);
            if (!res.ok) throw new Error();
            const rawSamples = await res.json();
            const cleanSamples = Array.isArray(rawSamples) ? rawSamples.sort((a: any, b: any) => a.d - b.d).filter((s, i) => i === 0 || s.d >= 0) : [];
            const lapInfo = laps.find(l => l.lap_number === lapNumber);
            setSelectedLap({ lap_number: lapNumber, lap_time: lapInfo?.lap_time || 0, samples: cleanSamples });
        } catch (err) { alert("Erreur chargement tour"); } finally { setLoading(false); }
    };

    const handleDeleteSession = async () => {
        if (!selectedSession || !confirm("Supprimer ?")) return;
        await fetch(`${API_BASE_URL}/api/analysis/sessions/${selectedSession}`, { method: 'DELETE' });
        setSessions(prev => prev.filter(s => s.session_id !== selectedSession));
        setSelectedSession(null); setLaps([]); setSelectedLap(null);
    };

    // --- LOGIQUE D'AFFICHAGE MULTI-GRAPHE ---
    const activeCategories = useMemo(() => {
        const activeCats = new Set<string>();
        ALL_CHANNELS.forEach(c => {
            if (activeChannels.includes(c.id)) activeCats.add(c.category);
        });
        return CATEGORIES.filter(cat => activeCats.has(cat));
    }, [activeChannels]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900/95 border border-slate-700 p-2 rounded shadow-xl text-xs z-50 backdrop-blur-md">
                    <p className="font-bold text-slate-300 mb-1 border-b border-slate-700 pb-1">Dist: {Number(label).toFixed(0)}m</p>
                    <div className="flex flex-col gap-1">
                        {payload.map((p: any) => {
                            const conf = ALL_CHANNELS.find(c => c.id === p.dataKey || c.label === p.name);
                            return (
                                <div key={p.name} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                    <span className="text-slate-400">{p.name}:</span>
                                    <span className="font-mono font-bold text-white">
                                        {Number(p.value).toFixed(2)} {conf?.unit}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    const toggleChannel = (id: string) => {
        setActiveChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };
    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    };

    // --- LOGIQUE FORMATAGE TEMPS ---
    const formatTime = (seconds: number) => {
        if (!seconds || seconds <= 0) return "OUT";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
        return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    // Trouver le meilleur temps (pour surligner en rose)
    const bestLapTime = useMemo(() => {
        const validTimes = laps.map(l => l.lap_time).filter(t => t > 0);
        return validTimes.length > 0 ? Math.min(...validTimes) : null;
    }, [laps]);

    return (
        <div className="h-full flex flex-col bg-[#0b0f19] text-white overflow-hidden relative">

            {/* HEADER */}
            <div className="h-16 border-b border-white/10 flex items-center px-4 gap-4 bg-slate-900 shrink-0 shadow-sm z-20">
                <Database size={20} className="text-indigo-400" />
                <select
                    className="bg-slate-800 border border-slate-700 rounded p-2 text-xs w-64 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    onChange={(e) => handleSelectSession(e.target.value)}
                    value={selectedSession || ""}
                >
                    <option value="">-- Choisir une session --</option>
                    {sessions.map(s => <option key={s.session_id} value={s.session_id}>{new Date(s.date).toLocaleDateString()} - {s.driver_name} - {s.session_id}</option>)}
                </select>

                {selectedSession && (
                    <button onClick={handleDeleteSession} className="p-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded">
                        <Trash2 size={16} />
                    </button>
                )}

                {selectedSession && (
                    <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                        <select
                            className="bg-slate-800 border border-slate-700 rounded p-2 text-xs w-48 text-white font-mono"
                            onChange={(e) => handleSelectLap(Number(e.target.value))}
                            disabled={loading}
                            value={selectedLap?.lap_number || ""}
                        >
                            <option value="" disabled>-- Tour --</option>
                            {laps.map(l => {
                                const isBest = bestLapTime !== null && Math.abs(l.lap_time - bestLapTime) < 0.001;
                                return (
                                    <option
                                        key={l.lap_number}
                                        value={l.lap_number}
                                        style={isBest ? { color: '#d946ef', fontWeight: 'bold' } : {}}
                                    >
                                        Tour {l.lap_number} - {formatTime(l.lap_time)} {isBest ? '★' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}

                <div className="flex-1" />
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors ${showConfig ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                    <Settings size={14} />
                    CANAUX ({activeChannels.length})
                </button>
            </div>

            {/* CONTENU */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* ZONE GRAPHIQUES (SCROLLABLE) */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0b0f19] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {!selectedLap ? (
                        <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-4">
                            <Database size={48} opacity={0.5} />
                            <p>Sélectionnez une session et un tour</p>
                        </div>
                    ) : (
                        <div className="flex flex-col min-h-full pb-10">
                            {/* BOUCLE SUR LES CATEGORIES ACTIVES */}
                            {activeCategories.map((category, index) => {
                                const channels = ALL_CHANNELS.filter(c => c.category === category && activeChannels.includes(c.id));
                                if (channels.length === 0) return null;

                                return (
                                    <div key={category} className="h-64 border-b border-white/5 relative group shrink-0">
                                        <div className="absolute top-2 left-14 z-10">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-900/50 px-2 py-0.5 rounded border border-white/5">
                                                {category}
                                            </span>
                                        </div>

                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart
                                                data={selectedLap.samples}
                                                syncId="motec"
                                                margin={{top: 10, right: 10, left: 0, bottom: 0}}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                                                <XAxis dataKey="d" type="number" unit="m" hide={index !== activeCategories.length - 1} stroke="#64748b" tick={{fontSize: 10}} />
                                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'white', strokeWidth: 1 }} isAnimationActive={false} />
                                                <Legend verticalAlign="top" align="right" height={24} iconType="circle" iconSize={6} wrapperStyle={{fontSize: '10px', paddingTop: '5px', paddingRight: '10px'}} />

                                                {channels.reduce((acc: string[], curr) => acc.includes(curr.yAxisId) ? acc : [...acc, curr.yAxisId], []).map(axisId => {
                                                    const conf = ALL_CHANNELS.find(c => c.yAxisId === axisId);
                                                    return <YAxis key={axisId} yAxisId={axisId} hide domain={conf?.domain || ['auto', 'auto']} />;
                                                })}

                                                {channels.map(channel => (
                                                    <Line
                                                        key={channel.id}
                                                        yAxisId={channel.yAxisId}
                                                        type="monotone"
                                                        dataKey={channel.dataKey}
                                                        name={channel.label}
                                                        stroke={channel.color}
                                                        dot={false}
                                                        strokeWidth={1.5}
                                                        isAnimationActive={false}
                                                    />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* PANNEAU CONFIGURATION */}
                {showConfig && (
                    <div className="w-80 bg-slate-900 border-l border-white/10 overflow-y-auto flex flex-col shadow-2xl z-30 animate-in slide-in-from-right duration-200">
                        <div className="p-4 border-b border-white/10 bg-slate-950 sticky top-0 z-10 flex justify-between items-center">
                            <span className="font-bold text-sm text-white">Canaux</span>
                            <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <div className="p-2 space-y-2">
                            {CATEGORIES.map(cat => {
                                const isExpanded = expandedCategories.includes(cat);
                                const channels = ALL_CHANNELS.filter(c => c.category === cat);
                                const activeCount = channels.filter(c => activeChannels.includes(c.id)).length;

                                return (
                                    <div key={cat} className="border border-slate-800 rounded bg-slate-900/50 overflow-hidden">
                                        <button
                                            onClick={() => toggleCategory(cat)}
                                            className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-2">
                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                <span className="text-xs font-bold text-slate-200">{cat}</span>
                                            </div>
                                            <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400">
                                                {activeCount}/{channels.length}
                                            </span>
                                        </button>

                                        {isExpanded && (
                                            <div className="p-2 grid grid-cols-1 gap-1 bg-slate-950/30">
                                                {channels.map(channel => {
                                                    const isActive = activeChannels.includes(channel.id);
                                                    return (
                                                        <button
                                                            key={channel.id}
                                                            onClick={() => toggleChannel(channel.id)}
                                                            className={`flex items-center gap-3 p-2 rounded text-xs transition-all ${isActive ? 'bg-indigo-500/10 border border-indigo-500/30' : 'hover:bg-slate-800 border border-transparent'}`}
                                                        >
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isActive ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                                                                {isActive && <Check size={10} className="text-white" />}
                                                            </div>
                                                            <span className={`truncate font-medium ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                                {channel.label}
                                                            </span>
                                                            {isActive && <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: channel.color }} />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailedAnalysis;
import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceArea } from 'recharts';
import { Database, Trash2, Settings, Check, ChevronDown, ChevronRight } from 'lucide-react';

import { API_BASE_URL } from '../../constants';

// --- DEFINITION DES CANAUX DE DONNEES ---
interface ChannelConfig {
    id: string;
    label: string;
    color: string;
    category: string;
    unit?: string;
    // eslint-disable-next-line no-unused-vars
    dataKey: string | ((...args: any[]) => number);
    yAxisId: string;
    domain?: [number | string, number | string];
}

type DomainTuple = [number | string, number | string];

const WHEEL_NAMES = ['FL', 'FR', 'RL', 'RR'];
const WHEEL_COLORS = ['#3b82f6', '#ef4444', '#eab308', '#22c55e'];

const readWheelValue = (sample: any, keys: string[], idx: number) => {
    for (const key of keys) {
        const arr = sample?.[key];
        if (Array.isArray(arr) && arr[idx] !== undefined && arr[idx] !== null) {
            const val = Number(arr[idx]);
            if (Number.isFinite(val)) return val;
        }
    }
    return 0;
};

const createWheelChannels = (key: string, labelBase: string, category: string, unit: string, domain: DomainTuple = ['auto', 'auto']): ChannelConfig[] => {
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

    // DAMAGE / HEALTH
    ...WHEEL_NAMES.map((pos, idx) => ({
        id: `susp_dmg_${idx}`,
        label: `Susp. Damage ${pos}`,
        color: WHEEL_COLORS[idx],
        category: 'Damage',
        unit: '',
        dataKey: (d: any) => readWheelValue(d, ['suspension_damage', 'susp_dmg', 'susp_damage'], idx),
        yAxisId: 'damage',
        domain: [0, 'auto'] as DomainTuple
    })),
    ...WHEEL_NAMES.map((pos, idx) => ({
        id: `wheel_detached_${idx}`,
        label: `Wheel Detached ${pos}`,
        color: WHEEL_COLORS[idx],
        category: 'Damage',
        unit: '',
        dataKey: (d: any) => {
            const byWheel = d?.vehicle_health?.by_wheel;
            const key = ['fl', 'fr', 'rl', 'rr'][idx];
            const detached = Boolean(byWheel?.[key]?.detached ?? readWheelValue(d, ['wheel_detached', 'detached_wheels'], idx));
            return detached ? 1 : 0;
        },
        yAxisId: 'bool',
        domain: [0, 1] as DomainTuple
    }))
];

const CATEGORIES = Array.from(new Set(ALL_CHANNELS.map(c => c.category)));
const DAMAGE_BASIC_CHANNELS = ['susp_dmg_0', 'susp_dmg_1', 'susp_dmg_2', 'susp_dmg_3'];
const DAMAGE_FULL_CHANNELS = [
    ...DAMAGE_BASIC_CHANNELS,
    'wheel_detached_0',
    'wheel_detached_1',
    'wheel_detached_2',
    'wheel_detached_3'
];

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
    session_id?: string;
    slot_index?: number;
}

interface ComparisonSlot {
    sessionId: string;
    lapNumber: number | null;
}


const DetailedAnalysis = () => {
    // STATE
    const [sessions, setSessions] = useState<TelemetrySession[]>([]);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [laps, setLaps] = useState<TelemetryLap[]>([]);
    const [selectedLaps, setSelectedLaps] = useState<TelemetryLap[]>([]);
    const [selectedLap, setSelectedLap] = useState<TelemetryLap | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [comparisonMode, setComparisonMode] = useState(false);
    const [lapsBySession, setLapsBySession] = useState<Record<string, TelemetryLap[]>>({});
    const [comparisonSlots, setComparisonSlots] = useState<ComparisonSlot[]>([
        { sessionId: '', lapNumber: null },
        { sessionId: '', lapNumber: null }
    ]);
    const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
    const [dragStartX, setDragStartX] = useState<number | null>(null);
    const [dragEndX, setDragEndX] = useState<number | null>(null);

    // GESTION CANAUX
    const [activeChannels, setActiveChannels] = useState<string[]>(['s', 'r', 'g', 't', 'b']);
    const [showConfig, setShowConfig] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['General', 'Inputs']);

    // API Calls
    const fetchSessions = async () => {
        setFetchError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/sessions`);
            if (res.ok) {
                setSessions(await res.json());
            } else {
                setFetchError(`Server returned ${res.status}`);
            }
        } catch (err) {
            console.error(err);
            setFetchError("Cannot connect to analysis server");
        }
    };
    useEffect(() => { fetchSessions(); }, []);

    const fetchLapsForSession = async (sessionId: string): Promise<TelemetryLap[]> => {
        if (!sessionId) return [];
        if (lapsBySession[sessionId]) return lapsBySession[sessionId];

        try {
            const encodedId = encodeURIComponent(sessionId);
            const res = await fetch(`${API_BASE_URL}/api/analysis/sessions/${encodedId}/laps`);
            if (res.ok) {
                const data = await res.json();
                const sortedLaps = data.sort((a: any, b: any) => a.lap_number - b.lap_number);
                setLapsBySession(prev => ({ ...prev, [sessionId]: sortedLaps }));
                return sortedLaps;
            } else {
                console.error("Erreur serveur:", res.status, res.statusText);
                alert(`Erreur chargement tours: ${res.status} ${res.statusText}`);
                return [];
            }
        } catch (error) {
            console.error("Erreur réseau:", error);
            alert("Erreur de connexion au serveur.");
            return [];
        }
    };

    const handleSelectSession = async (sessionId: string) => {
        if (!sessionId) {
            setSelectedSession(null);
            setLaps([]);
            setSelectedLaps([]);
            setSelectedLap(null);
            return;
        }

        setSelectedSession(sessionId);
        setLoading(true);
        setSelectedLap(null);
        setSelectedLaps([]);
        setLaps([]);
        try {
            const loadedLaps = await fetchLapsForSession(sessionId);
            setLaps(loadedLaps);
        } finally {
            setLoading(false);
        }
    };

    const loadLapData = async (sessionId: string, lapNumber: number): Promise<TelemetryLap | null> => {
        if (!sessionId) return null;
        try {
            const encodedId = encodeURIComponent(sessionId);
            const res = await fetch(`${API_BASE_URL}/api/telemetry/${encodedId}/${lapNumber}`);
            if (!res.ok) return null;
            const rawSamples = await res.json();
            const cleanSamples = Array.isArray(rawSamples) ? rawSamples.sort((a: any, b: any) => a.d - b.d).filter((s, i) => i === 0 || s.d >= 0) : [];
            const sourceLaps = lapsBySession[sessionId] || (selectedSession === sessionId ? laps : []);
            const lapInfo = sourceLaps.find(l => l.lap_number === lapNumber);
            return { lap_number: lapNumber, lap_time: lapInfo?.lap_time || 0, samples: cleanSamples, session_id: sessionId };
        } catch (err) {
            console.error("Erreur chargement lap:", err);
            return null;
        }
    };

    const handleSelectLap = async (lapNumber: number) => {
        if (!selectedSession) return;
        setLoading(true);
        try {
            const lapData = await loadLapData(selectedSession, lapNumber);
            if (lapData) {
                setSelectedLap(lapData);
                setComparisonMode(false);
                setSelectedLaps([lapData]);
            }
        } catch {
            alert("Erreur chargement tour");
        } finally {
            setLoading(false);
        }
    };


    const handleDeleteSession = async () => {
        if (!selectedSession || !confirm("Supprimer ?")) return;
        await fetch(`${API_BASE_URL}/api/analysis/sessions/${encodeURIComponent(selectedSession)}`, { method: 'DELETE' });
        setSessions(prev => prev.filter(s => s.session_id !== selectedSession));
        setLapsBySession(prev => {
            const next = { ...prev };
            delete next[selectedSession];
            return next;
        });
        setSelectedSession(null); setLaps([]); setSelectedLap(null); setSelectedLaps([]);
    };

    // --- LOGIQUE D'AFFICHAGE MULTI-GRAPHE ---
    const activeCategories = useMemo(() => {
        const activeCats = new Set<string>();
        ALL_CHANNELS.forEach(c => {
            if (activeChannels.includes(c.id)) activeCats.add(c.category);
        });
        return CATEGORIES.filter(cat => activeCats.has(cat));
    }, [activeChannels]);

    const chartLaps = useMemo(() => {
        if (!comparisonMode) return selectedLap ? [selectedLap] : [];
        return selectedLaps.filter(l => !!l.samples?.length).slice(0, 2);
    }, [comparisonMode, selectedLap, selectedLaps]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900/95 border border-slate-700 p-2 rounded shadow-xl text-xs z-50 backdrop-blur-md">
                    <p className="font-bold text-slate-300 mb-1 border-b border-slate-700 pb-1">Dist: {Number(label).toFixed(0)}m</p>
                    <div className="flex flex-col gap-1">
                        {payload.map((p: any) => {
                            const rawName = String(p.name || '').split(' (')[0];
                            const conf = ALL_CHANNELS.find(c => c.id === p.dataKey || c.label === rawName);
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

    const applyDamagePreset = (mode: 'basic' | 'full') => {
        const selected = mode === 'basic' ? DAMAGE_BASIC_CHANNELS : DAMAGE_FULL_CHANNELS;
        setActiveChannels(prev => Array.from(new Set([...prev, ...selected])));
        setExpandedCategories(prev => prev.includes('Damage') ? prev : [...prev, 'Damage']);
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

    // Domaine X basé sur la distance max réelle des tours affichés
    const xDomain = useMemo<[number, number]>(() => {
        if (!chartLaps.length) return [0, 6000];
        const maxD = Math.max(...chartLaps.flatMap(l => (l.samples || []).map((s: any) => s.d ?? 0)));
        return [0, Math.ceil(maxD / 100) * 100];
    }, [chartLaps]);

    const activeXDomain = zoomDomain || xDomain;

    const detachedAlert = useMemo(() => {
        const allSamples = chartLaps.flatMap(l => l.samples || []);
        return allSamples.some((s: any) => {
            const byWheel = s?.vehicle_health?.by_wheel;
            if (byWheel) {
                return ['fl', 'fr', 'rl', 'rr'].some((k) => Boolean(byWheel?.[k]?.detached));
            }
            return [0, 1, 2, 3].some((idx) => readWheelValue(s, ['wheel_detached', 'detached_wheels'], idx) > 0);
        });
    }, [chartLaps]);

    useEffect(() => {
        setZoomDomain(null);
        setDragStartX(null);
        setDragEndX(null);
    }, [selectedSession, selectedLap?.lap_number, comparisonMode, chartLaps.length]);

    const getSessionShortLabel = (sessionId?: string) => {
        if (!sessionId) return 'Session';
        const session = sessions.find(s => s.session_id === sessionId);
        if (!session) return sessionId;
        return `${new Date(session.date).toLocaleDateString()} - ${session.driver_name}`;
    };

    const handleChartMouseDown = (state: any) => {
        if (state?.activeLabel === undefined || state?.activeLabel === null) return;
        const x = Number(state.activeLabel);
        if (Number.isNaN(x)) return;
        setDragStartX(x);
        setDragEndX(x);
    };

    const handleChartMouseMove = (state: any) => {
        if (dragStartX === null) return;
        if (state?.activeLabel === undefined || state?.activeLabel === null) return;
        const x = Number(state.activeLabel);
        if (Number.isNaN(x)) return;
        setDragEndX(x);
    };

    const handleChartMouseUp = () => {
        if (dragStartX === null || dragEndX === null) return;
        const left = Math.min(dragStartX, dragEndX);
        const right = Math.max(dragStartX, dragEndX);
        if (right - left > 25) {
            setZoomDomain([left, right]);
        }
        setDragStartX(null);
        setDragEndX(null);
    };

    const resetZoom = () => {
        setZoomDomain(null);
        setDragStartX(null);
        setDragEndX(null);
    };

    const updateComparisonSlot = async (index: number, patch: Partial<ComparisonSlot>) => {
        const current = comparisonSlots[index];
        const nextSlot = { ...current, ...patch };

        // Reset lap when session changes
        if (patch.sessionId !== undefined && patch.sessionId !== current.sessionId) {
            nextSlot.lapNumber = null;
        }

        const nextSlots = [...comparisonSlots];
        nextSlots[index] = nextSlot;
        setComparisonSlots(nextSlots);

        if (nextSlot.sessionId) {
            await fetchLapsForSession(nextSlot.sessionId);
        }

        if (nextSlot.sessionId && nextSlot.lapNumber !== null) {
            setLoading(true);
            try {
                const loadedLap = await loadLapData(nextSlot.sessionId, nextSlot.lapNumber);
                if (!loadedLap) return;
                setSelectedLaps(prev => {
                    const others = prev.filter(l => l.slot_index !== index);
                    const next = [...others, { ...loadedLap, slot_index: index }];
                    return next.sort((a, b) => (a.slot_index ?? 0) - (b.slot_index ?? 0)).slice(0, 2);
                });
            } finally {
                setLoading(false);
            }
            return;
        }

        setSelectedLaps(prev => prev.filter(l => l.slot_index !== index));
    };

    return (
        <div className="h-full flex flex-col text-white overflow-hidden relative">

            {/* HEADER */}
            <div className="min-h-16 border-b border-white/10 flex items-center px-4 py-2 gap-4 fbt-panel shrink-0 shadow-sm z-20">
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
                        {!comparisonMode ? (
                            <>
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
                                <button
                                    onClick={() => {
                                        if (selectedLap) {
                                            setComparisonSlots([
                                                { sessionId: selectedSession, lapNumber: selectedLap.lap_number },
                                                { sessionId: '', lapNumber: null }
                                            ]);
                                            setSelectedLaps([{ ...selectedLap, session_id: selectedSession, slot_index: 0 }]);
                                            setComparisonMode(true);
                                        }
                                    }}
                                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-bold text-white transition-colors"
                                >
                                    Comparer
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                {comparisonSlots.map((slot, idx) => {
                                    const lapsForSlot = slot.sessionId ? (lapsBySession[slot.sessionId] || []) : [];
                                    return (
                                        <div key={idx} className="flex items-center gap-2 bg-slate-800/40 border border-slate-700 rounded px-2 py-1">
                                            <span className="text-[10px] uppercase text-slate-400 w-6">L{idx + 1}</span>
                                            <select
                                                className="bg-slate-800 border border-slate-700 rounded p-1 text-xs w-56 text-white"
                                                value={slot.sessionId}
                                                onChange={(e) => updateComparisonSlot(idx, { sessionId: e.target.value })}
                                                disabled={loading}
                                            >
                                                <option value="">Session</option>
                                                {sessions.map(s => (
                                                    <option key={`slot-${idx}-${s.session_id}`} value={s.session_id}>
                                                        {new Date(s.date).toLocaleDateString()} - {s.driver_name}
                                                    </option>
                                                ))}
                                            </select>
                                            <select
                                                className="bg-slate-800 border border-slate-700 rounded p-1 text-xs w-36 text-white font-mono"
                                                value={slot.lapNumber ?? ''}
                                                onChange={(e) => updateComparisonSlot(idx, { lapNumber: e.target.value ? Number(e.target.value) : null })}
                                                disabled={loading || !slot.sessionId}
                                            >
                                                <option value="">Tour</option>
                                                {lapsForSlot.map(l => (
                                                    <option key={`slot-lap-${idx}-${l.lap_number}`} value={l.lap_number}>
                                                        L{l.lap_number} - {formatTime(l.lap_time)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {comparisonMode && (
                            <button
                                onClick={() => {
                                    setComparisonMode(false);
                                    if (selectedLaps.length > 0) {
                                        setSelectedLap(selectedLaps[0]);
                                    }
                                }}
                                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold text-white transition-colors"
                            >
                                Retour
                            </button>
                        )}
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
                <button
                    onClick={() => applyDamagePreset('basic')}
                    className="px-3 py-2 rounded text-xs font-bold fbt-badge hover:bg-amber-800/30"
                >
                    Damage Basic
                </button>
                <button
                    onClick={() => applyDamagePreset('full')}
                    className="px-3 py-2 rounded text-xs font-bold bg-red-900/30 text-red-300 border border-red-600/30 hover:bg-red-800/40"
                >
                    Damage Full
                </button>
                {detachedAlert && (
                    <div className="px-3 py-2 rounded text-xs font-black bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                        WHEEL DETACHED DETECTED
                    </div>
                )}
                {zoomDomain && (
                    <button
                        onClick={resetZoom}
                        className="px-3 py-2 rounded text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                    >
                        Reset zoom
                    </button>
                )}
            </div>

            {/* CONTENU */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* ZONE GRAPHIQUES (SCROLLABLE) */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {comparisonMode ? (
                        // MODE COMPARAISON
                        !chartLaps.length ? (
                            <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-4">
                                <Database size={48} opacity={0.5} />
                                <p>Sélectionnez des tours à comparer</p>
                            </div>
                        ) : (
                            <div className="flex flex-col min-h-full pb-10">
                                {/* GRAPHIQUES COMPARATIFS */}
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
                                                    syncId="motec"
                                                    margin={{top: 10, right: 10, left: 0, bottom: 0}}
                                                    onMouseDown={handleChartMouseDown}
                                                    onMouseMove={handleChartMouseMove}
                                                    onMouseUp={handleChartMouseUp}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                                                    <XAxis dataKey="d" type="number" domain={activeXDomain} unit="m" stroke="#64748b" tick={{fontSize: 10}} hide={index !== activeCategories.length - 1} />
                                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'white', strokeWidth: 1 }} isAnimationActive={false} />
                                                    <Legend verticalAlign="top" align="right" height={24} iconType="circle" iconSize={6} wrapperStyle={{fontSize: '10px', paddingTop: '5px', paddingRight: '10px'}} />

                                                    {dragStartX !== null && dragEndX !== null && (
                                                        <ReferenceArea
                                                            x1={Math.min(dragStartX, dragEndX)}
                                                            x2={Math.max(dragStartX, dragEndX)}
                                                            fill="#6366f1"
                                                            fillOpacity={0.12}
                                                            strokeOpacity={0}
                                                        />
                                                    )}

                                                    {channels.reduce((acc: string[], curr) => acc.includes(curr.yAxisId) ? acc : [...acc, curr.yAxisId], []).map(axisId => {
                                                        const conf = ALL_CHANNELS.find(c => c.yAxisId === axisId);
                                                        return <YAxis key={axisId} yAxisId={axisId} hide domain={conf?.domain || ['auto', 'auto']} />;
                                                    })}

                                                    {chartLaps.map((lap, lapIdx) => {
                                                        const slotLabel = lap.slot_index === 0 ? 'Ref' : 'Cmp';
                                                        const lapLabel = `${slotLabel} L${lap.lap_number} - ${getSessionShortLabel(lap.session_id)}`;
                                                        return channels.map(channel => (
                                                            <Line
                                                                key={`${lap.session_id || 'session'}_${lap.lap_number}_${channel.id}`}
                                                                yAxisId={channel.yAxisId}
                                                                type="monotone"
                                                                data={lap.samples}
                                                                dataKey={channel.dataKey}
                                                                name={`${channel.label} (${lapLabel})`}
                                                                stroke={channel.color}
                                                                dot={false}
                                                                strokeWidth={1.5}
                                                                isAnimationActive={false}
                                                                strokeDasharray={lapIdx === 1 ? '6 4' : undefined}
                                                                strokeOpacity={lapIdx === 1 ? 0.85 : 1}
                                                            />
                                                        ));
                                                    })}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        // MODE SIMPLE (UN SEUL LAP)
                        !selectedLap ? (
                            <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-4">
                                <Database size={48} opacity={0.5} />
                                {fetchError ? (
                                    <>
                                        <p className="text-red-400 text-sm">{fetchError}</p>
                                        <button onClick={fetchSessions} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-slate-300 transition-colors">
                                            Retry
                                        </button>
                                    </>
                                ) : (
                                    <p>Sélectionnez une session et un tour</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col min-h-full pb-10">
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
                                                    onMouseDown={handleChartMouseDown}
                                                    onMouseMove={handleChartMouseMove}
                                                    onMouseUp={handleChartMouseUp}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                                                    <XAxis dataKey="d" type="number" unit="m" domain={activeXDomain} hide={index !== activeCategories.length - 1} stroke="#64748b" tick={{fontSize: 10}} />
                                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'white', strokeWidth: 1 }} isAnimationActive={false} />
                                                    <Legend verticalAlign="top" align="right" height={24} iconType="circle" iconSize={6} wrapperStyle={{fontSize: '10px', paddingTop: '5px', paddingRight: '10px'}} />

                                                    {dragStartX !== null && dragEndX !== null && (
                                                        <ReferenceArea
                                                            x1={Math.min(dragStartX, dragEndX)}
                                                            x2={Math.max(dragStartX, dragEndX)}
                                                            fill="#6366f1"
                                                            fillOpacity={0.12}
                                                            strokeOpacity={0}
                                                        />
                                                    )}

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
                        )
                    )}
                </div>

                {/* PANNEAU CONFIGURATION */}
                {showConfig && (
                    <div className="w-80 fbt-panel border-l border-white/10 overflow-y-auto flex flex-col shadow-2xl z-30 animate-in slide-in-from-right duration-200">
                        <div className="p-4 border-b border-white/10 bg-slate-950/90 sticky top-0 z-10 flex justify-between items-center">
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
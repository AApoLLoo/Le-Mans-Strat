import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { Database } from 'lucide-react';

// --- CONFIGURATION API VPS ---
// On utilise l'URL du VPS définie dans votre useRaceData
const API_BASE_URL = "http://51.178.87.25:5000";

// Types
interface TelemetrySession {
    id: string;
    created_at: string;
    track_name: string;
    driver_name: string;
    team_id: string;
}

interface TelemetryLap {
    id: string;
    lap_number: number;
    lap_time: number;
    samples: { d: number, s: number, t: number, b: number, r: number, g: number, w: number }[];
}

const DetailedAnalysis = () => {
    const [sessions, setSessions] = useState<TelemetrySession[]>([]);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [laps, setLaps] = useState<TelemetryLap[]>([]);
    const [selectedLap, setSelectedLap] = useState<TelemetryLap | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Charger la liste des sessions depuis le VPS
    useEffect(() => {
        const fetchSessions = async () => {
            try {
                // Adaptez cette route si votre backend utilise un chemin différent
                const res = await fetch(`${API_BASE_URL}/api/history/sessions`);
                if (!res.ok) throw new Error("Erreur chargement sessions");
                const data = await res.json();
                setSessions(data);
            } catch (err) {
                console.error("Erreur API:", err);
                setError("Impossible de charger les sessions (VPS non joignable ?)");
            }
        };
        fetchSessions();
    }, []);

    // 2. Quand une session est choisie, charger les tours depuis le VPS
    const handleSelectSession = async (sessionId: string) => {
        setSelectedSession(sessionId);
        setLoading(true);
        setSelectedLap(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/history/sessions/${sessionId}/laps`);
            if (!res.ok) throw new Error("Erreur chargement tours");
            const data = await res.json();
            // Tri par numéro de tour
            setLaps(data.sort((a: any, b: any) => a.lap_number - b.lap_number));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Tooltip personnalisé pour afficher les valeurs précises
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl text-xs">
                    <p className="font-bold text-slate-300 mb-1">Dist: {label}m</p>
                    {payload.map((p: any) => (
                        <p key={p.name} style={{ color: p.color }}>
                            {p.name}: {p.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-full flex flex-col bg-[#0b0f19] text-white overflow-hidden">
            {/* --- HEADER SELECTEUR --- */}
            <div className="h-16 border-b border-white/10 flex items-center px-4 gap-4 bg-slate-900">
                <Database size={20} className="text-indigo-400" />

                {/* Selecteur Session */}
                <select
                    className="bg-slate-800 border border-slate-700 rounded p-2 text-xs w-64 text-white"
                    onChange={(e) => handleSelectSession(e.target.value)}
                >
                    <option value="">-- Choisir une session --</option>
                    {sessions.map(s => (
                        <option key={s.id} value={s.id}>
                            {new Date(s.created_at).toLocaleDateString()} - {s.track_name} ({s.driver_name})
                        </option>
                    ))}
                </select>

                {/* Selecteur Tour */}
                {selectedSession && (
                    <select
                        className="bg-slate-800 border border-slate-700 rounded p-2 text-xs w-32 text-white"
                        onChange={(e) => {
                            const lap = laps.find(l => l.id === e.target.value);
                            setSelectedLap(lap || null);
                        }}
                        disabled={loading}
                    >
                        <option value="">-- Tour --</option>
                        {laps.map(l => (
                            <option key={l.id} value={l.id}>Tour {l.lap_number}</option>
                        ))}
                    </select>
                )}

                {error && <span className="text-red-500 text-xs">{error}</span>}
                {loading && <span className="text-yellow-500 text-xs animate-pulse">Chargement...</span>}
            </div>

            {/* --- ZONE GRAPHIQUE --- */}
            <div className="flex-1 p-4 overflow-y-auto">
                {!selectedLap ? (
                    <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-2">
                        <Database size={48} opacity={0.2} />
                        <p>Sélectionnez une session et un tour pour afficher la télémétrie</p>
                        <p className="text-xs text-slate-600">Source: VPS OVH ({API_BASE_URL})</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 h-full">
                        {/* GRAPHIQUE 1 : VITESSE & RPM & GEAR */}
                        <div className="h-64 bg-slate-900/50 border border-white/5 rounded-lg p-2 flex flex-col relative group">
                            <div className="absolute top-2 left-14 z-10 flex gap-4 text-[10px] font-bold bg-slate-900/80 p-1 rounded backdrop-blur-sm border border-white/10">
                                <span className="text-blue-400">SPEED</span>
                                <span className="text-yellow-500">RPM</span>
                                <span className="text-purple-400">GEAR</span>
                            </div>

                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={selectedLap.samples} syncId="motec" margin={{top: 20, right: 10, left: -20, bottom: 0}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                    <XAxis dataKey="d" type="number" hide />

                                    {/* AXES Y SÉPARÉS */}
                                    <YAxis yAxisId="left" domain={[0, 'auto']} hide />
                                    <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} hide />
                                    <YAxis yAxisId="gear" domain={[0, 8]} hide />

                                    <Tooltip content={<CustomTooltip />} />

                                    <Line yAxisId="left" type="monotone" dataKey="s" name="Speed" stroke="#3b82f6" dot={false} strokeWidth={2} isAnimationActive={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="r" name="RPM" stroke="#eab308" dot={false} strokeWidth={1} opacity={0.6} isAnimationActive={false} />
                                    <Line yAxisId="gear" type="step" dataKey="g" name="Gear" stroke="#a855f7" dot={false} strokeWidth={2} opacity={0.8} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* GRAPHIQUE 2 : PEDALES (Throttle/Brake) */}
                        <div className="h-1/3 bg-slate-900/50 border border-white/5 rounded p-2 relative">
                            <span className="absolute top-2 left-2 text-[10px] font-bold text-slate-400">INPUTS</span>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={selectedLap.samples} syncId="motec">
                                    <Tooltip content={<CustomTooltip />} />
                                    <XAxis dataKey="d" type="number" hide />
                                    <YAxis domain={[0, 100]} hide />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                    <Line type="step" dataKey="t" name="Throttle" stroke="#10b981" dot={false} strokeWidth={2} isAnimationActive={false} />
                                    <Line type="step" dataKey="b" name="Brake" stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* GRAPHIQUE 3 : VOLANT */}
                        <div className="h-1/3 bg-slate-900/50 border border-white/5 rounded p-2 relative">
                            <span className="absolute top-2 left-2 text-[10px] font-bold text-slate-400">STEERING</span>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={selectedLap.samples} syncId="motec">
                                    <Tooltip content={<CustomTooltip />} />
                                    <XAxis dataKey="d" type="number" unit="m" stroke="#475569" />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                                    <Line type="monotone" dataKey="w" name="Steering" stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailedAnalysis;
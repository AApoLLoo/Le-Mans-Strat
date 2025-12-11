import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Database, Trash2, AlertTriangle } from 'lucide-react'; // Ajout de Trash2

// CONFIGURATION API
const API_BASE_URL = "https://api.racetelemetrybyfbt.com";

// Types
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
    const [sessions, setSessions] = useState<TelemetrySession[]>([]);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [laps, setLaps] = useState<TelemetryLap[]>([]);
    const [selectedLap, setSelectedLap] = useState<TelemetryLap | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Charger la liste des sessions
    const fetchSessions = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/sessions`, {
            });
            if (!res.ok) throw new Error(`Erreur (${res.status})`);
            const data = await res.json();
            setSessions(data);
        } catch (err: any) {
            console.error("Erreur API:", err);
            setError("Impossible de charger les sessions.");
        }
    };

    useEffect(() => { fetchSessions(); }, []);

    // 2. Charger les tours
    const handleSelectSession = async (sessionId: string) => {
        if (!sessionId) {
            setSelectedSession(null);
            setLaps([]);
            return;
        }
        setSelectedSession(sessionId);
        setLoading(true);
        setSelectedLap(null);
        setLaps([]);

        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/sessions/${sessionId}/laps`, {
            });
            if (!res.ok) throw new Error("Erreur chargement tours");
            const data = await res.json();
            setLaps(data.sort((a: any, b: any) => a.lap_number - b.lap_number));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // 3. Charger détail tour
    const handleSelectLap = async (lapNumber: number) => {
        if (!selectedSession) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/telemetry/${selectedSession}/${lapNumber}`, {
            });
            if (!res.ok) throw new Error("Pas de données");
            const samples = await res.json();
            setSelectedLap({ lap_number: lapNumber, lap_time: 0, samples });
        } catch (err) {
            alert("Erreur chargement tour");
        } finally {
            setLoading(false);
        }
    };

    // --- NOUVEAU : SUPPRIMER UNE SESSION ---
    const handleDeleteSession = async () => {
        if (!selectedSession) return;
        if (!confirm("⚠️ Êtes-vous sûr de vouloir supprimer TOUTE cette session et ses tours ?\nCette action est irréversible.")) return;

        try {
            await fetch(`${API_BASE_URL}/api/analysis/sessions/${selectedSession}`, {
                method: 'DELETE',
            });
            // Mise à jour UI
            setSessions(prev => prev.filter(s => s.session_id !== selectedSession));
            setSelectedSession(null);
            setLaps([]);
            setSelectedLap(null);
        } catch (e) {
            alert("Erreur lors de la suppression de la session");
        }
    };

    // --- NOUVEAU : SUPPRIMER UN TOUR ---
    const handleDeleteLap = async () => {
        if (!selectedSession || !selectedLap) return;
        if (!confirm(`Supprimer uniquement le Tour ${selectedLap.lap_number} ?`)) return;

        try {
            await fetch(`${API_BASE_URL}/api/analysis/sessions/${selectedSession}/laps/${selectedLap.lap_number}`, {
                method: 'DELETE',
            });
            // Mise à jour UI
            setLaps(prev => prev.filter(l => l.lap_number !== selectedLap.lap_number));
            setSelectedLap(null);
        } catch (e) {
            alert("Erreur lors de la suppression du tour");
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl text-xs z-50 opacity-90">
                    <p className="font-bold text-slate-300 mb-1">Dist: {Number(label).toFixed(0)}m</p>
                    {payload.map((p: any) => (
                        <p key={p.name} style={{ color: p.color }}>
                            {p.name}: {Number(p.value).toFixed(1)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-full flex flex-col bg-[#0b0f19] text-white overflow-hidden">
            {/* HEADER */}
            <div className="h-16 border-b border-white/10 flex items-center px-4 gap-4 bg-slate-900 shrink-0 shadow-sm">
                <Database size={20} className="text-indigo-400" />

                {/* SELECTEUR SESSION */}
                <div className="flex items-center gap-2">
                    <select
                        className="bg-slate-800 border border-slate-700 rounded p-2 text-xs w-64 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        onChange={(e) => handleSelectSession(e.target.value)}
                        value={selectedSession || ""}
                    >
                        <option value="">-- Choisir une session --</option>
                        {sessions.map(s => (
                            <option key={s.session_id} value={s.session_id}>
                                {new Date(s.date).toLocaleDateString()} {new Date(s.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {s.session_id}
                            </option>
                        ))}
                    </select>

                    {/* BOUTON SUPPRIMER SESSION */}
                    {selectedSession && (
                        <button
                            onClick={handleDeleteSession}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded border border-red-500/20 transition-colors"
                            title="Supprimer la session complète"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                {/* SELECTEUR TOUR */}
                {selectedSession && (
                    <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                        <select
                            className="bg-slate-800 border border-slate-700 rounded p-2 text-xs w-32 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            onChange={(e) => handleSelectLap(Number(e.target.value))}
                            disabled={loading}
                            value={selectedLap?.lap_number || ""}
                        >
                            <option value="" disabled>-- Tour --</option>
                            {laps.map(l => (
                                <option key={l.lap_number} value={l.lap_number}>
                                    Tour {l.lap_number} ({Number(l.lap_time) > 0 ? Number(l.lap_time).toFixed(3) : '--'}) s
                                </option>
                            ))}
                        </select>

                        {/* BOUTON SUPPRIMER TOUR */}
                        {selectedLap && (
                            <button
                                onClick={handleDeleteLap}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded border border-red-500/20 transition-colors"
                                title="Supprimer ce tour"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                )}

                {error && <span className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={12}/> {error}</span>}
                {loading && <span className="text-indigo-400 text-xs animate-pulse">Chargement des données...</span>}
            </div>

            {/* GRAPHIQUES */}
            <div className="flex-1 p-4 overflow-y-auto">
                {!selectedLap ? (
                    <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-4">
                        <div className="p-6 bg-slate-900/50 rounded-full border border-white/5">
                            <Database size={48} opacity={0.5} />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-medium text-slate-300">Analyse Télémétrie</p>
                            <p className="text-sm">Sélectionnez une session et un tour pour visualiser les données</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 h-full min-h-[800px]">
                        {/* GRAPHIQUE 1 : VITESSE / RPM / GEAR */}
                        <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-lg p-2 flex flex-col relative group min-h-[300px]">
                            <div className="absolute top-2 left-14 z-10 flex gap-4 text-[10px] font-bold bg-slate-900/90 p-1.5 rounded backdrop-blur-sm border border-white/10 shadow-lg">
                                <span className="text-blue-400 flex items-center gap-1">◼ SPEED</span>
                                <span className="text-yellow-500 flex items-center gap-1">◼ RPM</span>
                                <span className="text-purple-400 flex items-center gap-1">◼ GEAR</span>
                            </div>

                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={selectedLap.samples} syncId="motec" margin={{top: 20, right: 10, left: -20, bottom: 0}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                                    <XAxis dataKey="d" type="number" hide />
                                    <YAxis yAxisId="left" domain={[0, 'auto']} hide />
                                    <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} hide />
                                    <YAxis yAxisId="gear" domain={[0, 9]} hide />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'white', strokeWidth: 1, strokeDasharray: '4 4' }} />

                                    <Line yAxisId="left" type="monotone" dataKey="s" stroke="#3b82f6" dot={false} strokeWidth={2} isAnimationActive={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="r" stroke="#eab308" dot={false} strokeWidth={1} opacity={0.6} isAnimationActive={false} />
                                    <Line yAxisId="gear" type="stepAfter" dataKey="g" stroke="#a855f7" dot={false} strokeWidth={2} opacity={0.8} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* GRAPHIQUE 2 : PEDALES */}
                        <div className="h-48 bg-slate-900/50 border border-white/5 rounded p-2 relative shrink-0">
                            <span className="absolute top-2 left-2 text-[10px] font-bold text-slate-400 bg-slate-900/80 px-1 rounded">INPUTS (THROTTLE / BRAKE)</span>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={selectedLap.samples} syncId="motec" margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'white', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    <XAxis dataKey="d" type="number" hide />
                                    <YAxis domain={[0, 100]} hide />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                                    <Line type="monotone" dataKey="t" stroke="#10b981" dot={false} strokeWidth={2} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="b" stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* GRAPHIQUE 3 : VOLANT */}
                        <div className="h-48 bg-slate-900/50 border border-white/5 rounded p-2 relative shrink-0">
                            <span className="absolute top-2 left-2 text-[10px] font-bold text-slate-400 bg-slate-900/80 px-1 rounded">STEERING ANGLE</span>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={selectedLap.samples} syncId="motec" margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'white', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    <XAxis dataKey="d" type="number" unit="m" stroke="#475569" tick={{fontSize: 10}} />
                                    <YAxis hide domain={['dataMin', 'dataMax']} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                                    <Line type="monotone" dataKey="w" stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} />
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
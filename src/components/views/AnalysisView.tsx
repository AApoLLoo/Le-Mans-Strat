import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Database } from 'lucide-react';

// --- CONFIGURATION API VPS ---
const API_BASE_URL = "https://enarthrodial-unpermanently-fausto.ngrok-free.dev";

// Types
interface TelemetrySession {
    session_id: string; // Adapté au format renvoyé par le serveur (session_id)
    date: string;
    driver_name: string;
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
                // Utilisation de la route '/api/analysis/sessions' définie sur le serveur
                const res = await fetch(`${API_BASE_URL}/api/analysis/sessions`, {
                    headers: {
                        "ngrok-skip-browser-warning": "true" // <--- PASSE LA SÉCURITÉ NGROK
                    }
                });

                if (!res.ok) throw new Error(`Erreur chargement sessions (${res.status})`);
                const data = await res.json();
                setSessions(data);
            } catch (err: any) {
                console.error("Erreur API:", err);
                setError("Impossible de charger les sessions (Vérifiez Ngrok et le VPS).");
            }
        };
        fetchSessions();
    }, []);

    // 2. Quand une session est choisie, charger les tours depuis le VPS
    const handleSelectSession = async (sessionId: string) => {
        setSelectedSession(sessionId);
        setLoading(true);
        setSelectedLap(null);
        setLaps([]); // Reset

        try {
            // Utilisation de la route '/api/analysis/sessions/:id/laps'
            const res = await fetch(`${API_BASE_URL}/api/analysis/sessions/${sessionId}/laps`, {
                headers: {
                    "ngrok-skip-browser-warning": "true" // <--- PASSE LA SÉCURITÉ NGROK
                }
            });

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

    // 3. Charger la télémétrie détaillée d'un tour spécifique
    const handleSelectLap = async (lapNumber: number) => {
        if (!selectedSession) return;
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/telemetry/${selectedSession}/${lapNumber}`, {
                headers: {
                    "ngrok-skip-browser-warning": "true" // <--- PASSE LA SÉCURITÉ NGROK
                }
            });

            if (!res.ok) throw new Error("Pas de données détaillées pour ce tour");
            const samples = await res.json();

            // On reconstruit l'objet Lap complet avec les samples
            setSelectedLap({
                id: `${selectedSession}_${lapNumber}`,
                lap_number: lapNumber,
                lap_time: 0, // Pas critique pour l'affichage
                samples: samples
            });

        } catch (err) {
            console.error(err);
            alert("Impossible de charger la télémétrie de ce tour.");
        } finally {
            setLoading(false);
        }
    };

    // Tooltip personnalisé pour afficher les valeurs précises
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl text-xs z-50">
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
            {/* --- HEADER SELECTEUR --- */}
            <div className="h-16 border-b border-white/10 flex items-center px-4 gap-4 bg-slate-900 shrink-0">
                <Database size={20} className="text-indigo-400" />

                {/* Selecteur Session */}
                <select
                    className="bg-slate-800 border border-slate-700 rounded p-2 text-xs w-64 text-white"
                    onChange={(e) => handleSelectSession(e.target.value)}
                    value={selectedSession || ""}
                >
                    <option value="">-- Choisir une session --</option>
                    {sessions.map(s => (
                        <option key={s.session_id} value={s.session_id}>
                            {new Date(s.date).toLocaleDateString()} - {s.session_id} ({s.driver_name})
                        </option>
                    ))}
                </select>

                {/* Selecteur Tour */}
                {selectedSession && (
                    <select
                        className="bg-slate-800 border border-slate-700 rounded p-2 text-xs w-32 text-white"
                        onChange={(e) => handleSelectLap(Number(e.target.value))}
                        disabled={loading}
                        defaultValue=""
                    >
                        <option value="" disabled>-- Tour --</option>
                        {laps.map(l => (
                            <option key={l.lap_number} value={l.lap_number}>Tour {l.lap_number}</option>
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
                        <p className="text-xs text-slate-600">Source: VPS OVH (Ngrok Secure)</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 h-full min-h-[600px]">
                        {/* GRAPHIQUE 1 : VITESSE & RPM & GEAR */}
                        <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-lg p-2 flex flex-col relative group min-h-[250px]">
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
                        <div className="h-48 bg-slate-900/50 border border-white/5 rounded p-2 relative shrink-0">
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
                        <div className="h-48 bg-slate-900/50 border border-white/5 rounded p-2 relative shrink-0">
                            <span className="absolute top-2 left-2 text-[10px] font-bold text-slate-400">STEERING</span>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={selectedLap.samples} syncId="motec">
                                    <Tooltip content={<CustomTooltip />} />
                                    <XAxis dataKey="d" type="number" unit="m" stroke="#475569" />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
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
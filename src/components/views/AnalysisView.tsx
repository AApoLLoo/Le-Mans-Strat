import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient'; //
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Database, Search } from 'lucide-react';

// Types pour la BDD
interface TelemetrySession {
    id: string;
    created_at: string;
    track_name: string;
    driver_name: string;
}

interface TelemetryLap {
    id: string;
    lap_number: number;
    lap_time: number;
    samples: { d: number, s: number, t: number, b: number, r: number }[]; // Distance, Speed, Throttle, Brake, RPM
}

const DetailedAnalysis = () => {
    const [sessions, setSessions] = useState<TelemetrySession[]>([]);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [laps, setLaps] = useState<TelemetryLap[]>([]);
    const [selectedLap, setSelectedLap] = useState<TelemetryLap | null>(null);

    // 1. Charger la liste des sessions disponibles
    useEffect(() => {
        const fetchSessions = async () => {
            // Adaptez 'sessions' au nom réel de votre table OVH
            const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false });
            if (data) setSessions(data);
        };
        fetchSessions();
    }, []);

    // 2. Quand une session est choisie, charger les tours
    const handleSelectSession = async (sessionId: string) => {
        setSelectedSession(sessionId);
        const { data } = await supabase
            .from('laps_telemetry')
            .select('*')
            .eq('session_id', sessionId)
            .order('lap_number', { ascending: true });

        if (data) setLaps(data);
    };

    return (
        <div className="h-full flex flex-col bg-[#0b0f19] text-white overflow-hidden">
            {/* --- HEADER SELECTEUR --- */}
            <div className="h-16 border-b border-white/10 flex items-center px-4 gap-4 bg-slate-900">
                <Database size={20} className="text-indigo-400" />
                <select
                    className="bg-slate-800 border border-slate-700 rounded p-2 text-xs w-64"
                    onChange={(e) => handleSelectSession(e.target.value)}
                >
                    <option value="">-- Choisir une session --</option>
                    {sessions.map(s => (
                        <option key={s.id} value={s.id}>
                            {new Date(s.created_at).toLocaleDateString()} - {s.track_name} ({s.driver_name})
                        </option>
                    ))}
                </select>

                {selectedSession && (
                    <select
                        className="bg-slate-800 border border-slate-700 rounded p-2 text-xs w-32"
                        onChange={(e) => {
                            const lap = laps.find(l => l.id === e.target.value);
                            setSelectedLap(lap || null);
                        }}
                    >
                        <option value="">-- Tour --</option>
                        {laps.map(l => (
                            <option key={l.id} value={l.id}>Tour {l.lap_number} ({l.lap_time}s)</option>
                        ))}
                    </select>
                )}
            </div>

            {/* --- ZONE GRAPHIQUE --- */}
            <div className="flex-1 p-4 overflow-y-auto">
                {!selectedLap ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                        Selectionnez une session et un tour pour afficher la télémétrie
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 h-full">
                        {/* GRAPHIQUE 1 : VITESSE & RPM */}
                        {/* --- GRAPHIQUE 1 : VITESSE, RPM & GEAR --- */}
                        <div className="h-64 bg-slate-900/50 border border-white/5 rounded-lg p-2 flex flex-col relative group">
                            <div className="absolute top-2 left-2 z-10 flex gap-4 text-[10px] font-bold bg-slate-900/80 p-1 rounded backdrop-blur-sm border border-white/10">
                                <span className="text-blue-400">SPEED</span>
                                <span className="text-yellow-500">RPM</span>
                                <span className="text-purple-400">GEAR</span>
                            </div>

                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={selectedLap.samples} syncId="motec" margin={{top: 20, right: 10, left: -20, bottom: 0}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                    <XAxis dataKey="d" type="number" hide />

                                    {/* AXES Y SÉPARÉS */}
                                    <YAxis yAxisId="left" domain={[0, 'auto']} hide />       {/* Pour la Vitesse */}
                                    <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} hide /> {/* Pour les RPM */}
                                    <YAxis yAxisId="gear" domain={[0, 9]} hide />            {/* Pour les Vitesses (0-9) */}

                                    <Tooltip content={<CustomTooltip />} />

                                    {/* COURBES LIÉES AUX BONS AXES */}
                                    <Line yAxisId="left" type="monotone" dataKey="s" name="Speed" stroke="#3b82f6" dot={false} strokeWidth={2} isAnimationActive={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="r" name="RPM" stroke="#eab308" dot={false} strokeWidth={1} opacity={0.6} isAnimationActive={false} />
                                    {/* Correction ici : yAxisId="gear" */}
                                    <Line yAxisId="gear" type="step" dataKey="g" name="Gear" stroke="#a855f7" dot={false} strokeWidth={2} opacity={0.8} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        {/* GRAPHIQUE 2 : PEDALES (Throttle/Brake) */}
                        <div className="h-1/3 bg-slate-900/50 border border-white/5 rounded p-2 relative">
                            <span className="absolute top-2 left-2 text-[10px] font-bold text-slate-400">INPUTS</span>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={selectedLap.samples} syncId="motec">
                                    <Tooltip />
                                    <XAxis dataKey="d" type="number" hide />
                                    <YAxis domain={[0, 100]} hide />
                                    {/* Accélérateur en Vert */}
                                    <Line type="step" dataKey="t" stroke="#10b981" dot={false} strokeWidth={1} isAnimationActive={false} />
                                    {/* Frein en Rouge */}
                                    <Line type="step" dataKey="b" stroke="#ef4444" dot={false} strokeWidth={1} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* GRAPHIQUE 3 : VOLANT */}
                        <div className="h-1/3 bg-slate-900/50 border border-white/5 rounded p-2 relative">
                            <span className="absolute top-2 left-2 text-[10px] font-bold text-slate-400">STEERING</span>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={selectedLap.samples} syncId="motec">
                                    <Tooltip />
                                    <XAxis dataKey="d" type="number" unit="m" stroke="#475569" />
                                    <YAxis hide />
                                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                                    <Line type="monotone" dataKey="w" stroke="#f59e0b" dot={false} strokeWidth={1} isAnimationActive={false} />
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
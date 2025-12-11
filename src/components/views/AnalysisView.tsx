import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { Clock, Fuel, Activity, ArrowLeft, Database, Search } from 'lucide-react';

const VPS_API_URL = "http://51.178.87.25:5000";

const AnalysisView = () => {
    // États pour la sélection
    const [availableSessions, setAvailableSessions] = useState<any[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");

    // États pour les données
    const [lapsList, setLapsList] = useState<any[]>([]); // Liste des tours (sans télémétrie)
    const [selectedLapNum, setSelectedLapNum] = useState<number | null>(null);
    const [telemetryData, setTelemetryData] = useState<any[]>([]); // Données détaillées du tour choisi
    const [loading, setLoading] = useState(false);

    // 1. AU CHARGEMENT : Récupérer la liste des sessions disponibles sur le VPS
    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await fetch(`${VPS_API_URL}/api/analysis/sessions`);
                if (res.ok) {
                    const data = await res.json();
                    setAvailableSessions(data);

                    // Si on a déjà un ID dans l'URL ou localStorage, on le pré-sélectionne
                    const storedId = localStorage.getItem('teamId');
                    if (storedId && data.some((s:any) => s.session_id === storedId)) {
                        setSelectedSessionId(storedId);
                    }
                }
            } catch (e) {
                console.error("Erreur chargement liste sessions", e);
            }
        };
        fetchSessions();
    }, []);

    // 2. QUAND ON CHANGE DE SESSION : Charger la liste des tours
    useEffect(() => {
        if (!selectedSessionId) return;

        const fetchLaps = async () => {
            setLoading(true);
            setLapsList([]);
            setTelemetryData([]);
            setSelectedLapNum(null);

            try {
                const res = await fetch(`${VPS_API_URL}/api/analysis/sessions/${selectedSessionId}/laps`);
                if (res.ok) {
                    const data = await res.json();
                    setLapsList(data);
                }
            } catch (e) {
                console.error("Erreur chargement tours", e);
            } finally {
                setLoading(false);
            }
        };
        fetchLaps();
    }, [selectedSessionId]);

    // 3. QUAND ON CLIQUE SUR UN TOUR : Charger la télémétrie détaillée
    const loadLapTelemetry = async (lapNum: number) => {
        if (selectedLapNum === lapNum) return;
        setSelectedLapNum(lapNum);
        setLoading(true);

        try {
            const res = await fetch(`${VPS_API_URL}/api/telemetry/${selectedSessionId}/${lapNum}`);
            if (res.ok) {
                const data = await res.json();
                setTelemetryData(data);
            } else {
                setTelemetryData([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (sec: number) => {
        if (!sec) return "-";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.floor((sec - Math.floor(sec)) * 1000);
        return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    return (
        <div className="h-full flex flex-col bg-[#020408] text-white overflow-hidden">

            {/* --- BARRE DU HAUT : SÉLECTEUR DE SESSION --- */}
            <div className="h-16 bg-slate-900 border-b border-white/10 flex items-center px-6 gap-4 shrink-0">
                <Link to="/" className="text-slate-400 hover:text-white"><ArrowLeft size={20}/></Link>
                <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest">
                    <Database size={18}/> ANALYSIS CENTER
                </div>

                <div className="h-8 w-[1px] bg-white/10 mx-2"></div>

                {/* Dropdown Session */}
                <div className="relative group">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <select
                        className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-indigo-500 outline-none w-64 appearance-none cursor-pointer hover:bg-slate-700 transition-colors"
                        value={selectedSessionId}
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                    >
                        <option value="">-- SELECT SESSION --</option>
                        {availableSessions.map((s: any) => (
                            <option key={s.session_id} value={s.session_id}>
                                {s.session_id.toUpperCase()} ({new Date(s.date).toLocaleDateString()})
                            </option>
                        ))}
                    </select>
                </div>

                {selectedSessionId && (
                    <div className="ml-auto text-xs font-mono text-slate-500">
                        SESSION ID: <span className="text-white">{selectedSessionId}</span>
                    </div>
                )}
            </div>

            {/* --- CONTENU PRINCIPAL --- */}
            <div className="flex-1 flex overflow-hidden">

                {/* LISTE DES TOURS (Colonne Gauche) */}
                <div className="w-64 bg-[#0f172a] border-r border-white/5 flex flex-col">
                    <div className="p-4 border-b border-white/5">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Laps ({lapsList.length})</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {lapsList.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-600 italic">Select a session to load laps</div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {lapsList.map((lap) => (
                                    <button
                                        key={lap.lap_number}
                                        onClick={() => loadLapTelemetry(lap.lap_number)}
                                        className={`w-full text-left p-3 hover:bg-white/5 transition-colors flex justify-between items-center group ${selectedLapNum === lap.lap_number ? 'bg-indigo-600/20 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}
                                    >
                                        <span className={`font-mono font-bold ${selectedLapNum === lap.lap_number ? 'text-white' : 'text-slate-400'}`}>
                                            L{lap.lap_number}
                                        </span>
                                        <span className={`font-mono text-sm ${selectedLapNum === lap.lap_number ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                            {formatTime(lap.lap_time)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* VISUALISATION (Zone Centrale) */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#020408]">
                    {!selectedLapNum ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600">
                            <Activity size={64} strokeWidth={1} className="mb-4 opacity-20"/>
                            <p className="text-lg font-medium">No Lap Selected</p>
                            <p className="text-sm">Select a lap from the list to view telemetry</p>
                        </div>
                    ) : loading ? (
                        <div className="h-full flex items-center justify-center text-indigo-400 animate-pulse font-bold">
                            LOADING DATA...
                        </div>
                    ) : telemetryData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-red-400">
                            No telemetry data points found for this lap.
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-5xl mx-auto">

                            {/* GRAPHIQUE 1 : VITESSE & GEAR */}
                            <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-4 shadow-xl">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div> Speed & Gear
                                    </h4>
                                </div>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={telemetryData}>
                                            <defs>
                                                <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false}/>
                                            <XAxis dataKey="d" type="number" unit="m" stroke="#64748b" tick={false} axisLine={false} />
                                            <YAxis yAxisId="left" stroke="#3b82f6" domain={[0, 'auto']} width={40} tick={{fontSize: 10}} tickLine={false} axisLine={false}/>
                                            <YAxis yAxisId="right" orientation="right" domain={[0, 8]} hide/>
                                            <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px'}} labelFormatter={(v)=>`${v.toFixed(0)}m`}/>
                                            <Area yAxisId="left" type="monotone" dataKey="s" stroke="#3b82f6" fill="url(#colorSpeed)" strokeWidth={2} name="Speed" isAnimationActive={false}/>
                                            <Line yAxisId="right" type="step" dataKey="g" stroke="#fbbf24" strokeWidth={2} dot={false} name="Gear" isAnimationActive={false}/>
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* GRAPHIQUE 2 : INPUTS */}
                            <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-4 shadow-xl">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div> Throttle & Brake
                                    </h4>
                                </div>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={telemetryData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false}/>
                                            <XAxis dataKey="d" type="number" unit="m" stroke="#64748b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                            <YAxis domain={[0, 100]} stroke="#94a3b8" width={40} tick={{fontSize: 10}} tickLine={false} axisLine={false}/>
                                            <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px'}} labelFormatter={(v)=>`${v.toFixed(0)}m`}/>
                                            <Line type="monotone" dataKey="t" stroke="#22c55e" strokeWidth={2} dot={false} name="Throttle" isAnimationActive={false}/>
                                            <Line type="monotone" dataKey="b" stroke="#ef4444" strokeWidth={2} dot={false} name="Brake" isAnimationActive={false}/>
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalysisView;
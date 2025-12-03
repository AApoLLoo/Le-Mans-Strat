import { Fuel, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient.ts';

interface LeaderboardEntry {
    pos: number;
    num: string;
    driver: string;
    car: string;
    class: string;
    laps: number;
    gap: number;
    int: number;
    last: number;
    best: number;
    pit: boolean;
    stops: number;
    state: number;
}

interface LiveTimingProps {
    telemetryData: import('../../types').TelemetryData;
    isHypercar: boolean;
}

const LiveTimingView: React.FC<LiveTimingProps> = ({ telemetryData, isHypercar }) => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

    // 1. Récupération des infos
    const trackName = telemetryData?.trackName || "";
    const sessionType = telemetryData?.sessionType || "";
    const serverName = telemetryData?.serverName || "Offline";

    // 2. Calcul de l'ID avec le Serveur
    const trackId = trackName.replace(/\s/g, '');
    const sessId = sessionType.replace(/\s/g, '');
    const srvId = serverName.replace(/\s/g, '');
    
    // ID UNIQUE : leaderboard_Circuit_Session_Serveur
    const docId = `leaderboard_${trackId}_${sessId}_${srvId}`; 

    // --- SÉCURISATION DES DONNÉES ---
    // On convertit tout en nombre pour éviter le crash .toFixed()
    const currentFuel = Number(telemetryData?.fuel?.current || 0);
    const avgFuelCons = Number(telemetryData?.fuel?.averageCons || 1); // Eviter division par 0
    const estLapsFuel = avgFuelCons > 0 ? (currentFuel / avgFuelCons) : 0;

    const currentVE = Number(telemetryData?.VE?.VEcurrent || 0);
    const lastLapTime = Number(telemetryData?.lapTimeLast || 0);

    // Extraction des usures pneus (sécurisée)
    const tireWear = [
        Number(telemetryData?.tires?.fl || 0),
        Number(telemetryData?.tires?.fr || 0),
        Number(telemetryData?.tires?.rl || 0),
        Number(telemetryData?.tires?.rr || 0)
    ];

    useEffect(() => {
        if (!trackName || !sessionType || !serverName) return;

        let channel: ReturnType<typeof supabase['channel']> | null = null;

        (async () => {
            try {
                const { data, error } = await supabase.from('strategies').select('json').eq('id', docId).maybeSingle() as { data: import('../../types').StrategyRow | null, error: any };
                if (error) {
                    console.error('Supabase fetch leaderboard error', error);
                }
                if (data && data.json) {
                    try {
                        const parsed = typeof (data as any).json === 'string' ? JSON.parse((data as any).json) : (data as any).json;
                        const entries = Array.isArray(parsed) ? parsed : [];
                        setLeaderboard(entries);
                        console.log('Leaderboard set with entries:', entries);
                    } catch (err) {
                        console.error('Error parsing leaderboard', err);
                        setLeaderboard([]);
                    }
                } else {
                    setLeaderboard([]);
                    console.log('No leaderboard data, set empty');
                }
            } catch (e) {
                console.error('Leaderboard fetch exception', e);
            }
        })();

        try {
            channel = supabase.channel(`public:strategies:${docId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'strategies', filter: `id=eq.${docId}` }, (payload) => {
                    const newRow = payload.new as import('../../types').StrategyRow | undefined;
                    if (!newRow) return;
                    try {
                        const parsed = typeof (newRow as any).json === 'string' ? JSON.parse((newRow as any).json) : (newRow as any).json;
                        const entries = Array.isArray(parsed) ? parsed : [];
                        setLeaderboard(entries);
                        console.log('Realtime leaderboard updated:', entries);
                    } catch (err) { console.error('Error parsing realtime leaderboard', err); }
                })
                .subscribe();
        } catch (e) { console.error('Supabase subscribe leaderboard error', e); }

        return () => { try { if (channel) channel.unsubscribe(); } catch (err) { console.error('Unsubscribe leaderboard error', err); } };
    }, [docId, trackName, sessionType, serverName]);

    // Helpers
    const getGapString = (val: number) => {
        if (val === 0) return "-";
        if (val > 0) return `+${val.toFixed(1)}`;
        if (val < 0) return `${Math.floor(val)}L`;
        return val.toFixed(1);
    };

    const formatLap = (seconds: number) => {
        if (!seconds || seconds > 999 || isNaN(seconds)) return "-:--.---";
        const m = Math.floor(seconds / 60);
        const s = (seconds % 60).toFixed(3).padStart(6, '0');
        return `${m}:${s}`;
    };

    const getClassColor = (cls: string) => {
        if (!cls) return 'border-l-4 border-slate-500';
        if (cls.includes('HYPER')) return 'border-l-4 border-red-600';
        if (cls.includes('LMP2')) return 'border-l-4 border-blue-600';
        if (cls.includes('GT3')) return 'border-l-4 border-orange-500';
        return 'border-l-4 border-slate-500';
    };

    return (
        <div className="flex flex-col h-full gap-4">
            {/* TOP BAR */}
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                <div className="col-span-2 bg-slate-800/50 p-2 rounded flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1"><Fuel size={10}/> Fuel</span>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-mono font-bold text-white">{currentFuel.toFixed(1)} <span className="text-xs text-slate-500">L</span></span>
                        <span className="text-xs text-slate-400 mb-1">~{estLapsFuel.toFixed(1)} Laps</span>
                    </div>
                </div>
                {isHypercar && (
                    <div className="col-span-2 bg-slate-800/50 p-2 rounded flex flex-col justify-between">
                         <span className="text-[10px] text-sky-400 font-bold uppercase flex items-center gap-1"><Zap size={10}/> Virtual NRG</span>
                         <div className="flex items-end gap-2">
                            <span className="text-2xl font-mono font-bold text-white">{currentVE.toFixed(1)} <span className="text-xs text-slate-500">%</span></span>
                        </div>
                    </div>
                )}
                <div className="col-span-2 lg:col-span-2 bg-slate-800/50 p-2 rounded flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Tires</span>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                        {tireWear.map((wear: number, i: number) => (
                            <div key={i} className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full ${wear > 70 ? 'bg-emerald-500' : wear > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${wear}%`}}></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="col-span-2 bg-slate-800/50 p-2 rounded flex flex-col justify-between">
                     <span className="text-[10px] text-slate-400 font-bold uppercase">Last Lap</span>
                     <span className="text-xl font-mono font-bold text-white tracking-tight">{formatLap(lastLapTime)}</span>
                </div>
            </div>

            {/* LEADERBOARD */}
            <div className="flex-1 overflow-hidden bg-slate-900/80 rounded-xl border border-white/5 flex flex-col">
                <div className="grid grid-cols-12 gap-2 p-3 bg-black/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <div className="col-span-1 text-center">Pos</div>
                    <div className="col-span-1 text-center">Class</div>
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-3">Driver / Team</div>
                    <div className="col-span-1 text-right">Gap</div>
                    <div className="col-span-1 text-right">Int</div>
                    <div className="col-span-1 text-center">Last</div>
                    <div className="col-span-1 text-center">Best</div>
                    <div className="col-span-1 text-center">Stops</div>
                    <div className="col-span-1 text-center">State</div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {leaderboard.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                            <span className="animate-spin text-2xl">↻</span>
                            <span className="text-xs">Waiting for live data...</span>
                        </div>
                    ) : (
                        leaderboard.map((row) => {
                            const isMe = row.driver === telemetryData?.driverName;

                            return (
                                <div key={row.num + row.class} className={`grid grid-cols-12 gap-2 p-2 items-center text-xs font-mono border-b border-white/5 hover:bg-white/5 transition-colors ${isMe ? 'bg-indigo-900/20' : ''} ${getClassColor(row.class)}`}>
                                    <div className="col-span-1 text-center font-bold text-white text-sm">{row.pos}</div>
                                    <div className="col-span-1 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.class.includes('HYP') ? 'bg-red-900/50 text-red-200' : row.class.includes('GT') ? 'bg-orange-900/50 text-orange-200' : 'bg-blue-900/50 text-blue-200'}`}>
                                            {row.class.substring(0,3)}
                                        </span>
                                    </div>
                                    <div className="col-span-1 text-center text-slate-300">{row.num}</div>
                                    <div className="col-span-3 truncate">
                                        <div className="font-bold text-white truncate">{row.driver}</div>
                                        <div className="text-[9px] text-slate-500 truncate">{row.car}</div>
                                    </div>
                                    <div className="col-span-1 text-right text-yellow-500">{row.pos === 1 ? '-' : getGapString(row.gap)}</div>
                                    <div className="col-span-1 text-right text-slate-400">{getGapString(row.int)}</div>
                                    <div className="col-span-1 text-center text-slate-300">{formatLap(row.last)}</div>
                                    <div className="col-span-1 text-center text-purple-400">{formatLap(row.best)}</div>
                                    <div className="col-span-1 text-center text-slate-500">{row.stops}</div>
                                    <div className="col-span-1 text-center flex justify-center">
                                        {row.pit ? (
                                            <span className="bg-yellow-500 text-black px-1 rounded text-[9px] font-bold animate-pulse">PIT</span>
                                        ) : (
                                            <span className="text-emerald-500 text-[9px]">TRK</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveTimingView;

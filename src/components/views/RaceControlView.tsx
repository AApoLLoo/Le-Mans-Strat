import React, { useMemo } from 'react';
import { AlertTriangle, Flag, CloudRain, ShieldAlert, CarFront, Gauge, Wrench } from 'lucide-react';
import type { RawVehicle, RestApiData, TelemetryData } from '../../types';

interface RaceControlViewProps {
    trackName: string;
    sessionType: string;
    weather: string;
    scActive: boolean;
    yellowFlag: boolean;
    trackWetness: number;
    rainIntensity: number;
    telemetryData: TelemetryData;
    allVehicles: RawVehicle[];
    restApiData: RestApiData;
    extendedPitLimit: number;
}

const Badge = ({ label, active, activeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30', inactiveClass = 'bg-slate-800/40 text-slate-400 border-slate-700/60' }: { label: string; active: boolean; activeClass?: string; inactiveClass?: string }) => (
    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${active ? activeClass : inactiveClass}`}>
        {label}
    </span>
);

const RaceControlView: React.FC<RaceControlViewProps> = ({
    trackName,
    sessionType,
    weather,
    scActive,
    yellowFlag,
    trackWetness,
    rainIntensity,
    telemetryData,
    allVehicles,
    restApiData,
    extendedPitLimit
}) => {
    const playerVehicle = useMemo(
        () => allVehicles.find((v) => v.is_player === 1),
        [allVehicles]
    );

    const penalizedCars = useMemo(
        () => allVehicles.filter((v) => Number(v.penalties || 0) > 0).sort((a, b) => Number(b.penalties || 0) - Number(a.penalties || 0)),
        [allVehicles]
    );

    return (
        <div className="h-full p-4 overflow-y-auto custom-scrollbar bg-[#050a10]">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-slate-900/50 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2"><Flag size={14}/> Track State</h3>
                        <span className="text-[10px] text-slate-400 font-bold">{trackName || 'TRACK'} - {sessionType || 'SESSION'}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                        <Badge label="SAFETY CAR" active={scActive} activeClass="bg-yellow-500/20 text-yellow-300 border-yellow-500/30" />
                        <Badge label="YELLOW FLAG" active={yellowFlag} activeClass="bg-amber-500/20 text-amber-300 border-amber-500/30" />
                        <Badge label="PIT LANE" active={Boolean(telemetryData.inPitLane)} activeClass="bg-blue-500/20 text-blue-300 border-blue-500/30" />
                        <Badge label="PIT LIMITER" active={Boolean(telemetryData.pitLimiter)} activeClass="bg-cyan-500/20 text-cyan-300 border-cyan-500/30" />
                        <Badge label="GARAGE" active={Boolean(telemetryData.inGarage)} activeClass="bg-purple-500/20 text-purple-300 border-purple-500/30" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                            <div className="text-[10px] text-slate-500">WEATHER</div>
                            <div className="text-sm font-bold text-white mt-1">{weather || 'SUNNY'}</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                            <div className="text-[10px] text-slate-500">WETNESS</div>
                            <div className="text-sm font-bold text-blue-300 mt-1">{Math.round(trackWetness)}%</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                            <div className="text-[10px] text-slate-500">RAIN INT</div>
                            <div className="text-sm font-bold text-cyan-300 mt-1">{Number(rainIntensity || 0).toFixed(2)}</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                            <div className="text-[10px] text-slate-500">WIND</div>
                            <div className="text-sm font-bold text-slate-200 mt-1">{Math.round(Number(telemetryData.windSpeed || 0))} km/h</div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 mb-3"><Gauge size={14}/> Car Extra Data</h3>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-slate-500">Damage Index</span><span className="text-white font-mono">{Math.round(Number(telemetryData.damageIndex || 0))}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Overheating</span><span className={telemetryData.isOverheating ? 'text-red-400 font-bold' : 'text-slate-300'}>{telemetryData.isOverheating ? 'YES' : 'NO'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Brake Wear FL</span><span className="text-amber-300 font-mono">{Number(telemetryData.brakeWear?.fl || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Brake Wear FR</span><span className="text-amber-300 font-mono">{Number(telemetryData.brakeWear?.fr || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Brake Wear RL</span><span className="text-amber-300 font-mono">{Number(telemetryData.brakeWear?.rl || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Brake Wear RR</span><span className="text-amber-300 font-mono">{Number(telemetryData.brakeWear?.rr || 0).toFixed(2)}</span></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 mb-3"><ShieldAlert size={14}/> Penalties</h3>
                    {penalizedCars.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">No penalties detected.</div>
                    ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                            {penalizedCars.map((v, idx) => (
                                <div key={`${v.id || idx}-${v.driver || 'driver'}`} className="bg-black/30 border border-white/5 rounded p-2 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-white">P{v.position || '-'} - {v.driver || v.name || 'Unknown'}</div>
                                        <div className="text-[10px] text-slate-500">{v.class || '-'} / Car #{v.id ?? '-'}</div>
                                    </div>
                                    <div className="text-sm font-black text-red-400">{Number(v.penalties || 0)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 mb-3"><CarFront size={14}/> Player Raw Data</h3>
                    {!playerVehicle ? (
                        <div className="text-xs text-slate-500 italic">Player vehicle not found in scoring stream.</div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Status</span><span className="text-white font-mono">{playerVehicle.status ?? '-'}</span></div>
                            <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">DRS</span><span className="text-white font-mono">{playerVehicle.drs ? 'ON' : 'OFF'}</span></div>
                            <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Attack Mode</span><span className="text-white font-mono">{playerVehicle.attack_mode ?? '-'}</span></div>
                            <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Fuel Fraction</span><span className="text-white font-mono">{playerVehicle.fuel_fraction !== undefined ? Number(playerVehicle.fuel_fraction).toFixed(3) : '-'}</span></div>
                            <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Last Pit Lap</span><span className="text-white font-mono">{playerVehicle.last_pit_lap ?? '-'}</span></div>
                            <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Predicted Pit</span><span className="text-white font-mono">{playerVehicle.predicted_pit_lap ?? '-'}</span></div>
                            <div className="bg-black/30 rounded p-2 col-span-2"><span className="text-slate-500 block">In Pits</span><span className="text-white font-mono">{playerVehicle.in_pits ? 'YES' : 'NO'}</span></div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 bg-slate-900/50 border border-white/10 rounded-xl p-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 mb-3"><AlertTriangle size={14}/> Wheel Health</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {(['fl', 'fr', 'rl', 'rr'] as const).map((wheel) => {
                        const info = telemetryData.vehicleHealth?.by_wheel?.[wheel];
                        const flat = Boolean(info?.flat);
                        const detached = Boolean(info?.detached);
                        return (
                            <div key={wheel} className="bg-black/30 rounded p-2 border border-white/5">
                                <div className="text-slate-500 uppercase text-[10px] font-bold mb-1">{wheel}</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Flat</span>
                                    <span className={flat ? 'text-amber-300 font-bold' : 'text-emerald-300'}>{flat ? 'YES' : 'NO'}</span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-slate-400">Detached</span>
                                    <span className={detached ? 'text-red-400 font-black' : 'text-emerald-300'}>{detached ? 'YES' : 'NO'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-4 bg-slate-900/50 border border-white/10 rounded-xl p-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 mb-3"><Wrench size={14}/> Engineering Snapshot</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Cur Lap</span><span className="text-white font-mono">{telemetryData.curLap?.toFixed?.(2) ?? '-'}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Last Lap</span><span className="text-white font-mono">{telemetryData.lastLap?.toFixed?.(2) ?? '-'}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Best Lap</span><span className="text-white font-mono">{telemetryData.bestLap?.toFixed?.(2) ?? '-'}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Leader Laps</span><span className="text-white font-mono">{telemetryData.leaderLaps ?? '-'}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Leader Avg</span><span className="text-white font-mono">{telemetryData.leaderAvgLapTime?.toFixed?.(2) ?? '-'}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Est. Pit Time</span><span className="text-white font-mono">{Number(telemetryData.strategyEstPitTime || 0).toFixed(2)}</span></div>
                </div>
            </div>

            <div className="mt-4 bg-slate-900/50 border border-white/10 rounded-xl p-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 mb-3"><Gauge size={14}/> Bridge Extended</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Track Clock</span><span className="text-white font-mono">{Number(restApiData.track_clock_time ?? -1).toFixed(1)}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Time Scale</span><span className="text-white font-mono">x{Number(restApiData.time_scale ?? 1).toFixed(2)}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Pit Limit</span><span className="text-cyan-300 font-mono">{Number(extendedPitLimit || 0).toFixed(1)}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Expected Fuel</span><span className="text-emerald-300 font-mono">{Number(restApiData.expected_fuel_consumption || 0).toFixed(2)}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Expected VE</span><span className="text-emerald-300 font-mono">{Number(restApiData.expected_virtual_energy_consumption || 0).toFixed(2)}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Penalty Time</span><span className="text-amber-300 font-mono">{Number(restApiData.penalty_time || 0).toFixed(1)}s</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Aero Damage</span><span className="text-white font-mono">{Number(restApiData.aero_damage || 0).toFixed(2)}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Turbo</span><span className="text-white font-mono">{Number(telemetryData.turboPressure || 0).toFixed(2)}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Engine Torque</span><span className="text-white font-mono">{Math.round(Number(telemetryData.engineTorque || 0))}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Steering Torque</span><span className="text-white font-mono">{Number(telemetryData.steeringShaftTorque || 0).toFixed(2)}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">DRS</span><span className="text-white font-mono">{telemetryData.carState?.drs ? 'ON' : 'OFF'}</span></div>
                    <div className="bg-black/30 rounded p-2"><span className="text-slate-500 block">Speed Limiter</span><span className="text-white font-mono">{telemetryData.carState?.speed_limiter ? 'ON' : 'OFF'}</span></div>
                    <div className="bg-black/30 rounded p-2 col-span-2 md:col-span-3"><span className="text-slate-500 block">Local Velocity</span><span className="text-white font-mono">x:{Number(telemetryData.localVelocity?.x || 0).toFixed(2)} y:{Number(telemetryData.localVelocity?.y || 0).toFixed(2)} z:{Number(telemetryData.localVelocity?.z || 0).toFixed(2)}</span></div>
                    <div className="bg-black/30 rounded p-2 col-span-2 md:col-span-3"><span className="text-slate-500 block">Local Acceleration</span><span className="text-white font-mono">x:{Number(telemetryData.localAcceleration?.x || 0).toFixed(2)} y:{Number(telemetryData.localAcceleration?.y || 0).toFixed(2)} z:{Number(telemetryData.localAcceleration?.z || 0).toFixed(2)}</span></div>
                </div>
            </div>

            {yellowFlag && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-200 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={14}/> Yellow flag active: watch deltas and avoid risky overtakes.
                </div>
            )}
            {trackWetness > 5 && (
                <div className="mt-2 bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-blue-200 text-xs font-bold flex items-center gap-2">
                    <CloudRain size={14}/> Wet track detected: {Math.round(trackWetness)}% wetness.
                </div>
            )}
        </div>
    );
};

export default RaceControlView;


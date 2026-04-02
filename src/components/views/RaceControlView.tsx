import React, { useMemo } from 'react';
import { AlertTriangle, CarFront, CloudRain, Flag, Gauge, ShieldAlert, Wrench } from 'lucide-react';
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

const StatusBadge = ({
    label,
    active,
    activeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    inactiveClass = 'bg-slate-800/40 text-slate-400 border-slate-700/60'
}: {
    label: string;
    active: boolean;
    activeClass?: string;
    inactiveClass?: string;
}) => (
    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${active ? activeClass : inactiveClass}`}>
        {label}
    </span>
);

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 mb-3">
            {icon}
            {title}
        </h3>
        {children}
    </div>
);

const Kpi = ({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) => (
    <div className="bg-black/30 rounded-lg p-2 border border-white/5">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</div>
        <div className={`text-sm font-bold mt-1 ${valueClass}`}>{value}</div>
    </div>
);

const Row = ({ label, value, valueClass = 'text-white font-mono' }: { label: string; value: string; valueClass?: string }) => (
    <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={valueClass}>{value}</span>
    </div>
);

const toNum = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const fmtFixed = (value: unknown, digits = 2, suffix = ''): string => {
    const num = toNum(value);
    return num === null ? '-' : `${num.toFixed(digits)}${suffix}`;
};

const fmtInt = (value: unknown, suffix = ''): string => {
    const num = toNum(value);
    return num === null ? '-' : `${Math.round(num)}${suffix}`;
};

const fmtLap = (value: unknown): string => {
    const num = toNum(value);
    if (num === null) return '-';
    return `${num.toFixed(2)} s`;
};

const fmtPenaltyPoints = (trackLimitsSteps: unknown): string => {
    const steps = toNum(trackLimitsSteps);
    if (steps === null) return '-';
    const points = steps * 0.25;
    return `${points.toFixed(2)} pts (${Math.round(steps)} steps)`;
};

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
    const playerVehicle = useMemo(() => allVehicles.find((v) => v.is_player === 1), [allVehicles]);

    const penalizedCars = useMemo(
        () => allVehicles.filter((v) => Number(v.penalties || 0) > 0).sort((a, b) => Number(b.penalties || 0) - Number(a.penalties || 0)),
        [allVehicles]
    );

    const vehicleHealth = telemetryData.vehicleHealth;

    return (
        <div className="h-full p-4 overflow-y-auto custom-scrollbar bg-[#050a10]">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Section title="Track State" icon={<Flag size={14} />}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{trackName || 'TRACK'}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{sessionType || 'SESSION'}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                        <StatusBadge label="SAFETY CAR" active={scActive} activeClass="bg-yellow-500/20 text-yellow-300 border-yellow-500/30" />
                        <StatusBadge label="YELLOW FLAG" active={yellowFlag} activeClass="bg-amber-500/20 text-amber-300 border-amber-500/30" />
                        <StatusBadge label="PIT LANE" active={Boolean(telemetryData.inPitLane)} activeClass="bg-blue-500/20 text-blue-300 border-blue-500/30" />
                        <StatusBadge label="PIT LIMITER" active={Boolean(telemetryData.pitLimiter)} activeClass="bg-cyan-500/20 text-cyan-300 border-cyan-500/30" />
                        <StatusBadge label="GARAGE" active={Boolean(telemetryData.inGarage)} activeClass="bg-purple-500/20 text-purple-300 border-purple-500/30" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Kpi label="Weather" value={weather || '-'} />
                        <Kpi label="Wetness" value={fmtInt(trackWetness, '%')} valueClass="text-blue-300" />
                        <Kpi label="Rain Int" value={fmtFixed(rainIntensity, 2)} valueClass="text-cyan-300" />
                        <Kpi label="Wind" value={fmtInt(telemetryData.windSpeed, ' km/h')} valueClass="text-slate-200" />
                    </div>
                </Section>

                <Section title="Vehicle Health" icon={<Gauge size={14} />}>
                    <div className="space-y-2 mb-3">
                        <Row label="Overheating" value={vehicleHealth?.overheating ? 'YES' : 'NO'} valueClass={vehicleHealth?.overheating ? 'text-red-400 font-bold' : 'text-emerald-300 font-bold'} />
                        <Row label="Dents Max" value={fmtFixed(vehicleHealth?.dents_max, 2)} />
                        <Row label="Flat Tires" value={fmtInt(vehicleHealth?.tire_flat_count)} />
                        <Row label="Detached Wheels" value={fmtInt(vehicleHealth?.wheel_detached_count)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <Kpi label="Brake Wear FL" value={fmtFixed(telemetryData.brakeWear?.fl, 2)} valueClass="text-amber-300" />
                        <Kpi label="Brake Wear FR" value={fmtFixed(telemetryData.brakeWear?.fr, 2)} valueClass="text-amber-300" />
                        <Kpi label="Brake Wear RL" value={fmtFixed(telemetryData.brakeWear?.rl, 2)} valueClass="text-amber-300" />
                        <Kpi label="Brake Wear RR" value={fmtFixed(telemetryData.brakeWear?.rr, 2)} valueClass="text-amber-300" />
                    </div>
                </Section>

                <Section title="Player Raw Data" icon={<CarFront size={14} />}>
                    {!playerVehicle ? (
                        <div className="text-xs text-slate-500 italic">Player vehicle not found in scoring stream.</div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <Kpi label="Status" value={playerVehicle.status !== undefined ? String(playerVehicle.status) : '-'} />
                            <Kpi label="Fuel Fraction" value={fmtFixed(playerVehicle.fuel_fraction, 3)} />
                            <Kpi label="Last Pit Lap" value={fmtInt(playerVehicle.last_pit_lap)} />
                            <Kpi label="Predicted Pit" value={fmtInt(playerVehicle.predicted_pit_lap)} />
                            <div className="bg-black/30 rounded p-2 col-span-2 border border-white/5">
                                <span className="text-slate-500 block text-[10px] uppercase tracking-wide">In Pits</span>
                                <span className="text-white font-mono text-sm">{playerVehicle.in_pits ? 'YES' : 'NO'}</span>
                            </div>
                        </div>
                    )}
                </Section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                <Section title="Penalties" icon={<ShieldAlert size={14} />}>
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
                                    <div className="text-sm font-black text-red-400">{fmtInt(v.penalties)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                <Section title="Wheel Health" icon={<AlertTriangle size={14} />}>
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
                </Section>
            </div>

            <Section title="Engineering Snapshot" icon={<Wrench size={14} />}>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                    <Kpi label="Cur Lap" value={fmtLap(telemetryData.curLap)} />
                    <Kpi label="Last Lap" value={fmtLap(telemetryData.lastLap)} />
                    <Kpi label="Best Lap" value={fmtLap(telemetryData.bestLap)} />
                    <Kpi label="Leader Laps" value={fmtInt(telemetryData.leaderLaps, ' laps')} />
                    <Kpi label="Leader Avg" value={fmtLap(telemetryData.leaderAvgLapTime)} />
                    <Kpi label="Est. Pit Time" value={fmtFixed(telemetryData.strategyEstPitTime, 2, ' min')} />
                </div>
            </Section>

            <Section title="Bridge Extended" icon={<Gauge size={14} />}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs mb-2">
                    <Kpi label="Track Clock" value={fmtFixed(restApiData.track_clock_time, 1, ' s')} />
                    <Kpi label="Time Scale" value={`x${fmtFixed(restApiData.time_scale, 2)}`} />
                    <Kpi label="Pit Limit" value={fmtFixed(extendedPitLimit, 1, ' km/h')} valueClass="text-cyan-300" />
                    <Kpi label="Expected Fuel" value={fmtFixed(restApiData.expected_fuel_consumption, 2, ' L/lap')} valueClass="text-emerald-300" />
                    <Kpi label="Expected VE" value={fmtFixed(restApiData.expected_virtual_energy_consumption, 2, ' %/lap')} valueClass="text-emerald-300" />
                    <Kpi label="Penalty Points" value={fmtPenaltyPoints(telemetryData.lmu_extra?.['track_limits_steps'])} valueClass="text-amber-300" />
                </div>
                <div className="h-px bg-white/5 my-3" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                    <Kpi label="Aero Damage" value={fmtFixed(restApiData.aero_damage, 2, ' idx')} />
                    <Kpi label="Turbo" value={fmtFixed(telemetryData.turboPressure, 2, ' bar')} />
                    <Kpi label="Engine Torque" value={fmtInt(telemetryData.engineTorque, ' Nm')} />
                    <Kpi label="Steering Torque" value={fmtFixed(telemetryData.steeringShaftTorque, 2, ' Nm')} />
                    <Kpi label="Headlights" value={telemetryData.carState?.headlights ? 'ON' : 'OFF'} />
                    <Kpi label="Speed Limiter" value={telemetryData.carState?.speed_limiter ? 'ON' : 'OFF'} />
                    <div className="bg-black/30 rounded p-2 col-span-2 md:col-span-3 border border-white/5">
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Local Velocity (m/s)</span>
                        <span className="text-white font-mono text-sm">
                            x:{fmtFixed(telemetryData.localVelocity?.x, 2)} y:{fmtFixed(telemetryData.localVelocity?.y, 2)} z:{fmtFixed(telemetryData.localVelocity?.z, 2)}
                        </span>
                    </div>
                    <div className="bg-black/30 rounded p-2 col-span-2 md:col-span-3 border border-white/5">
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Local Acceleration (m/s2)</span>
                        <span className="text-white font-mono text-sm">
                            x:{fmtFixed(telemetryData.localAcceleration?.x, 2)} y:{fmtFixed(telemetryData.localAcceleration?.y, 2)} z:{fmtFixed(telemetryData.localAcceleration?.z, 2)}
                        </span>
                    </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500">Track limits conversion: 1 step = 0.25 penalty point.</div>
            </Section>

            {yellowFlag && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-200 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={14} /> Yellow flag active: watch deltas and avoid risky overtakes.
                </div>
            )}
            {trackWetness > 5 && (
                <div className="mt-2 bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-blue-200 text-xs font-bold flex items-center gap-2">
                    <CloudRain size={14} /> Wet track detected: {fmtInt(trackWetness, '%')} wetness.
                </div>
            )}
        </div>
    );
};

export default RaceControlView;


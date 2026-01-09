import React from 'react';
import { Zap, Activity, Thermometer, Gauge } from 'lucide-react';
import type { ElectricData } from '../../types';

interface HybridWidgetProps {
    data: ElectricData;
    soc: number; // State of Charge (0-100)
}

const HybridWidget: React.FC<HybridWidgetProps> = ({ data, soc }) => {
    // Le couple (torque) détermine si on est en Boost (Positif) ou Regen (Négatif)
    // On assume un max théorique de 500Nm pour l'affichage graphique (à ajuster selon LMU)
    const maxTorque = 500;
    const torqueVal = data.torque || 0;
    const isRegen = torqueVal < -5;
    const isBoost = torqueVal > 5;

    // Calcul pour la barre centrale (0 au milieu)
    // 50% = 0 Nm. 100% = +MaxNm. 0% = -MaxNm.
    const barPercentage = 50 + ((torqueVal / maxTorque) * 50);
    const clampedBar = Math.min(100, Math.max(0, barPercentage));

    // Couleurs dynamiques
    const getTempColor = (temp: number) => {
        if (temp > 110) return 'text-red-500 animate-pulse font-black';
        if (temp > 95) return 'text-amber-500 font-bold';
        return 'text-emerald-400';
    };

    return (
        <div className="bg-slate-900/80 rounded-xl p-4 border border-white/10 flex flex-col gap-3 shadow-lg relative overflow-hidden group">
            {/* Effet de fond subtil si Boost/Regen */}
            <div className={`absolute inset-0 opacity-10 transition-colors duration-300 pointer-events-none 
                ${isBoost ? 'bg-cyan-500' : isRegen ? 'bg-amber-500' : 'bg-transparent'}`}
            />

            {/* HEADER */}
            <div className="flex justify-between items-center z-10">
                <span className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                    <Zap size={14} className={isBoost ? "text-cyan-400 fill-cyan-400" : "text-slate-500"} />
                    Hybrid Unit
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider
                    ${isBoost ? 'bg-cyan-500 text-black' : isRegen ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-500'}`}>
                    {isBoost ? 'DEPLOY' : isRegen ? 'REGEN' : 'IDLE'}
                </span>
            </div>

            {/* BATTERIE (SOC) */}
            <div className="flex items-end justify-between z-10">
                <div>
                    <div className="text-[10px] text-slate-500 font-bold mb-0.5">BATTERY SOC</div>
                    <div className="text-3xl font-black text-white leading-none tracking-tighter">
                        {Math.round(soc)}<span className="text-lg text-slate-500 font-normal">%</span>
                    </div>
                </div>
                {/* Visualisation Barre Batterie */}
                <div className="flex flex-col gap-0.5 items-end w-1/2">
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div
                            className={`h-full transition-all duration-300 ${soc < 20 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'}`}
                            style={{ width: `${Math.min(100, Math.max(0, soc))}%` }}
                        />
                    </div>
                    <div className="text-[9px] text-slate-400">{data.charge ? (data.charge * 100).toFixed(1) : soc.toFixed(1)}% Raw</div>
                </div>
            </div>

            {/* BARRE DEPUISSANCE (BOOST / REGEN) */}
            <div className="relative h-8 bg-slate-950 rounded border border-slate-700 mt-1 overflow-hidden z-10">
                {/* Ligne Zéro (Milieu) */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-600 z-20"></div>

                {/* Barre active */}
                <div
                    className={`absolute top-0 bottom-0 transition-all duration-100 ease-linear z-10
                        ${isBoost ? 'bg-gradient-to-r from-cyan-600 to-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-gradient-to-l from-amber-600 to-amber-400'}`}
                    style={{
                        left: torqueVal >= 0 ? '50%' : `${clampedBar}%`,
                        right: torqueVal >= 0 ? `${100 - clampedBar}%` : '50%'
                    }}
                />

                {/* Valeur textuelle centrée */}
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow-md z-30 font-mono">
                    {Math.round(torqueVal)} Nm
                </div>
            </div>

            {/* INFOS TECHNIQUES (Temps & RPM) */}
            <div className="grid grid-cols-3 gap-2 mt-1 z-10">
                <div className="bg-black/30 rounded p-1.5 flex flex-col items-center border border-white/5">
                    <Thermometer size={10} className="text-slate-500 mb-1"/>
                    <span className="text-[9px] text-slate-500 uppercase">MGU</span>
                    <span className={`font-mono font-bold ${getTempColor(data.motorTemp)}`}>
                        {Math.round(data.motorTemp)}°
                    </span>
                </div>
                <div className="bg-black/30 rounded p-1.5 flex flex-col items-center border border-white/5">
                    <Activity size={10} className="text-slate-500 mb-1"/>
                    <span className="text-[9px] text-slate-500 uppercase">WATER</span>
                    <span className={`font-mono font-bold ${getTempColor(data.waterTemp)}`}>
                        {Math.round(data.waterTemp)}°
                    </span>
                </div>
                <div className="bg-black/30 rounded p-1.5 flex flex-col items-center border border-white/5">
                    <Gauge size={10} className="text-slate-500 mb-1"/>
                    <span className="text-[9px] text-slate-500 uppercase">RPM</span>
                    <span className="font-mono font-bold text-slate-200">
                        {(data.rpm / 1000).toFixed(1)}k
                    </span>
                </div>
            </div>
        </div>
    );
};

export default HybridWidget;
import React from 'react';
import { CloudRain, Cloud, Sun, Clock, Droplets, Thermometer } from 'lucide-react';
import type { WeatherNode } from '../../types';

interface WeatherWidgetProps {
    forecast: WeatherNode[];
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ forecast }) => {
    if (!forecast || forecast.length === 0) return (
        <div className="bg-slate-900/50 rounded-xl border border-white/5 p-4 flex items-center justify-center text-slate-500 text-xs">
            <Cloud size={16} className="mr-2 opacity-50"/> NO WEATHER DATA
        </div>
    );

    return (
        <div className="bg-slate-900/50 rounded-xl border border-white/5 p-3 flex flex-col gap-3">
            {/* En-tête */}
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                    <CloudRain size={12} className="text-blue-400"/> Forecast Trend
                </div>
                <div className="text-[9px] text-slate-500 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded">
                    <Clock size={10}/>
                    <span>SESSION</span>
                </div>
            </div>

            {/* Grille de prévisions */}
            <div className="grid grid-cols-5 gap-2 h-20">
                {forecast.map((node, i) => {
                    const rainPct = Math.round(node.rain * 100);
                    const cloudPct = Math.round(node.cloud * 100);
                    const isRain = rainPct > 0;

                    // Labels temporels approximatifs (basés sur les slots du jeu)
                    const labels = ["START", "1/4", "MID", "3/4", "END"];
                    const label = labels[i] || `T${i}`;

                    // Choix de l'icône
                    let WeatherIcon = Sun;
                    let iconColor = "text-amber-400";
                    let glow = "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]";

                    if (isRain) {
                        WeatherIcon = CloudRain;
                        iconColor = "text-blue-400";
                        glow = "drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]";
                    } else if (cloudPct > 60) {
                        WeatherIcon = Cloud;
                        iconColor = "text-slate-400";
                        glow = "";
                    } else if (cloudPct > 20) {
                        WeatherIcon = Cloud;
                        iconColor = "text-yellow-100"; // Voilé
                        glow = "";
                    }

                    return (
                        <div key={i} className="flex flex-col justify-between items-center bg-slate-800/40 rounded p-1 border border-white/5 relative group hover:bg-slate-800/80 transition-colors">

                            {/* Label Temps */}
                            <span className="text-[8px] font-bold text-slate-500 mb-1">{label}</span>

                            {/* Icône Principale */}
                            <div className="flex-1 flex items-center justify-center">
                                <WeatherIcon size={20} className={`${iconColor} ${glow} transition-all`} />
                            </div>

                            {/* Indicateurs (Barres) */}
                            <div className="w-full flex gap-1 h-1 mt-1 px-1">
                                {/* Barre Pluie (Bleue) */}
                                <div className="h-full bg-slate-700/50 flex-1 rounded-full overflow-hidden relative" title={`Rain: ${rainPct}%`}>
                                    <div className="absolute bottom-0 w-full bg-blue-500 transition-all duration-500" style={{height: `${rainPct}%`}}></div>
                                </div>
                                {/* Barre Nuage (Grise) */}
                                <div className="h-full bg-slate-700/50 flex-1 rounded-full overflow-hidden relative" title={`Clouds: ${cloudPct}%`}>
                                    <div className="absolute bottom-0 w-full bg-slate-400 transition-all duration-500" style={{height: `${cloudPct}%`}}></div>
                                </div>
                            </div>

                            {/* Valeur Numérique (Pluie ou Température) */}
                            <div className="mt-1 h-3 flex items-center justify-center w-full">
                                {isRain ? (
                                    <span className="text-[9px] font-black text-blue-300 flex items-center gap-0.5 animate-pulse">
                                        <Droplets size={8}/> {rainPct}%
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-mono text-slate-500 flex items-center gap-0.5">
                                        <Thermometer size={8}/> {Math.round(node.temp)}°
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WeatherWidget;
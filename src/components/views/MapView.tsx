import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Map as MapIcon, Trash2, Save, CheckCircle } from 'lucide-react'; // Ajout icônes
import type { RawVehicle, MapPoint } from '../../types'; // Import MapPoint

interface MapViewProps {
    vehicles?: RawVehicle[];
    myCarId?: number | string;

    // --- NOUVEAUX PROPS ---
    savedMap?: MapPoint[];           // La carte stockée en DB
    onSaveMap?: (points: MapPoint[]) => void; // Fonction pour sauvegarder
}

const CLASS_COLORS: Record<string, string> = {
    'hypercar': 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,1)] border-red-400',
    'lmp2': 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,1)] border-blue-400',
    'gt3': 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,1)] border-orange-300',
    'default': 'bg-slate-400'
};

const MapView: React.FC<MapViewProps> = ({ vehicles = [], myCarId, savedMap = [], onSaveMap }) => {
    // État local du tracé (si pas de carte sauvegardée)
    const [localTrack, setLocalTrack] = useState<MapPoint[]>([]);
    const [isRecording, setIsRecording] = useState(true);

    const lastPosRef = useRef<{x: number, z: number} | null>(null);

    // 1. CHOIX DE LA SOURCE (DB ou Local)
    // Si on a une carte en DB, on l'utilise. Sinon, on utilise le tracé local.
    const activeTrack = savedMap.length > 50 ? savedMap : localTrack;
    const isMapLoaded = savedMap.length > 50;

    // 2. ENREGISTREMENT DU TRACÉ (Seulement si pas de map chargée)
    useEffect(() => {
        if (isMapLoaded || !isRecording) return;

        const tracer = vehicles.find(v => String(v.id) === String(myCarId)) || vehicles.find(v => v.position === 1);
        if (!tracer || tracer.x === undefined || tracer.z === undefined) return;

        const x = tracer.x;
        const z = tracer.z;

        // Filtre distance (5m min)
        if (!lastPosRef.current || Math.hypot(lastPosRef.current.x - x, lastPosRef.current.z - z) > 5) {

            // Détection boucle bouclée (pour auto-save)
            // Si on a > 200 points et qu'on revient près du départ (< 30m)
            if (localTrack.length > 200 && Math.hypot(localTrack[0].x - x, localTrack[0].z - z) < 30) {
                // On ferme la boucle
                const finalTrack = [...localTrack, { x, z }];
                setLocalTrack(finalTrack);
                setIsRecording(false); // Stop recording

                // AUTO-SAVE vers Supabase !
                if (onSaveMap) onSaveMap(finalTrack);
            } else {
                setLocalTrack(prev => [...prev, { x, z }]);
            }

            lastPosRef.current = { x, z };
        }
    }, [vehicles, isMapLoaded, isRecording, localTrack, onSaveMap]);

    // 3. CALCUL DES LIMITES (BOUNDS)
    const bounds = useMemo(() => {
        const allPoints = [...vehicles.map(v => ({x: v.x, z: v.z})), ...activeTrack];
        if (allPoints.length === 0) return null;

        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        allPoints.forEach(p => {
            if (p.x !== undefined && p.z !== undefined) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.z < minZ) minZ = p.z;
                if (p.z > maxZ) maxZ = p.z;
            }
        });

        const width = maxX - minX;
        const height = maxZ - minZ;
        const padding = Math.max(width, height) * 0.1;

        return {
            minX: minX - padding, maxX: maxX + padding,
            minZ: minZ - padding, maxZ: maxZ + padding,
            width: width + padding * 2, height: height + padding * 2
        };
    }, [vehicles, activeTrack]);

    const project = (x: number, z: number) => {
        if (!bounds) return { left: '50%', top: '50%' };
        const pctX = ((x - bounds.minX) / bounds.width) * 100;
        const pctY = 100 - ((z - bounds.minZ) / bounds.height) * 100;
        return { left: `${pctX}%`, top: `${pctY}%` };
    };

    if (!bounds || (activeTrack.length === 0 && vehicles.length === 0)) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-[#050a10] rounded-xl border border-white/5">
            <span className="animate-pulse flex items-center gap-2 mb-2"><MapIcon/> WAITING FOR DATA...</span>
        </div>
    );

    return (
        <div className="h-full w-full bg-[#0b0f19] relative overflow-hidden rounded-xl border border-white/10 shadow-2xl">

            {/* --- TRACÉ (SVG) --- */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
                <polyline
                    points={activeTrack.map(p => {
                        const pos = project(p.x, p.z);
                        // Convertir % en coordonnées relatives au SVG (0-100 non supporté direct dans polyline points parfois, mieux vaut line loop)
                        // Simplification : on utilise des lignes individuelles pour React
                        return "";
                    }).join(" ")}
                />
                {/* Dessin optimisé par lignes */}
                {activeTrack.map((p, i) => {
                    if (i === 0) return null;
                    const prev = activeTrack[i-1];
                    if (Math.hypot(p.x - prev.x, p.z - prev.z) > 100) return null;
                    const pos1 = project(prev.x, prev.z);
                    const pos2 = project(p.x, p.z);
                    return (
                        <line
                            key={i}
                            x1={pos1.left} y1={pos1.top}
                            x2={pos2.left} y2={pos2.top}
                            stroke="#475569" strokeWidth="3" strokeLinecap="round"
                        />
                    );
                })}
            </svg>

            {/* --- VÉHICULES --- */}
            {vehicles.map((v) => {
                if (v.x === undefined || v.z === undefined) return null;
                const pos = project(v.x, v.z);
                const isMe = String(v.id) === String(myCarId) || v.is_player === 1;

                let clsKey = 'default';
                const cStr = (v.class || "").toLowerCase();
                if (cStr.includes('hyper') || cStr.includes('lmh')) clsKey = 'hypercar';
                else if (cStr.includes('lmp2')) clsKey = 'lmp2';
                else if (cStr.includes('gt3')) clsKey = 'gt3';

                const zIndex = isMe ? 50 : 10;
                const dotClass = isMe
                    ? "bg-white border-4 border-indigo-500 shadow-[0_0_20px_white] animate-pulse w-5 h-5"
                    : `${CLASS_COLORS[clsKey]} w-3 h-3`;

                return (
                    <div
                        key={v.id || Math.random()}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-500 ease-linear ${dotClass}`}
                        style={{ ...pos, zIndex }}
                    >
                        {/* Label */}
                        {(isMe || v.position <= 3) && (
                            <div className={`absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-black px-1.5 py-0.5 rounded ${isMe ? 'bg-indigo-600 text-white' : 'bg-black/60 text-white'} shadow whitespace-nowrap`}>
                                {v.in_pits ? 'PIT ' : ''}P{v.position}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* --- INFO STATUS --- */}
            <div className="absolute bottom-4 left-4 text-[10px] font-mono flex items-center gap-2 bg-black/40 px-3 py-1 rounded border border-white/5 text-slate-400">
                {isMapLoaded ? (
                    <><CheckCircle size={12} className="text-emerald-500"/> MAP SAVED</>
                ) : (
                    <><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> MAPPING...</>
                )}
                <span>• {activeTrack.length} PTS</span>
            </div>

            {/* BOUTON SAVE MANUEL (Si mapping en cours et assez de points) */}
            {!isMapLoaded && localTrack.length > 100 && (
                <button
                    onClick={() => onSaveMap && onSaveMap(localTrack)}
                    className="absolute bottom-4 right-12 bg-indigo-600 hover:bg-indigo-500 p-2 rounded text-white transition-colors shadow-lg"
                    title="Save Map Now"
                >
                    <Save size={16}/>
                </button>
            )}

            {/* BOUTON RESET */}
            <button
                onClick={() => {
                    setLocalTrack([]);
                    // Optionnel : on pourrait aussi vider la DB si on voulait, mais restons local pour l'instant
                }}
                className="absolute bottom-4 right-4 bg-slate-800 p-2 rounded text-slate-400 hover:text-white border border-white/10"
                title="Reset Local Trace"
            >
                <Trash2 size={16}/>
            </button>
        </div>
    );
};

export default MapView;
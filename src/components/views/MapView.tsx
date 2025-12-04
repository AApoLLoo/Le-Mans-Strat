import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Map as MapIcon, Trash2, Flag } from 'lucide-react';
import type { RawVehicle } from '../../types';

interface MapViewProps {
    vehicles?: RawVehicle[];
    myCarId?: number | string;
}

const CLASS_COLORS: Record<string, string> = {
    'hypercar': 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,1)] border-red-400',
    'lmp2': 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,1)] border-blue-400',
    'gt3': 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,1)] border-orange-300',
    'default': 'bg-slate-400'
};

const MapView: React.FC<MapViewProps> = ({ vehicles = [], myCarId }) => {
    // --- 1. LOGIQUE D'ENREGISTREMENT (Comme TinyPedal) ---
    const [trackPoints, setTrackPoints] = useState<{x: number, z: number, isPit: boolean}[]>([]);
    const [sectorLines, setSectorLines] = useState<{x: number, z: number, id: number}[]>([]);

    const lastPosRef = useRef<{x: number, z: number} | null>(null);
    const lastSectorRef = useRef<number>(-1);
    const recordingRef = useRef<boolean>(false);

    // On utilise la voiture du joueur (ou le leader) comme "Stylo" pour dessiner
    const tracer = vehicles.find(v => String(v.id) === String(myCarId)) || vehicles.find(v => v.position === 1);

    useEffect(() => {
        if (!tracer || tracer.x === undefined || tracer.z === undefined) return;

        const x = tracer.x;
        const z = tracer.z;
        // "in_pits" est souvent stocké dans 'in_pits' ou on le déduit
        const inPits = !!tracer.in_pits;

        // Secteur actuel (si disponible dans les données du bridge, sinon on ignore)
        // Note: Il faudrait que le bridge envoie 'sector' dans rawVehicle
        // On simule ici si la donnée n'est pas dispo dans RawVehicle pour l'instant

        // --- A. ENREGISTREMENT DU TRACÉ ---
        // On ajoute un point tous les 10 mètres pour ne pas surcharger
        if (!lastPosRef.current || Math.hypot(lastPosRef.current.x - x, lastPosRef.current.z - z) > 10) {

            // Si on vient de boucler un tour (repassage près du départ), on arrête d'enregistrer pour figer la carte
            // (Logique simplifiée : si on a beaucoup de points et qu'on revient au début)
            if (trackPoints.length > 200 && lastPosRef.current && Math.hypot(trackPoints[0].x - x, trackPoints[0].z - z) < 20) {
                // Tour bouclé : on peut arrêter d'ajouter des points pour stabiliser la map
                // recordingRef.current = false;
            }

            setTrackPoints(prev => [...prev, { x, z, isPit: inPits }]);
            lastPosRef.current = { x, z };
        }

    }, [tracer]);

    // --- 2. MISE A L'ECHELLE AUTOMATIQUE (BOUNDS) ---
    const bounds = useMemo(() => {
        const points = [...vehicles.map(v => ({x: v.x, z: v.z})), ...trackPoints];
        if (points.length === 0) return null;

        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        points.forEach(p => {
            if (p.x !== undefined && p.z !== undefined) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.z < minZ) minZ = p.z;
                if (p.z > maxZ) maxZ = p.z;
            }
        });

        const width = maxX - minX;
        const height = maxZ - minZ;
        const padding = Math.max(width, height) * 0.1; // 10% de marge

        return {
            minX: minX - padding, maxX: maxX + padding,
            minZ: minZ - padding, maxZ: maxZ + padding,
            width: width + padding * 2, height: height + padding * 2
        };
    }, [vehicles, trackPoints]);

    const project = (x: number, z: number) => {
        if (!bounds) return { left: '50%', top: '50%' };
        const pctX = ((x - bounds.minX) / bounds.width) * 100;
        const pctY = 100 - ((z - bounds.minZ) / bounds.height) * 100; // Inversion Z
        return { left: `${pctX}%`, top: `${pctY}%` };
    };

    if (!bounds || vehicles.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-[#050a10] rounded-xl border border-white/5">
            <span className="animate-pulse flex items-center gap-2 mb-2"><MapIcon/> WAITING FOR GPS...</span>
            <span className="text-xs text-slate-600">Drive a lap to map the track</span>
        </div>
    );

    return (
        <div className="h-full w-full bg-[#0b0f19] relative overflow-hidden rounded-xl border border-white/10 shadow-2xl">

            {/* --- COUCHE 1 : LA PISTE (Enregistrée) --- */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50">
                {trackPoints.map((p, i) => {
                    if (i === 0) return null;
                    const prev = trackPoints[i-1];
                    // On ne dessine pas si grand saut (téléportation)
                    if (Math.hypot(p.x - prev.x, p.z - prev.z) > 100) return null;

                    const pos1 = project(prev.x, prev.z);
                    const pos2 = project(p.x, p.z);

                    return (
                        <line
                            key={i}
                            x1={pos1.left} y1={pos1.top}
                            x2={pos2.left} y2={pos2.top}
                            stroke={p.isPit ? "#a855f7" : "#475569"} // Violet pour les stands, Gris pour la piste
                            strokeWidth={p.isPit ? "2" : "4"}
                            strokeLinecap="round"
                        />
                    );
                })}
            </svg>

            {/* --- COUCHE 2 : VÉHICULES --- */}
            {vehicles.map((v) => {
                if (v.x === undefined || v.z === undefined) return null;
                const pos = project(v.x, v.z);
                const isMe = String(v.id) === String(myCarId) || v.is_player === 1;

                // Style de la voiture
                let clsKey = 'default';
                const cStr = (v.class || "").toLowerCase();
                if (cStr.includes('hyper') || cStr.includes('lmh')) clsKey = 'hypercar';
                else if (cStr.includes('lmp2')) clsKey = 'lmp2';
                else if (cStr.includes('gt3')) clsKey = 'gt3';

                const zIndex = isMe ? 50 : 10;
                const dotColor = CLASS_COLORS[clsKey];
                const size = isMe ? 'w-4 h-4' : 'w-2.5 h-2.5';

                return (
                    <div
                        key={v.id || Math.random()}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-linear rounded-full border ${dotColor} ${size}`}
                        style={{ ...pos, zIndex }}
                    >
                        {/* Label (Numéro position) */}
                        {(isMe || v.position <= 3) && (
                            <div className={`absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black px-1.5 py-0.5 rounded ${isMe ? 'bg-white text-black' : 'bg-black/60 text-white'} shadow whitespace-nowrap`}>
                                P{v.position}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* --- LÉGENDE --- */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur border border-white/10 p-3 rounded-lg text-[10px] text-slate-300 flex flex-col gap-1.5">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600 border border-red-400"></div> HYPERCAR</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-600 border border-blue-400"></div> LMP2</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500 border border-orange-300"></div> LMGT3</div>
                <div className="h-px bg-white/10 my-0.5"></div>
                <div className="flex items-center gap-2"><div className="w-3 h-1 bg-slate-500 rounded"></div> TRACK</div>
                <div className="flex items-center gap-2"><div className="w-3 h-1 bg-purple-500 rounded"></div> PIT LANE</div>
            </div>

            {/* --- RESET --- */}
            <button onClick={() => setTrackPoints([])} className="absolute bottom-4 right-4 bg-slate-800 p-2 rounded text-slate-400 hover:text-white border border-white/10" title="Reset Map Trace">
                <Trash2 size={16}/>
            </button>

            <div className="absolute bottom-4 left-4 text-[10px] text-slate-500 font-mono flex items-center gap-2">
                <span>{trackPoints.length > 50 ? "TRACK MAPPED" : "MAPPING..."}</span>
                <span>•</span>
                <span>{vehicles.length} CARS</span>
            </div>
        </div>
    );
};

export default MapView;
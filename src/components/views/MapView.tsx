import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Map as MapIcon, Trash2, Save, Flag } from 'lucide-react';
import type { RawVehicle, MapPoint } from '../../types';

interface MapViewProps {
    vehicles?: RawVehicle[];
    myCarId?: number | string;
    savedMap?: MapPoint[];
    onSaveMap?: (points: MapPoint[]) => void;
}

const CLASS_COLORS: Record<string, string> = {
    'hypercar': '#ff3333',
    'lmp2': '#3399ff',
    'gt3': '#ff9933',
    'default': '#cccccc'
};

const MapView: React.FC<MapViewProps> = ({ vehicles = [], savedMap = [], onSaveMap }) => {
    const [localTrack, setLocalTrack] = useState<MapPoint[]>([]);
    const [isRecording, setIsRecording] = useState(true);
    const [hasCrossedStart, setHasCrossedStart] = useState(false);

    const lastPosRef = useRef<{x: number, z: number} | null>(null);
    const lastLapsCountRef = useRef<number>(-1);

    const activeTrack = savedMap.length > 50 ? savedMap : localTrack;
    const isMapLoaded = savedMap.length > 50;

    // --- ENREGISTREMENT AVEC SECTEURS ---
    useEffect(() => {
        if (isMapLoaded || !isRecording) return;

        const tracer = vehicles.find(v => v.is_player === 1) || vehicles.find(v => v.position === 1);
        if (!tracer || tracer.x === undefined || tracer.z === undefined) return;

        const currentLaps = tracer.laps || 0;
        // Normalisation du secteur (0 = 3 dans rF2/LMU)
        const currentSector = (tracer.sector === 0) ? 3 : (tracer.sector || 1);

        // DÉTECTION LIGNE DE DÉPART
        if (lastLapsCountRef.current > -1 && currentLaps > lastLapsCountRef.current) {
            if (!hasCrossedStart) {
                console.log("🏁 START LINE DETECTED");
                setHasCrossedStart(true);
                // On enregistre le premier point avec son secteur
                setLocalTrack([{ x: tracer.x, z: tracer.z, sector: currentSector }]);
                lastPosRef.current = { x: tracer.x, z: tracer.z };
            }
        }
        lastLapsCountRef.current = currentLaps;

        // ENREGISTREMENT DES POINTS
        if (hasCrossedStart && lastPosRef.current) {
            const { x, z } = tracer;
            if (Math.hypot(lastPosRef.current.x - x, lastPosRef.current.z - z) > 5) {

                // Si on boucle (Auto-Save)
                if (localTrack.length > 200 && Math.hypot(localTrack[0].x - x, localTrack[0].z - z) < 40) {
                    const finalTrack = [...localTrack, { x, z, sector: currentSector }];
                    setLocalTrack(finalTrack);
                    setIsRecording(false);
                    if (onSaveMap) onSaveMap(finalTrack);
                } else {
                    // Ajout du point avec son secteur
                    setLocalTrack(prev => [...prev, { x, z, sector: currentSector }]);
                }
                lastPosRef.current = { x, z };
            }
        }
    }, [vehicles, isMapLoaded, isRecording, localTrack, onSaveMap, hasCrossedStart]);

    const handleReset = () => {
        if (confirm("🗑️ Voulez-vous vraiment SUPPRIMER la carte ?")) {
            setLocalTrack([]);
            setHasCrossedStart(false);
            setIsRecording(true);
            lastLapsCountRef.current = -1;
            lastPosRef.current = null;
            if (onSaveMap) onSaveMap([]);
        }
    };

    // --- BOUNDS & PROJECTION ---
    const bounds = useMemo(() => {
        const points = activeTrack.length > 20 ? activeTrack : vehicles.map(v => ({x: v.x, z: v.z}));
        if (points.length === 0) return null;
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        points.forEach(p => {
            if (p.x !== undefined && p.z !== undefined) {
                if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
                if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
            }
        });
        const width = maxX - minX; const height = maxZ - minZ;
        const padding = Math.max(width, height) * 0.15;
        return { minX: minX - padding, width: width + padding * 2, minZ: minZ - padding, height: height + padding * 2 };
    }, [activeTrack, vehicles.length === 0]);

    const project = (x: number, z: number) => {
        if (!bounds) return { x: 50, y: 50 };
        const pctX = ((x - bounds.minX) / bounds.width) * 100;
        const pctY = 100 - ((z - bounds.minZ) / bounds.height) * 100;
        return { x: pctX, y: pctY };
    };

    const trackPath = useMemo(() => {
        if (activeTrack.length < 2) return "";
        return activeTrack.map((p, i) => {
            const pos = project(p.x, p.z);
            return `${i === 0 ? 'M' : 'L'} ${pos.x} ${pos.y}`;
        }).join(" ");
    }, [activeTrack, bounds]);

    // --- CALCUL DES ÉLÉMENTS GRAPHIQUES (Lignes S1/S2/Départ) ---
    const mapElements = useMemo(() => {
        if (activeTrack.length < 5 || !bounds) return { startLine: null, splitLines: [] };

        // 1. LIGNE DE DÉPART (Point 0)
        const p0 = project(activeTrack[0].x, activeTrack[0].z);
        const pNext = project(activeTrack[Math.min(activeTrack.length-1, 4)].x, activeTrack[Math.min(activeTrack.length-1, 4)].z);
        const startAngle = (Math.atan2(pNext.y - p0.y, pNext.x - p0.x) * 180 / Math.PI) + 90;

        const startLine = { x: p0.x, y: p0.y, rotation: startAngle };

        // 2. LIGNES DE SECTEURS (Transitions)
        const splitLines: { x: number, y: number, rotation: number, label: string }[] = [];

        for (let i = 1; i < activeTrack.length - 1; i++) {
            const prev = activeTrack[i-1];
            const curr = activeTrack[i];
            const next = activeTrack[i+1];

            // Si on a l'info secteur et qu'elle change
            if (prev.sector && curr.sector && prev.sector !== curr.sector) {
                // On détecte Fin S1 (1->2) et Fin S2 (2->3)
                if ((prev.sector === 1 && curr.sector === 2) || (prev.sector === 2 && curr.sector === 3)) {
                    const pCurr = project(curr.x, curr.z);
                    const pNextPos = project(next.x, next.z);
                    const angle = (Math.atan2(pNextPos.y - pCurr.y, pNextPos.x - pCurr.x) * 180 / Math.PI) + 90;

                    splitLines.push({
                        x: pCurr.x,
                        y: pCurr.y,
                        rotation: angle,
                        label: prev.sector === 1 ? "S1" : "S2"
                    });
                }
            }
        }

        return { startLine, splitLines };
    }, [activeTrack, bounds]);


    if (!bounds || (activeTrack.length === 0 && !hasCrossedStart)) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-[#121212] rounded-xl border border-white/10">
            <div className="flex flex-col items-center animate-pulse">
                <Flag size={32} className="mb-3 text-yellow-500"/>
                <span className="font-black tracking-wider text-sm">WAITING FOR START LINE</span>
                <span className="text-xs mt-1 opacity-60">Drive a full lap to map the track</span>
            </div>
        </div>
    );

    return (
        <div className="h-full w-full bg-[#121212] relative overflow-hidden rounded-xl border border-white/10 shadow-2xl select-none">

            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <pattern id="checker" x="0" y="0" width="2" height="2" patternUnits="userSpaceOnUse">
                        <rect x="0" y="0" width="1" height="1" fill="white" />
                        <rect x="1" y="0" width="1" height="1" fill="black" />
                        <rect x="0" y="1" width="1" height="1" fill="black" />
                        <rect x="1" y="1" width="1" height="1" fill="white" />
                    </pattern>
                </defs>

                {/* TRACÉ */}
                <path d={trackPath} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" transform="translate(0.5, 0.5)" />
                <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
                <path d={trackPath} fill="none" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />

                {/* LIGNE DE DÉPART (DAMIER) */}
                {mapElements.startLine && isMapLoaded && (
                    <rect
                        x={mapElements.startLine.x - 2.5} y={mapElements.startLine.y - 0.75}
                        width="5" height="1.5"
                        fill="url(#checker)" stroke="white" strokeWidth="0.1"
                        transform={`rotate(${mapElements.startLine.rotation}, ${mapElements.startLine.x}, ${mapElements.startLine.y})`}
                    />
                )}

                {/* LIGNES DE SECTEURS (JAUNE POINTILLÉ) */}
                {isMapLoaded && mapElements.splitLines.map((line, idx) => (
                    <g key={idx}>
                        <line
                            x1={line.x - 3} y1={line.y} x2={line.x + 3} y2={line.y}
                            stroke="#eab308" strokeWidth="0.6" strokeDasharray="1 1"
                            transform={`rotate(${line.rotation}, ${line.x}, ${line.y})`}
                        />
                        {/* Label S1/S2 */}
                        <text
                            x={line.x + 4} y={line.y}
                            fill="#eab308" fontSize="2.5" fontWeight="bold" fontFamily="monospace"
                            transform={`rotate(0, ${line.x}, ${line.y})`} // On garde le texte droit
                            style={{ textShadow: '1px 1px 2px black' }}
                        >
                            {line.label}
                        </text>
                    </g>
                ))}
            </svg>

            {/* VOITURES */}
            {vehicles.map((v) => {
                if (v.x === undefined || v.z === undefined) return null;
                const coords = project(v.x, v.z);
                const isMe = v.is_player === 1;

                let clsColor = CLASS_COLORS['default'];
                const cStr = (v.class || "").toLowerCase();
                if (cStr.includes('hyper') || cStr.includes('lmh') || cStr.includes('lmdh')) clsColor = CLASS_COLORS['hypercar'];
                else if (cStr.includes('lmp2')) clsColor = CLASS_COLORS['lmp2'];
                else if (cStr.includes('gt3')) clsColor = CLASS_COLORS['gt3'];

                const zIndex = isMe ? 60 : (v.position && v.position <= 10 ? 50 : 10);
                const showLabel = isMe || (v.position && v.position <= 10);

                return (
                    <div key={v.id || Math.random()} className="absolute flex items-center justify-center transition-all duration-200 ease-linear will-change-transform"
                         style={{ left: `${coords.x}%`, top: `${coords.y}%`, zIndex, transform: 'translate(-50%, -50%)' }}>

                        <div className={`rounded-full shadow-[0_0_8px_currentColor] border-[1.5px] border-white ${isMe ? 'w-3 h-3 animate-pulse scale-110' : 'w-2.5 h-2.5'}`}
                             style={{ backgroundColor: clsColor, color: clsColor }} />

                        {showLabel && (
                            <div className="absolute left-3 -top-2 flex items-center">
                                <div className={`px-1.5 py-0.5 text-[9px] font-black uppercase skew-x-[-10deg] shadow-md flex items-center gap-1
                                                ${isMe ? 'bg-white text-black' : 'bg-neutral-900 text-white border-l-2'}`}
                                     style={{ borderColor: isMe ? 'transparent' : clsColor }}>
                                    {isMe ? <span>ME</span> : (
                                        <><span>P{v.position}</span>
                                            {v.position <= 3 && v.driver && (
                                                <span className="opacity-70 ml-0.5 border-l border-white/30 pl-0.5">{v.driver.split(' ').pop()?.substring(0, 3).toUpperCase()}</span>
                                            )}</>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* COMMANDES */}
            <div className="absolute bottom-3 left-3 flex gap-2 pointer-events-auto">
                {!isMapLoaded && localTrack.length > 50 && hasCrossedStart && (
                    <button onClick={() => onSaveMap && onSaveMap(localTrack)} className="bg-white hover:bg-slate-200 text-black p-2 rounded-full shadow-lg transition-all active:scale-95">
                        <Save size={16}/>
                    </button>
                )}
                <button onClick={handleReset} className="bg-black/60 hover:bg-black/90 text-white p-2 rounded-full border border-white/10 transition-all active:scale-95">
                    <Trash2 size={16}/>
                </button>
            </div>

            {/* Indicateur Mapping */}
            {!isMapLoaded && hasCrossedStart && isRecording && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600/80 text-white text-[9px] font-bold px-2 py-1 rounded-full animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div> REC
                </div>
            )}
        </div>
    );
};

export default MapView;
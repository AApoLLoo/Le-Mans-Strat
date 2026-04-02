import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Map as MapIcon, Trash2, Save, Flag } from 'lucide-react';
import type { RawVehicle, MapPoint } from '../../types';
import { getClassHexColor } from '../../utils/carClasses';
import {
    MAP_PADDING,
    MAP_MIN_POINTS_LOADED,
    MAP_MIN_DISTANCE_BETWEEN_POINTS,
    MAP_MIN_POINTS_FOR_LOOP,
    MAP_SECTOR_DEBOUNCE_MS,
    MAP_LOOP_CLOSURE_DISTANCE,
    MAP_DOT_SCALE,
    MAP_STROKE_SCALE,
    MAP_LABEL_SCALE,
} from '../../constants';

interface MapViewProps {
    vehicles?: RawVehicle[];
    savedMap?: MapPoint[];
    trackName?: string;
    trackLength?: number;
    onSaveMap?: (points: MapPoint[]) => void;
}

const getTrackKey = (name?: string, length?: number) => {
    const safeName = (name || '').trim().toUpperCase();
    const safeLen = Math.round(Number(length || 0));
    if (!safeName || safeName === 'WAITING...' || safeName === 'UNKNOWN') return '';
    return safeLen > 0 ? `${safeName}_${safeLen}` : safeName;
};

const MapView: React.FC<MapViewProps> = ({ vehicles = [], savedMap = [], onSaveMap, trackName, trackLength }) => {
    const [localTrack, setLocalTrack] = useState<MapPoint[]>([]);
    const [isRecording, setIsRecording] = useState(true);
    const [hasCrossedStart, setHasCrossedStart] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [showTop10Labels, setShowTop10Labels] = useState(true);
    const [showSectorLines, setShowSectorLines] = useState(true);
    const [autoSaveLoop, setAutoSaveLoop] = useState(true);
    const [autoRecord, setAutoRecord] = useState(true);

    const lastPosRef = useRef<{ x: number; z: number } | null>(null);
    const lastLapsCountRef = useRef<number>(-1);
    const lastSectorRef = useRef<number>(-1);
    const lastSectorChangeTimeRef = useRef<number>(0);
    const seenSectorsRef = useRef<Set<number>>(new Set());
    const lastTrackKeyRef = useRef<string>(getTrackKey(trackName, trackLength));
    const localTrackRef = useRef<MapPoint[]>(localTrack);
    localTrackRef.current = localTrack;

    // Stable bounds: grow-only policy to prevent map jumping
    const stableBoundsRef = useRef<{ minX: number; maxX: number; minZ: number; maxZ: number } | null>(null);

    // --- RESET ON TRACK CHANGE ---
    useEffect(() => {
        const currentTrackKey = getTrackKey(trackName, trackLength);
        if (!currentTrackKey || currentTrackKey === lastTrackKeyRef.current) return;
        lastTrackKeyRef.current = currentTrackKey;

        setLocalTrack([]);
        setHasCrossedStart(false);
        setIsRecording(true);
        lastLapsCountRef.current = -1;
        lastSectorRef.current = -1;
        lastSectorChangeTimeRef.current = 0;
        seenSectorsRef.current = new Set();
        lastPosRef.current = null;
        stableBoundsRef.current = null;
        console.log(`Map: new track detected: ${currentTrackKey} -> Reset`);
    }, [trackName, trackLength]);

    const isMapLoaded = savedMap.length > MAP_MIN_POINTS_LOADED;
    const activeTrack = isMapLoaded ? savedMap : localTrack;

    // --- RECORDING WITH SECTOR TRACKING ---
    useEffect(() => {
        if (isMapLoaded || !isRecording || !autoRecord) return;

        const tracer = vehicles.find(v => v.is_player === 1) || vehicles.find(v => v.position === 1);
        if (!tracer || tracer.x === undefined || tracer.z === undefined) return;

        const currentLaps = tracer.laps || 0;

        // Robust sector normalization
        const rawSector = tracer.sector;
        const currentSector =
            rawSector === 0 || rawSector === 3 ? 3
            : rawSector === 1 ? 1
            : rawSector === 2 ? 2
            : -1; // unknown: skip transition logic

        const prevSector = lastSectorRef.current;
        const now = Date.now();

        const lapIncreased = lastLapsCountRef.current > -1 && currentLaps > lastLapsCountRef.current;

        // Debounced sector transition
        const sectorChanged = currentSector !== -1 && currentSector !== prevSector && prevSector !== -1;
        const debounceOk = now - lastSectorChangeTimeRef.current > MAP_SECTOR_DEBOUNCE_MS;
        const sectorStartTransition = sectorChanged && debounceOk && prevSector === 3 && currentSector === 1;

        if (sectorChanged && debounceOk) {
            lastSectorChangeTimeRef.current = now;
            seenSectorsRef.current.add(currentSector);
        }

        // Track sectors seen (even on first tick)
        if (currentSector !== -1) {
            seenSectorsRef.current.add(currentSector);
        }

        // START LINE DETECTION
        // Case 1: lap counter increased or sector 3->1 transition
        // Case 2: joining mid-race (first tick already has laps > 0 and we're at sector 1)
        const joiningMidRace =
            lastLapsCountRef.current === -1 &&
            currentLaps > 0 &&
            currentSector === 1;

        if (lapIncreased || sectorStartTransition || joiningMidRace) {
            if (!hasCrossedStart) {
                console.log('Map: START LINE DETECTED');
                setHasCrossedStart(true);
                setLocalTrack([{ x: tracer.x, z: tracer.z, sector: currentSector === -1 ? 1 : currentSector }]);
                lastPosRef.current = { x: tracer.x, z: tracer.z };
            }
        }

        lastLapsCountRef.current = currentLaps;
        if (currentSector !== -1) lastSectorRef.current = currentSector;

        // RECORD POINTS
        if (!hasCrossedStart || !lastPosRef.current) return;

        const { x, z } = tracer;
        const dist = Math.hypot(lastPosRef.current.x - x, lastPosRef.current.z - z);
        if (dist <= MAP_MIN_DISTANCE_BETWEEN_POINTS) return;

        const track = localTrackRef.current;

        // Loop closure: primary = lap counter increased, secondary = distance + all 3 sectors seen
        const allSectorsSeen = seenSectorsRef.current.has(1) && seenSectorsRef.current.has(2) && seenSectorsRef.current.has(3);
        const closeByDistance =
            track.length > MAP_MIN_POINTS_FOR_LOOP &&
            allSectorsSeen &&
            Math.hypot(track[0].x - x, track[0].z - z) < MAP_LOOP_CLOSURE_DISTANCE;
        const closeByLap = track.length > MAP_MIN_POINTS_FOR_LOOP && lapIncreased;

        if (closeByDistance || closeByLap) {
            const finalTrack = [...track, { x, z, sector: currentSector === -1 ? lastSectorRef.current : currentSector }];
            setLocalTrack(finalTrack);
            setIsRecording(false);
            if (autoSaveLoop && onSaveMap) onSaveMap(finalTrack);
        } else {
            setLocalTrack(prev => [...prev, { x, z, sector: currentSector === -1 ? lastSectorRef.current : currentSector }]);
        }
        lastPosRef.current = { x, z };
    }, [vehicles, isMapLoaded, isRecording, onSaveMap, hasCrossedStart, autoSaveLoop, autoRecord]);

    const handleReset = () => {
        if (confirm('Voulez-vous vraiment SUPPRIMER la carte ?')) {
            setLocalTrack([]);
            setHasCrossedStart(false);
            setIsRecording(true);
            lastLapsCountRef.current = -1;
            lastSectorRef.current = -1;
            lastSectorChangeTimeRef.current = 0;
            seenSectorsRef.current = new Set();
            lastPosRef.current = null;
            stableBoundsRef.current = null;
            if (onSaveMap) onSaveMap([]);
        }
    };

    // --- STABLE BOUNDS (grow-only) ---
    const rawBounds = useMemo(() => {
        // If track loaded, use track points only for stable bounds
        const points = activeTrack.length > 20
            ? activeTrack
            : vehicles.map(v => ({ x: v.x, z: v.z })).filter(p => p.x !== undefined && p.z !== undefined);

        if (points.length === 0) return null;

        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const p of points) {
            if (p.x !== undefined && p.z !== undefined) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.z < minZ) minZ = p.z;
                if (p.z > maxZ) maxZ = p.z;
            }
        }

        const rawWidth = maxX - minX;
        const rawHeight = maxZ - minZ;
        const padding = Math.max(rawWidth, rawHeight) * MAP_PADDING;

        return {
            minX: minX - padding,
            maxX: maxX + padding,
            minZ: minZ - padding,
            maxZ: maxZ + padding,
        };
    }, [activeTrack, vehicles]);

    // Apply grow-only policy
    useEffect(() => {
        if (!rawBounds) return;
        const prev = stableBoundsRef.current;
        if (!prev) {
            stableBoundsRef.current = { ...rawBounds };
            return;
        }
        // Only expand, never shrink
        stableBoundsRef.current = {
            minX: Math.min(prev.minX, rawBounds.minX),
            maxX: Math.max(prev.maxX, rawBounds.maxX),
            minZ: Math.min(prev.minZ, rawBounds.minZ),
            maxZ: Math.max(prev.maxZ, rawBounds.maxZ),
        };
    }, [rawBounds]);

    // Compute final bounds: if track is loaded, freeze them from track points only
    const bounds = useMemo(() => {
        if (isMapLoaded && activeTrack.length > 20) {
            // Compute once from track, ignoring vehicles
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            for (const p of activeTrack) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.z < minZ) minZ = p.z;
                if (p.z > maxZ) maxZ = p.z;
            }
            const rawW = maxX - minX;
            const rawH = maxZ - minZ;
            const pad = Math.max(rawW, rawH) * MAP_PADDING;
            return { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
        }
        return stableBoundsRef.current;
    }, [isMapLoaded, activeTrack]);

    const project = useCallback((x: number, z: number) => {
        if (!bounds) return { x: 0, y: 0 };
        return {
            x: x - bounds.minX,
            y: (bounds.maxZ - bounds.minZ) - (z - bounds.minZ), // flip Z (SVG Y grows down)
        };
    }, [bounds]);

    const viewBoxWidth = bounds ? bounds.maxX - bounds.minX : 100;
    const viewBoxHeight = bounds ? bounds.maxZ - bounds.minZ : 100;
    const scale = Math.max(viewBoxWidth, viewBoxHeight);

    const strokeWidth = scale * MAP_STROKE_SCALE;
    const dotRadius = scale * MAP_DOT_SCALE;
    const labelFontSize = scale * MAP_LABEL_SCALE;
    const sectorLineLen = scale * 0.04;
    const startLineW = scale * 0.05;
    const startLineH = scale * 0.012;

    // --- TRACK PATH ---
    const trackPath = useMemo(() => {
        if (activeTrack.length < 2 || !bounds) return '';
        return activeTrack.map((p, i) => {
            const pos = project(p.x, p.z);
            return `${i === 0 ? 'M' : 'L'} ${pos.x} ${pos.y}`;
        }).join(' ');
    }, [activeTrack, bounds, project]);

    // --- GRAPHICAL ELEMENTS (start line + sector lines) ---
    const mapElements = useMemo(() => {
        if (activeTrack.length < 5 || !bounds) return { startLine: null, splitLines: [] };

        const p0 = project(activeTrack[0].x, activeTrack[0].z);
        const pRef = project(activeTrack[Math.min(activeTrack.length - 1, 4)].x, activeTrack[Math.min(activeTrack.length - 1, 4)].z);
        const startAngle = (Math.atan2(pRef.y - p0.y, pRef.x - p0.x) * 180 / Math.PI) + 90;
        const startLine = { x: p0.x, y: p0.y, rotation: startAngle };

        const splitLines: { x: number; y: number; rotation: number; label: string }[] = [];
        for (let i = 1; i < activeTrack.length - 1; i++) {
            const prev = activeTrack[i - 1];
            const curr = activeTrack[i];
            const next = activeTrack[i + 1];
            if (prev.sector && curr.sector && prev.sector !== curr.sector) {
                if ((prev.sector === 1 && curr.sector === 2) || (prev.sector === 2 && curr.sector === 3)) {
                    const pCurr = project(curr.x, curr.z);
                    const pNext = project(next.x, next.z);
                    const angle = (Math.atan2(pNext.y - pCurr.y, pNext.x - pCurr.x) * 180 / Math.PI) + 90;
                    splitLines.push({ x: pCurr.x, y: pCurr.y, rotation: angle, label: prev.sector === 1 ? 'S1' : 'S2' });
                }
            }
        }

        return { startLine, splitLines };
    }, [activeTrack, bounds, project]);

    // --- VEHICLE POSITIONS IN SVG SPACE ---
    const vehiclePositions = useMemo(() => {
        return vehicles.map(v => {
            if (v.x === undefined || v.z === undefined) return null;
            const pos = project(v.x, v.z);
            const isMe = v.is_player === 1;
            const clsColor = getClassHexColor(v.class || '');
            const zOrder = isMe ? 60 : (v.position && v.position <= 10 ? 50 : 10);
            const showLabel = isMe || (showTop10Labels && v.position && v.position <= 10);
            return { v, pos, isMe, clsColor, zOrder, showLabel };
        }).filter(Boolean);
    }, [vehicles, project, showTop10Labels]);

    // Waiting state: show vehicle scatter if no bounds at all
    if (!bounds) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-[#121212] rounded-xl border border-white/10">
                <div className="flex flex-col items-center animate-pulse">
                    <Flag size={32} className="mb-3 text-yellow-500" />
                    <span className="font-black tracking-wider text-sm">WAITING FOR START LINE</span>
                    <span className="text-xs mt-1 opacity-60">Drive a full lap to map the track</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-[#121212] relative overflow-hidden rounded-xl border border-white/10 shadow-2xl select-none">

            <svg
                className="absolute inset-0 w-full h-full"
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation={strokeWidth * 0.8} result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <pattern id="checker" x="0" y="0" width={startLineW / 5} height={startLineH / 1.5} patternUnits="userSpaceOnUse">
                        <rect x="0" y="0" width={startLineW / 10} height={startLineH / 3} fill="white" />
                        <rect x={startLineW / 10} y="0" width={startLineW / 10} height={startLineH / 3} fill="black" />
                        <rect x="0" y={startLineH / 3} width={startLineW / 10} height={startLineH / 3} fill="black" />
                        <rect x={startLineW / 10} y={startLineH / 3} width={startLineW / 10} height={startLineH / 3} fill="white" />
                    </pattern>
                </defs>

                {/* TRACK */}
                {trackPath && (
                    <>
                        <path d={trackPath} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={strokeWidth * 3} strokeLinecap="round" strokeLinejoin="round" />
                        <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={strokeWidth * 2.5} strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
                        <path d={trackPath} fill="none" stroke="#ffffff" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                    </>
                )}

                {/* START LINE (checkered) */}
                {mapElements.startLine && isMapLoaded && (
                    <rect
                        x={mapElements.startLine.x - startLineW / 2}
                        y={mapElements.startLine.y - startLineH / 2}
                        width={startLineW}
                        height={startLineH}
                        fill="url(#checker)"
                        stroke="white"
                        strokeWidth={strokeWidth * 0.3}
                        transform={`rotate(${mapElements.startLine.rotation}, ${mapElements.startLine.x}, ${mapElements.startLine.y})`}
                    />
                )}

                {/* SECTOR LINES */}
                {isMapLoaded && showSectorLines && mapElements.splitLines.map((line, idx) => (
                    <g key={idx}>
                        <line
                            x1={line.x - sectorLineLen / 2} y1={line.y}
                            x2={line.x + sectorLineLen / 2} y2={line.y}
                            stroke="#eab308" strokeWidth={strokeWidth * 0.8} strokeDasharray={`${sectorLineLen * 0.2} ${sectorLineLen * 0.2}`}
                            transform={`rotate(${line.rotation}, ${line.x}, ${line.y})`}
                        />
                        <text
                            x={line.x + sectorLineLen * 0.6}
                            y={line.y + labelFontSize * 0.4}
                            fill="#eab308"
                            fontSize={labelFontSize}
                            fontWeight="bold"
                            fontFamily="monospace"
                        >
                            {line.label}
                        </text>
                    </g>
                ))}

                {/* VEHICLES */}
                {vehiclePositions.map((item) => {
                    if (!item) return null;
                    const { v, pos, isMe, clsColor, showLabel } = item;
                    const r = isMe ? dotRadius * 1.4 : dotRadius;
                    const key = String(v.id ?? `${v.position}-${v.driver || v.name || 'car'}`);

                    return (
                        <g key={key}>
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={r}
                                fill={clsColor}
                                stroke="white"
                                strokeWidth={strokeWidth * 0.6}
                                className={isMe ? 'animate-pulse' : ''}
                            />
                            {showLabel && (
                                <g>
                                    <rect
                                        x={pos.x + r + strokeWidth}
                                        y={pos.y - labelFontSize * 0.8}
                                        width={labelFontSize * (isMe ? 2 : (v.position && v.position <= 3 && v.driver ? 4.5 : 2.5))}
                                        height={labelFontSize * 1.2}
                                        fill={isMe ? 'white' : '#111111'}
                                        stroke={isMe ? 'transparent' : clsColor}
                                        strokeWidth={strokeWidth * 0.5}
                                        rx={labelFontSize * 0.1}
                                    />
                                    <text
                                        x={pos.x + r + strokeWidth + labelFontSize * 0.2}
                                        y={pos.y + labelFontSize * 0.35}
                                        fill={isMe ? 'black' : 'white'}
                                        fontSize={labelFontSize * 0.85}
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                    >
                                        {isMe ? 'ME' : `P${v.position}${v.position && v.position <= 3 && v.driver ? ' ' + v.driver.split(' ').pop()?.substring(0, 3).toUpperCase() : ''}`}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* CONTROLS */}
            <div className="absolute bottom-3 left-3 flex gap-2 pointer-events-auto">
                {!isMapLoaded && localTrack.length > 50 && hasCrossedStart && (
                    <button
                        onClick={() => onSaveMap && onSaveMap(localTrack)}
                        className="bg-white hover:bg-slate-200 text-black p-2 rounded-full shadow-lg transition-all active:scale-95"
                    >
                        <Save size={16} />
                    </button>
                )}
                <button
                    onClick={handleReset}
                    className="bg-black/60 hover:bg-black/90 text-white p-2 rounded-full border border-white/10 transition-all active:scale-95"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="absolute top-3 right-3 pointer-events-auto">
                <button
                    onClick={() => setShowOptions(v => !v)}
                    className="bg-black/60 hover:bg-black/90 text-white p-2 rounded-full border border-white/10 transition-all active:scale-95"
                >
                    <MapIcon size={16} />
                </button>
                {showOptions && (
                    <div className="mt-2 w-52 bg-black/75 border border-white/10 rounded-lg p-2 text-[10px] text-slate-200 space-y-1.5">
                        <label className="flex items-center justify-between">
                            <span>Top 10 labels</span>
                            <input type="checkbox" checked={showTop10Labels} onChange={e => setShowTop10Labels(e.target.checked)} />
                        </label>
                        <label className="flex items-center justify-between">
                            <span>Sector lines</span>
                            <input type="checkbox" checked={showSectorLines} onChange={e => setShowSectorLines(e.target.checked)} />
                        </label>
                        <label className="flex items-center justify-between">
                            <span>Auto save loop</span>
                            <input type="checkbox" checked={autoSaveLoop} onChange={e => setAutoSaveLoop(e.target.checked)} />
                        </label>
                        <label className="flex items-center justify-between">
                            <span>Auto record</span>
                            <input type="checkbox" checked={autoRecord} onChange={e => setAutoRecord(e.target.checked)} />
                        </label>
                    </div>
                )}
            </div>

            {/* Recording indicator */}
            {!isMapLoaded && hasCrossedStart && isRecording && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600/80 text-white text-[9px] font-bold px-2 py-1 rounded-full animate-pulse pointer-events-none">
                    <div className="w-2 h-2 bg-white rounded-full" /> REC
                </div>
            )}

            {/* Waiting overlay (data flowing but no start yet) */}
            {!hasCrossedStart && activeTrack.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="bg-black/60 rounded-lg px-4 py-2 flex flex-col items-center gap-1">
                        <Flag size={18} className="text-yellow-500" />
                        <span className="text-[10px] font-black tracking-wider text-slate-300">WAITING FOR START LINE</span>
                        <span className="text-[9px] text-slate-500">Drive a full lap to map the track</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapView;

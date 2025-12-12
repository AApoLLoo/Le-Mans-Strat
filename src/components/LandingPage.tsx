import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, X, Trash2, Car, RefreshCw, Palette, Save } from 'lucide-react';
import type { Driver } from '../types';

// --- IMPORTS IMAGES ---
import imgHypercar from '../assets/Hypercar.jpg';
import imgLmp2 from '../assets/lmp2-car.jpg';
import imgLmp2Elms from '../assets/LMP2-ELMS.jpg';
import imgLmp3 from '../assets/LMP3.jpg';
import imgGt3 from '../assets/LMGT3-MERC.jpg';

// URL DE VOTRE VPS
const VPS_API_URL = "https://api.racetelemetrybyfbt.com";

const CATEGORIES = ["Hypercar", "LMP2", "LMP2 (ELMS)", "LMP3", "GT3"];

// Fonction pour récupérer l'image de fond selon la catégorie
const getCategoryBg = (category: string) => {
    const c = (category || "").toLowerCase();
    if (c.includes('elms')) return imgLmp2Elms;
    if (c.includes('lmp2')) return imgLmp2;
    if (c.includes('lmp3')) return imgLmp3;
    if (c.includes('hyper')) return imgHypercar;
    if (c.includes('gt3')) return imgGt3;
    return null;
};

type Session = {
    id: string;
    carCategory?: string;
    drivers?: Driver[] | Record<string, Driver>;
    driverName?: string;
};

// --- MODAL DE CRÉATION ---
const CreateTeamModal = ({ onClose, onCreate }: { onClose: () => void, onCreate: (name: string, category: string, drivers: Driver[]) => void }) => {
    const [teamName, setTeamName] = useState("");
    const [category, setCategory] = useState("Hypercar");
    const [drivers, setDrivers] = useState<Driver[]>(() => [
        { id: Date.now(), name: "", color: "#3b82f6" }
    ]);

    const handleAddDriver = () => setDrivers([...drivers, { id: Date.now(), name: "", color: "#ec4899" }]);
    const handleRemoveDriver = (id: number | string) => { if (drivers.length > 1) setDrivers(drivers.filter(d => d.id !== id)); };
    const handleUpdateDriver = (id: number | string, val: string) => setDrivers(drivers.map(d => d.id === id ? { ...d, name: val } : d));

    const handleSubmit = () => {
        if (!teamName.trim()) return alert("Please enter a Line Up Name");
        const validDrivers = drivers.filter(d => d.name.trim() !== "");
        if (validDrivers.length === 0) return alert("Please add at least one driver");
        onCreate(teamName, category, validDrivers);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f172a] w-full max-w-md rounded-xl border border-indigo-500/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-indigo-600/10 p-4 border-b border-indigo-500/20 flex justify-between items-center">
                    <h2 className="text-xl font-black italic text-white tracking-wider">NEW LINE UP</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Line Up Name</label>
                        <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="ex: Alpine #35" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white font-bold focus:border-indigo-500 outline-none" autoFocus />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Car size={12}/> Car Category</label>
                        <div className="grid grid-cols-3 gap-2">
                            {CATEGORIES.map((cat) => (
                                <button key={cat} onClick={() => setCategory(cat)} className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase border ${category === cat ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>{cat}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Drivers List</label>
                            <button onClick={handleAddDriver} className="text-[10px] text-indigo-400 font-bold flex items-center gap-1"><Plus size={12}/> ADD DRIVER</button>
                        </div>
                        <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                            {drivers.map((driver, idx) => (
                                <div key={driver.id} className="flex gap-2">
                                    <div className="flex items-center justify-center w-8 bg-slate-800 rounded text-xs font-mono text-slate-500 border border-slate-700">{idx + 1}</div>
                                    <input type="text" value={driver.name} onChange={(e) => handleUpdateDriver(driver.id, e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none" />
                                    {drivers.length > 1 && <button onClick={() => handleRemoveDriver(driver.id)} className="p-2 text-slate-600 hover:text-red-500"><Trash2 size={16}/></button>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-slate-900/50 border-t border-white/5 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-lg font-bold text-slate-400 hover:bg-white/5 text-sm">CANCEL</button>
                    <button onClick={handleSubmit} className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg text-sm">CREATE LINE UP</button>
                </div>
            </div>
        </div>
    );
};

// --- MODAL D'ÉDITION ---
const EditTeamModal = ({ team, onClose, onSave }: { team: Session, onClose: () => void, onSave: (teamId: string, drivers: Driver[], category: string) => void }) => {
    // 1. État Pilotes
    const [drivers, setDrivers] = useState<Driver[]>(() => {
        if (Array.isArray(team.drivers)) return [...team.drivers];
        if (team.drivers && typeof team.drivers === 'object') return Object.values(team.drivers);
        return [{ id: Date.now(), name: "Driver 1", color: "#3b82f6" }];
    });

    // 2. État Catégorie (Nouveau)
    const [category, setCategory] = useState(team.carCategory || "Hypercar");

    const handleAddDriver = () => {
        setDrivers([...drivers, { id: Date.now(), name: "New Driver", color: "#" + Math.floor(Math.random()*16777215).toString(16) }]);
    };

    const handleRemoveDriver = (id: number | string) => {
        if (drivers.length > 1) {
            setDrivers(drivers.filter(d => d.id !== id));
        } else {
            alert("You must keep at least one driver.");
        }
    };

    const handleUpdateDriver = (id: number | string, field: keyof Driver, val: string) => {
        setDrivers(drivers.map(d => d.id === id ? { ...d, [field]: val } : d));
    };

    const handleSave = () => {
        const validDrivers = drivers.filter(d => d.name.trim() !== "");
        if (validDrivers.length === 0) return alert("Please ensure drivers have names.");
        onSave(team.id, validDrivers, category); // On passe aussi la catégorie
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f172a] w-full max-w-md rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-slate-800/50 p-4 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-black italic text-white tracking-wider">EDIT LINE UP</h2>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{team.id.toUpperCase()}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
                </div>

                <div className="p-6 space-y-4">

                    {/* AJOUT : SÉLECTEUR DE CATÉGORIE DANS L'ÉDITION */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Car size={12}/> Car Category
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`px-1 py-1.5 rounded text-[9px] font-bold uppercase border transition-colors
                                        ${category === cat
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg'
                                        : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-slate-300'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-white/5 my-2"></div>

                    <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Drivers List</label>
                        <button onClick={handleAddDriver} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors">
                            <Plus size={12}/> ADD DRIVER
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                        {drivers.map((driver, idx) => (
                            <div key={driver.id} className="flex gap-2 items-center bg-slate-900/50 p-2 rounded border border-white/5">
                                <div className="w-6 text-center text-xs font-mono text-slate-500 font-bold">{idx + 1}</div>

                                {/* Name Input */}
                                <input
                                    type="text"
                                    value={driver.name}
                                    onChange={(e) => handleUpdateDriver(driver.id, 'name', e.target.value)}
                                    className="flex-1 bg-transparent border-b border-transparent focus:border-indigo-500 text-sm text-white outline-none px-1"
                                    placeholder="Driver Name"
                                />

                                {/* Color Picker */}
                                <div className="relative group cursor-pointer">
                                    <div className="w-6 h-6 rounded border border-white/20 overflow-hidden" style={{backgroundColor: driver.color}}></div>
                                    <input
                                        type="color"
                                        value={driver.color}
                                        onChange={(e) => handleUpdateDriver(driver.id, 'color', e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                </div>

                                {/* Delete Button */}
                                <button
                                    onClick={() => handleRemoveDriver(driver.id)}
                                    className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                    title="Remove Driver"
                                >
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-slate-900/50 border-t border-white/5 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-lg font-bold text-slate-400 hover:bg-white/5 text-sm transition-colors">CANCEL</button>
                    <button onClick={handleSave} className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg text-sm flex items-center justify-center gap-2 transition-colors">
                        <Save size={16}/> SAVE CHANGES
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- LANDING PAGE ---
const LandingPage = () => {
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Session | null>(null);
    const [linesups, setlinesups] = useState<Session[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string|null>(null);

    // Charger les sessions depuis l'API VPS
    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${VPS_API_URL}/api/lineups`, {
                headers: {
                    "Content-Type": "application/json"
                }
            });
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await res.text();
                console.error("Réponse non-JSON reçue:", text.slice(0, 100));
            }
            if(!res.ok) throw new Error("Erreur VPS");
            const data = await res.json();
            setlinesups(data as Session[]);
            setError(null);
        } catch (e: any) {
            console.error("Erreur chargement sessions:", e);
            setError(e.message);
            setlinesups([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleJoinTeam = (teamId: string) => {
        localStorage.setItem('teamId', teamId);
        navigate('/strategy');
    };

    const handleCreateSession = async (name: string, category: string, drivers: Driver[]) => {
        const teamId = name.replace(/\s+/g, '-').toLowerCase();
        const payload = { id: teamId, carCategory: category, drivers, activeDriverId: drivers[0]?.id };
        try {
            const res = await fetch(`${VPS_API_URL}/api/lineups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                handleJoinTeam(teamId);
            } else {
                alert("Erreur création session VPS");
            }
        } catch (e) {
            alert("Erreur réseau: " + e);
        }
    };

    // MISE À JOUR (Pilotes + Catégorie)
    const handleSaveSessionData = async (teamId: string, updatedDrivers: Driver[], updatedCategory: string) => {
        try {
            const res = await fetch(`${VPS_API_URL}/api/lineups/${teamId}/drivers`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    drivers: updatedDrivers,
                    carCategory: updatedCategory
                })
            });

            if (res.ok) {
                setEditingTeam(null);
                fetchSessions();
            } else {
                alert("Erreur lors de la mise à jour.");
            }
        } catch (e) {
            alert("Erreur réseau: " + e);
        }
    };

    const handleDeleteTeam = async (e: React.MouseEvent, teamId: string) => {
        e.stopPropagation();
        if (window.confirm(`Delete Line Up "${teamId.toUpperCase()}"?`)) {
            try {
                await fetch(`${VPS_API_URL}/api/lineups/${teamId}`, {
                    method: 'DELETE',
                });
                fetchSessions();
            } catch (err) {
                alert("Erreur suppression: " + err);
            }
        }
    };

    const getCategoryColor = (cat: string) => {
        const c = (cat || "").toLowerCase();
        if (c.includes('hyper')) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (c.includes('lmp2')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        if (c.includes('gt3')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        return 'bg-white/10 text-slate-300 border-white/10';
    };

    return (
        <div className="min-h-screen bg-[#020408] text-white font-display overflow-x-hidden relative">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex flex-col items-center">
                <div className="flex flex-col md:flex-row items-center justify-center mb-16 space-y-4 md:space-y-0 md:space-x-8">
                    <div className="text-center md:text-right min-w-0">
                        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter
                        text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500
                        drop-shadow-2xl relative z-10
                        transition-all duration-300 ease-in-out
                        hover:drop-shadow-[0_0_80px_rgba(99,102,241,0.8)]"
                        >
                            French Baguette <span className="text-indigo-500"> TEAM</span>
                        </h1>
                        <p className="text-slate-400 text-lg uppercase tracking-[0.3em] font-bold">
                            Race Telemetry USED ONLY FOR FBT
                        </p>
                    </div>
                    <img
                        src="/Logo Team LMU.svg"
                        alt="Team Logo"
                        className="w-24 h-24 md:w-56 md:h-56 object-contain
                   drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]
                   shrink-0
                   transition-transform duration-300 ease-in-out
                   hover:scale-105 hover:rotate-3
                   animate-in fade-in zoom-in duration-700"
                    />
                </div>

                <div className="w-full max-w-2xl flex gap-4 mb-16">
                    <button onClick={() => setShowCreateModal(true)} className="flex-1 group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 p-1 rounded-xl shadow-[0_0_40px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_rgba(79,70,229,0.5)] transition-all duration-300 transform hover:-translate-y-1">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <div className="bg-[#050a10] rounded-lg h-full px-8 py-6 flex items-center justify-center gap-4 relative z-10">
                            <Plus className="w-8 h-8 text-indigo-400 group-hover:rotate-90 transition-transform duration-300"/>
                            <div className="text-left">
                                <div className="text-xl font-bold text-white italic">CREATE NEW STRATEGY</div>
                                <div className="text-xs text-indigo-400 font-bold tracking-wider">START A NEW SESSION</div>
                            </div>
                        </div>
                    </button>
                </div>

                <div className="w-full max-w-5xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        <h2 className="text-xl font-bold text-white tracking-widest uppercase">Live Sessions</h2>
                        <button onClick={fetchSessions} className="ml-auto text-slate-500 hover:text-white"><RefreshCw size={16}/></button>
                    </div>

                    {error && <div className="text-center text-red-500 mb-4 bg-red-900/20 p-2 rounded">{error}</div>}

                    {loading ? (
                        <div className="text-center text-slate-500 animate-pulse">Scanning network...</div>
                    ) : linesups.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                            <div className="text-slate-500 font-bold">NO SESSIONS FOUND ON VPS</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {linesups.map((team) => {
                                const bgImage = getCategoryBg(team.carCategory || "");

                                return (
                                    <div key={team.id} onClick={() => handleJoinTeam(team.id)} className="group bg-slate-900/80 border border-white/10 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:shadow-2xl relative overflow-hidden">

                                        {/* --- IMAGE DE FOND --- */}
                                        {bgImage && (
                                            <>
                                                <div
                                                    className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-50 transition-all duration-700 transform group-hover:scale-110"
                                                    style={{ backgroundImage: `url(${bgImage})` }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/90 to-transparent z-0" />
                                            </>
                                        )}

                                        {/* --- ACTIONS GROUPÉES EN HAUT À DROITE --- */}
                                        <div className="absolute top-3 right-3 z-30 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                            {/* Bouton EDIT */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingTeam(team);
                                                }}
                                                className="p-2 rounded-lg bg-slate-900/90 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-white/20 transition-colors shadow-lg backdrop-blur-sm"
                                                title="Edit Drivers"
                                            >
                                                <Palette size={16} />
                                            </button>

                                            {/* Bouton DELETE */}
                                            <button
                                                onClick={(e) => handleDeleteTeam(e, team.id)}
                                                className="p-2 rounded-lg bg-slate-900/90 text-slate-500 hover:bg-red-500/20 hover:text-red-500 border border-white/20 transition-colors shadow-lg backdrop-blur-sm"
                                                title="Delete Line Up"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>

                                        <div className="relative z-10 space-y-4">
                                            <div>
                                                <div className="text-2xl font-black text-white italic tracking-tight group-hover:text-indigo-400 truncate pr-16 drop-shadow-md">
                                                    {team.id.toUpperCase()}
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border mt-2 inline-block shadow-sm ${getCategoryColor(team.carCategory || '')}`}>
                                                    {team.carCategory || "Unknown"}
                                                </span>
                                            </div>

                                            <div className="bg-black/60 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
                                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                                    <Users size={10}/> Drivers
                                                </div>
                                                <div className="mt-1 flex flex-col gap-1">
                                                    {(() => {
                                                        const driversList = team.drivers
                                                            ? (Array.isArray(team.drivers) ? team.drivers : Object.values(team.drivers))
                                                            : [];

                                                        return driversList.length > 0 ? (
                                                            driversList.map((d, idx) => (
                                                                <div
                                                                    key={d.id || idx}
                                                                    className="text-sm font-medium flex items-center gap-2"
                                                                >
                                                                    <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{backgroundColor: d.color || '#3b82f6', color: d.color || '#3b82f6'}}></div>
                                                                    <span className="text-slate-200">{d?.name || 'Unnamed'}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-sm text-slate-500">
                                                                {team.driverName || "Waiting..."}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            {showCreateModal && <CreateTeamModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateSession} />}
            {editingTeam && <EditTeamModal team={editingTeam} onClose={() => setEditingTeam(null)} onSave={handleSaveSessionData} />}

            <div className="absolute bottom-4 right-6 z-50 text-xs text-slate-500
                            transition-all duration-300 ease-in-out
                            hover:scale-[1.10] hover:text-white hover:drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]
                            cursor-pointer">
                Développé par <span className="font-bold text-indigo-400">Antoine</span>
            </div>
        </div>
    );
};

export default LandingPage;
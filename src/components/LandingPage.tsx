import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Trash2, Car, RefreshCw, Palette, Save, LogOut, User as UserIcon, Lock, Gauge, Timer, MessageSquare, Map, BarChart3, Fuel, ChevronDown, Radio } from 'lucide-react';
import type { Driver } from '../types';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import ModalShell, { MODAL_FIELD_CLASS } from './ui/ModalShell';

// --- IMPORTS IMAGES ---
import imgHypercar from '../assets/Hypercar.jpg';
import imgLmp2 from '../assets/lmp2-car.jpg';
import imgLmp2Elms from '../assets/LMP2-ELMS.jpg';
import imgLmp3 from '../assets/LMP3.jpg';
import imgGt3 from '../assets/LMGT3-MERC.jpg';

import { API_BASE_URL } from '../constants';
const VPS_API_URL = API_BASE_URL;

/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

const CATEGORIES = ["Hypercar", "LMP2", "LMP2 (ELMS)", "LMP3", "GT3"];

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

const FEATURES = [
    { icon: Gauge, title: "Live Telemetry", desc: "Real-time speed, fuel and tire data streamed directly from the car." },
    { icon: Timer, title: "Stint Planning", desc: "Precise pit stop timing and driver rotation management." },
    { icon: Fuel, title: "Fuel Calculator", desc: "Optimal fuel loads based on consumption and remaining laps." },
    { icon: Map, title: "Track Map", desc: "Live car positioning and incident tracking on circuit." },
    { icon: MessageSquare, title: "Team Radio", desc: "Real-time chat between pit wall and engineering crew." },
    { icon: BarChart3, title: "Race Analysis", desc: "Post-stint analytics and performance comparison tools." },
];

const landingStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.15; }
    50% { opacity: 0.25; }
  }
  .animate-fade-in-up { animation: fadeInUp 0.7s ease-out both; }
  .animate-fade-in-up-d1 { animation: fadeInUp 0.7s ease-out 0.1s both; }
  .animate-fade-in-up-d2 { animation: fadeInUp 0.7s ease-out 0.2s both; }
  .animate-fade-in-up-d3 { animation: fadeInUp 0.7s ease-out 0.3s both; }
  .animate-float { animation: float 6s ease-in-out infinite; }
  .animate-pulse-glow { animation: pulseGlow 4s ease-in-out infinite; }
`;

// --- MODAL JOIN WITH PASSWORD ---
const JoinPasswordModal = ({ onClose, onConfirm }: { onClose: () => void, onConfirm: (pwd: string) => void }) => {
    const [pwd, setPwd] = useState("");
    return (
        <ModalShell
            title={<span className="flex items-center gap-2"><Lock size={18} className="text-indigo-400"/> Private Lineup</span>}
            subtitle="Please enter the lineup password to join."
            onClose={onClose}
            ariaLabel="Join private lineup"
            closeLabel="Close join private lineup"
            size="sm"
            tone="brand"
            layer="top"
            footer={
                <div className="flex gap-3">
                    <Button onClick={onClose} variant="ghost" block>Cancel</Button>
                    <Button onClick={() => onConfirm(pwd)} variant="primary" block>JOIN</Button>
                </div>
            }
        >
            <input
                type="password"
                autoFocus
                aria-label="Lineup password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className={MODAL_FIELD_CLASS}
                placeholder="Lineup Password"
            />
        </ModalShell>
    );
};

// --- MODAL DE CRÉATION ---
const CreateTeamModal = ({ onClose, onCreate }: { onClose: () => void, onCreate: (name: string, category: string, drivers: Driver[], pwd: string) => void }) => {
    const [teamName, setTeamName] = useState("");
    const [category, setCategory] = useState("Hypercar");
    const [drivers, setDrivers] = useState<Driver[]>(() => [
        { id: Date.now(), name: "", color: "#3b82f6" }
    ]);
    const [lineupPassword, setLineupPassword] = useState("");

    const handleAddDriver = () => setDrivers([...drivers, { id: Date.now(), name: "", color: "#ec4899" }]);
    const handleRemoveDriver = (id: number | string) => { if (drivers.length > 1) setDrivers(drivers.filter(d => d.id !== id)); };
    const handleUpdateDriver = (id: number | string, val: string) => setDrivers(drivers.map(d => d.id === id ? { ...d, name: val } : d));

    const handleSubmit = () => {
        if (!teamName.trim()) return alert("Please enter a Line Up Name");
        const validDrivers = drivers.filter(d => d.name.trim() !== "");
        if (validDrivers.length === 0) return alert("Please add at least one driver");
        onCreate(teamName, category, validDrivers, lineupPassword);
    };

    return (
        <ModalShell
            title="NEW LINE UP"
            onClose={onClose}
            ariaLabel="Create new lineup"
            closeLabel="Close create lineup"
            size="md"
            tone="brand"
            layer="modal"
            footer={
                <div className="flex gap-3">
                    <Button onClick={onClose} variant="ghost" block>CANCEL</Button>
                    <Button onClick={handleSubmit} variant="primary" block>CREATE LINE UP</Button>
                </div>
            }
        >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Line Up Name</label>
                        <input aria-label="Lineup name" type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="ex: Alpine #35" className={`${MODAL_FIELD_CLASS} font-bold`} autoFocus />
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
                            <Button onClick={handleAddDriver} variant="ghost" size="sm" className="text-indigo-300 flex items-center gap-1"><Plus size={12}/> ADD DRIVER</Button>
                        </div>
                        <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                            {drivers.map((driver, idx) => (
                                <div key={driver.id} className="flex gap-2">
                                    <div className="flex items-center justify-center w-8 bg-slate-800 rounded text-xs font-mono text-slate-500 border border-slate-700">{idx + 1}</div>
                                    <input aria-label={`Driver ${idx + 1} name`} type="text" value={driver.name} onChange={(e) => handleUpdateDriver(driver.id, e.target.value)} className={`${MODAL_FIELD_CLASS} flex-1 p-2 text-sm`} />
                                    {drivers.length > 1 && <button onClick={() => handleRemoveDriver(driver.id)} className="p-2 text-slate-600 hover:text-red-500"><Trash2 size={16}/></button>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <Lock size={12}/> Lineup Password (Optional)
                        </label>
                        <input
                            type="password"
                            aria-label="Optional lineup password"
                            value={lineupPassword}
                            onChange={(e) => setLineupPassword(e.target.value)}
                            placeholder="Leave empty for public access"
                            className={`${MODAL_FIELD_CLASS} font-bold text-sm placeholder-slate-600`}
                        />
                    </div>
                </div>
        </ModalShell>
    );
};

// --- MODAL D'ÉDITION ---
const EditTeamModal = ({ team, onClose, onSave }: { team: Session, onClose: () => void, onSave: (teamId: string, drivers: Driver[], category: string) => void }) => {
    const [drivers, setDrivers] = useState<Driver[]>(() => {
        if (Array.isArray(team.drivers)) return [...team.drivers];
        if (team.drivers && typeof team.drivers === 'object') return Object.values(team.drivers);
        return [{ id: Date.now(), name: "Driver 1", color: "#3b82f6" }];
    });

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
        onSave(team.id, validDrivers, category);
    };

    return (
        <ModalShell
            title="EDIT LINE UP"
            subtitle={team.id.toUpperCase()}
            onClose={onClose}
            ariaLabel="Edit lineup"
            closeLabel="Close edit lineup"
            size="md"
            tone="default"
            layer="modal"
            footer={
                <div className="flex gap-3">
                    <Button onClick={onClose} variant="ghost" block>CANCEL</Button>
                    <Button onClick={handleSave} variant="primary" block className="flex items-center justify-center gap-2">
                        <Save size={16}/> SAVE CHANGES
                    </Button>
                </div>
            }
        >
                <div className="space-y-4">
                    <Badge variant="info">Driver & Category Manager</Badge>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Car size={12}/> Car Category
                        </label>
                        <div className="text-[10px] text-amber-300/90 border border-amber-500/30 bg-amber-900/20 rounded px-2 py-1">
                            La modification de classe depend des droits de votre compte sur le serveur.
                        </div>
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
                        <Button onClick={handleAddDriver} variant="ghost" size="sm" className="text-indigo-300 flex items-center gap-1"><Plus size={12}/> ADD DRIVER</Button>
                    </div>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                        {drivers.map((driver, idx) => (
                            <div key={driver.id} className="flex gap-2 items-center bg-slate-900/50 p-2 rounded border border-white/5">
                                <div className="w-6 text-center text-xs font-mono text-slate-500 font-bold">{idx + 1}</div>
                                <input
                                    aria-label={`Driver ${idx + 1} name`}
                                    type="text"
                                    value={driver.name}
                                    onChange={(e) => handleUpdateDriver(driver.id, 'name', e.target.value)}
                                    className="flex-1 bg-transparent border-b border-transparent focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400/70 text-sm text-white outline-none px-1 rounded"
                                    placeholder="Driver Name"
                                />
                                <div className="relative group cursor-pointer">
                                    <div className="w-6 h-6 rounded border border-white/20 overflow-hidden" style={{backgroundColor: driver.color}}></div>
                                    <input
                                        aria-label={`Driver ${idx + 1} color`}
                                        type="color"
                                        value={driver.color}
                                        onChange={(e) => handleUpdateDriver(driver.id, 'color', e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                </div>
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
        </ModalShell>
    );
};

// --- LANDING PAGE ---
const LandingPage = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, logout, token } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Session | null>(null);
    const [linesups, setlinesups] = useState<Session[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string|null>(null);
    const [joinPasswordTarget, setJoinPasswordTarget] = useState<string | null>(null);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${VPS_API_URL}/api/lineups`, {
                headers: { "Content-Type": "application/json" }
            });

            const contentType = res.headers.get("content-type");
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Erreur VPS (${res.status}): ${text.substring(0, 100)}...`);
            }
            if (contentType && contentType.indexOf("application/json") === -1) {
                const text = await res.text();
                throw new Error(`Réponse non-JSON reçue: ${text.substring(0, 100)}...`);
            }

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

    const handleJoinTeam = async (teamId: string, password: string = "") => {
        if (!isAuthenticated) return setShowAuthModal(true);

        try {
            const res = await fetch(`${VPS_API_URL}/api/lineups/${teamId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            });

            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") === -1) {
                const text = await res.text();
                return alert("Erreur Serveur (HTML): " + text.substring(0, 100));
            }

            const data = await res.json();

            if (res.status === 401 && data.requirePassword) {
                setJoinPasswordTarget(teamId);
                return;
            }

            if (res.ok || data.success) {
                setJoinPasswordTarget(null);
                localStorage.setItem('teamId', teamId);
                navigate('/strategy');
            } else {
                alert("Erreur : " + (data.error || "Inconnue"));
            }
        } catch (e: any) { alert("Erreur réseau: " + e.message); }
    };

    const handleCreateSession = async (name: string, category: string, drivers: Driver[], lineupPassword: string) => {
        const teamId = name.replace(/\s+/g, '-').toLowerCase();
        const payload = { id: teamId, carCategory: category, drivers, activeDriverId: drivers[0]?.id, lineupPassword };

        try {
            const res = await fetch(`${VPS_API_URL}/api/lineups`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await res.json();
                if (res.ok) {
                    handleJoinTeam(teamId, lineupPassword);
                } else {
                    alert("Erreur création : " + (data.error || "Erreur inconnue"));
                }
            } else {
                const text = await res.text();
                console.error("Réponse serveur invalide (Non-JSON):", text);
                alert(`Erreur Serveur (${res.status}): Vérifiez que le serveur est bien démarré.`);
            }
        } catch (e) {
            alert("Erreur réseau: " + e);
        }
    };

    const handleSaveSessionData = async (teamId: string, updatedDrivers: Driver[], updatedCategory: string) => {
        const normalizedCategory = CATEGORIES.includes(updatedCategory) ? updatedCategory : CATEGORIES[0];
        const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

        const tryUpdateCategory = async (): Promise<boolean> => {
            const attempts = [
                { url: `${VPS_API_URL}/api/lineups/${teamId}`, method: 'PATCH' },
                { url: `${VPS_API_URL}/api/lineups/${teamId}`, method: 'PUT' },
                { url: `${VPS_API_URL}/api/lineups/${teamId}/category`, method: 'PATCH' },
                { url: `${VPS_API_URL}/api/lineups/${teamId}/category`, method: 'PUT' }
            ];

            for (const attempt of attempts) {
                try {
                    const res = await fetch(attempt.url, {
                        method: attempt.method,
                        headers: authHeaders,
                        body: JSON.stringify({ carCategory: normalizedCategory, category: normalizedCategory })
                    });
                    if (res.ok) return true;
                } catch {
                    // Try next endpoint/method.
                }
            }

            return false;
        };

        try {
            // Preferred endpoint when backend supports combined update.
            const combinedRes = await fetch(`${VPS_API_URL}/api/lineups/${teamId}/drivers`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({ drivers: updatedDrivers, carCategory: normalizedCategory })
            });

            if (combinedRes.ok) {
                setEditingTeam(null);
                fetchSessions();
                return;
            }

            // Fallback: persist drivers first, then try category via dedicated routes.
            const driversOnlyRes = await fetch(`${VPS_API_URL}/api/lineups/${teamId}/drivers`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({ drivers: updatedDrivers })
            });

            const driversSaved = driversOnlyRes.ok;
            const categorySaved = await tryUpdateCategory();

            if (driversSaved || categorySaved) {
                setEditingTeam(null);
                fetchSessions();
                if (!categorySaved) {
                    alert("Pilotes sauvegardés, mais la classe n'a pas pu être modifiée avec ce compte.");
                }
                return;
            }

            alert("Erreur update (droits insuffisants ou endpoint non supporté).");
        } catch {
            alert("Erreur réseau");
        }
    };

    const handleDeleteTeam = async (e: React.MouseEvent, teamId: string) => {
        e.stopPropagation();
        if (window.confirm(`Delete Line Up "${teamId.toUpperCase()}"?`)) {
            try {
                await fetch(`${VPS_API_URL}/api/lineups/${teamId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchSessions();
            } catch (err) { alert("Erreur suppression: " + err); }
        }
    };

    const getCategoryColor = (cat: string) => {
        const c = (cat || "").toLowerCase();
        if (c.includes('hyper')) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (c.includes('lmp2')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        if (c.includes('gt3')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        return 'bg-white/10 text-slate-300 border-white/10';
    };

    const getCategoryBorderColor = (cat: string) => {
        const c = (cat || "").toLowerCase();
        if (c.includes('hyper')) return 'border-b-red-500/50';
        if (c.includes('lmp2')) return 'border-b-blue-500/50';
        if (c.includes('gt3')) return 'border-b-orange-500/50';
        return 'border-b-slate-700/50';
    };

    const scrollToSessions = () => {
        document.getElementById('sessions')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen text-white font-display relative" style={{ overflow: 'auto', height: '100vh' }}>
            <style>{landingStyles}</style>

            {/* --- BACKGROUND LAYERS --- */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Dot grid */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />
                {/* Radial glow top */}
                <div className="absolute inset-0 animate-pulse-glow" style={{
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)'
                }} />
                {/* Blobs */}
                <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/15 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-blue-900/15 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[10%] left-[30%] w-[30%] h-[30%] bg-violet-900/10 blur-[120px] rounded-full"></div>
            </div>

            {/* --- NAVBAR --- */}
            <nav className="sticky top-0 z-50 fbt-panel border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/Logo Team LMU.svg" alt="FBT" className="w-8 h-8 object-contain" />
                        <div>
                            <span className="text-sm font-bold text-white/80 tracking-wider">FBT</span>
                            <div className="w-20 mt-1 fbt-tricolor-bar" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-3 bg-slate-800/60 p-1.5 pr-4 rounded-full border border-white/10 backdrop-blur">
                                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-inner">
                                    {user?.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white leading-tight">{user?.username}</span>
                                    <button onClick={logout} className="text-[9px] text-slate-400 hover:text-red-400 uppercase font-bold text-left flex items-center gap-1 transition-colors">
                                        <LogOut size={8}/> Logout
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-5 py-2 rounded-full text-xs font-bold transition-all backdrop-blur flex items-center gap-2 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                            >
                                <UserIcon size={14}/> LOGIN / REGISTER
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="relative z-10 min-h-[85vh] flex flex-col items-center justify-center px-6">
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                    <img
                        src="/Logo Team LMU.svg"
                        alt="Team Logo"
                        className="w-32 h-32 md:w-48 md:h-48 object-contain animate-float
                            drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]
                            mb-8 animate-fade-in-up"
                    />

                    <h1 className="animate-fade-in-up-d1 text-5xl md:text-7xl lg:text-8xl font-black italic tracking-tighter
                        text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500
                        leading-[0.9]"
                    >
                        French Baguette <span className="text-indigo-500">TEAM</span>
                    </h1>

                    <div className="mt-3 text-[10px] uppercase tracking-[0.35em] fbt-badge px-3 py-1 rounded-full">
                        Engineering / Endurance / Execution
                    </div>

                    <p className="animate-fade-in-up-d2 text-base md:text-lg text-slate-400 tracking-[0.2em] uppercase font-medium mt-6">
                        Endurance Racing Strategy Platform
                    </p>

                    <div className="animate-fade-in-up-d2 w-24 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent mx-auto mt-6"></div>

                    <div className="animate-fade-in-up-d3 flex flex-col sm:flex-row gap-4 mt-10">
                        <button
                            onClick={() => {
                                if (isAuthenticated) setShowCreateModal(true);
                                else setShowAuthModal(true);
                            }}
                            className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 p-px rounded-xl shadow-[0_0_30px_rgba(79,70,229,0.25)] hover:shadow-[0_0_50px_rgba(79,70,229,0.4)] transition-all duration-300 hover:-translate-y-0.5"
                        >
                            <div className="bg-[#050a10] rounded-[11px] px-8 py-4 flex items-center gap-3 relative z-10">
                                <Plus className="w-5 h-5 text-indigo-400 group-hover:rotate-90 transition-transform duration-300"/>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">CREATE NEW LINEUP</div>
                                    <div className="text-[10px] text-indigo-400/70 font-medium tracking-wider">
                                        {isAuthenticated ? "START A NEW SESSION" : "LOGIN REQUIRED"}
                                    </div>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={scrollToSessions}
                            className="px-8 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <ChevronDown size={16} className="text-slate-400" />
                            VIEW SESSIONS
                        </button>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-slate-600">
                    <ChevronDown size={24} />
                </div>
            </section>

            {/* --- FEATURES SECTION --- */}
            <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
                <div className="text-center mb-16 animate-fade-in-up">
                    <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-bold mb-3">Race-Winning Tools</p>
                    <h2 className="text-3xl md:text-4xl font-black italic text-white mb-4">
                        Everything You Need at the Pit Wall
                    </h2>
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent mx-auto"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {FEATURES.map((feat, i) => (
                        <div
                            key={feat.title}
                            className="fbt-panel rounded-xl p-6 hover:border-indigo-500/30 transition-all duration-300 group"
                            style={{ animationDelay: `${i * 0.08}s` }}
                        >
                            <div className="w-11 h-11 rounded-lg bg-indigo-600/10 flex items-center justify-center mb-4 group-hover:bg-indigo-600/20 transition-colors">
                                <feat.icon size={20} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                            </div>
                            <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* --- SESSIONS SECTION --- */}
            <section id="sessions" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                    <h2 className="text-xl font-bold text-white tracking-widest uppercase">Live Sessions</h2>
                    {!loading && linesups.length > 0 && (
                        <span className="bg-white/5 text-xs px-2.5 py-0.5 rounded-full text-slate-400 font-mono">{linesups.length}</span>
                    )}
                    <button onClick={fetchSessions} className="ml-auto text-slate-500 hover:text-white transition-colors"><RefreshCw size={16}/></button>
                </div>

                {error && <div className="text-center text-red-500 mb-4 bg-red-900/20 p-3 rounded-xl border border-red-500/20">{error}</div>}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1,2,3].map(i => (
                            <div key={i} className="bg-slate-900/40 rounded-2xl h-52 animate-pulse border border-white/5"></div>
                        ))}
                    </div>
                ) : linesups.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-dashed border-white/10">
                        <Radio size={40} className="text-slate-700 mx-auto mb-4" />
                        <div className="text-lg font-bold text-slate-500 mb-2">No Active Sessions</div>
                        <p className="text-sm text-slate-600 mb-6">Create a new lineup to get started</p>
                        <button
                            onClick={() => {
                                if (isAuthenticated) setShowCreateModal(true);
                                else setShowAuthModal(true);
                            }}
                            className="text-indigo-400 text-sm font-bold hover:text-indigo-300 transition-colors inline-flex items-center gap-2"
                        >
                            <Plus size={14} /> Create Lineup
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {linesups.map((team) => {
                            const bgImage = getCategoryBg(team.carCategory || "");

                            return (
                                <div
                                    key={team.id}
                                    onClick={() => handleJoinTeam(team.id)}
                                    className={`group fbt-panel border-b-2 ${getCategoryBorderColor(team.carCategory || '')} hover:border-indigo-500/50 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden`}
                                >
                                    {/* --- IMAGE DE FOND --- */}
                                    {bgImage && (
                                        <>
                                            <div
                                                className="absolute inset-0 bg-cover bg-center opacity-25 group-hover:opacity-40 transition-all duration-700 transform group-hover:scale-110"
                                                style={{ backgroundImage: `url(${bgImage})` }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/90 to-transparent z-0" />
                                        </>
                                    )}

                                    {/* --- ACTIONS (SI CONNECTÉ) --- */}
                                    {isAuthenticated && (
                                        <div className="absolute top-3 right-3 z-30 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
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

                                            <button
                                                onClick={(e) => handleDeleteTeam(e, team.id)}
                                                className="p-2 rounded-lg bg-slate-900/90 text-slate-500 hover:bg-red-500/20 hover:text-red-500 border border-white/20 transition-colors shadow-lg backdrop-blur-sm"
                                                title="Delete Line Up"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    )}

                                    <div className="relative z-10 space-y-4">
                                        <div>
                                            <div className="text-2xl font-black text-white italic tracking-tight group-hover:text-indigo-400 truncate pr-16 drop-shadow-md transition-colors">
                                                {team.id.toUpperCase()}
                                            </div>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border mt-2 inline-block shadow-sm ${getCategoryColor(team.carCategory || '')}`}>
                                                {team.carCategory || "Unknown"}
                                            </span>
                                        </div>

                                        <div className="bg-black/40 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
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
            </section>

            {/* --- FOOTER --- */}
            <footer className="relative z-10 border-t border-white/5 py-8 mt-8">
                <div className="text-center">
                    <p className="text-xs text-slate-500">
                        Built by <span className="font-bold text-indigo-400">Antoine</span>
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1">
                        French Baguette Team &mdash; {new Date().getFullYear()}
                    </p>
                </div>
            </footer>

            {showCreateModal && <CreateTeamModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateSession} />}
            {editingTeam && <EditTeamModal team={editingTeam} onClose={() => setEditingTeam(null)} onSave={handleSaveSessionData} />}
            {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
            {joinPasswordTarget && (
                <JoinPasswordModal
                    onClose={() => setJoinPasswordTarget(null)}
                    onConfirm={(pwd) => handleJoinTeam(joinPasswordTarget, pwd)}
                />
            )}
        </div>
    );
};

export default LandingPage;

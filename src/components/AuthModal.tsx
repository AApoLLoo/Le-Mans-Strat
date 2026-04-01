import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, LogIn, Shield, UserCheck, Key } from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import ModalShell, { MODAL_FIELD_CLASS, MODAL_FIELD_DANGER_CLASS } from './ui/ModalShell';

import { API_BASE_URL } from '../constants';
const API_URL = API_BASE_URL;

export const AuthModal = ({ onClose }: { onClose: () => void }) => {
    const { login } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("DRIVER"); // Par défaut 'DRIVER'
    const [managerCode, setManagerCode] = useState(""); // Code secret pour devenir Admin
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password,
                    role,
                    managerCode: role === 'ADMIN' ? managerCode : undefined
                })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Erreur de connexion");

            login(data.token, data.user);
            onClose();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <ModalShell
            title={isRegister ? 'NEW LICENSE' : 'PILOT LOGIN'}
            onClose={onClose}
            ariaLabel={isRegister ? 'Register new account' : 'Pilot login'}
            closeLabel="Close authentication"
            size="sm"
            tone="brand"
            layer="critical"
        >
                <Badge variant="info" className="mb-4">French Baguette Team Control</Badge>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="bg-red-500/20 text-red-400 p-3 rounded text-xs font-bold text-center border border-red-500/30">{error}</div>}

                    {/* USERNAME */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-slate-500" size={16} />
                            <input
                                type="text"
                                aria-label="Username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className={`${MODAL_FIELD_CLASS} py-2 pl-10 text-sm font-bold`}
                                placeholder="Maverick"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* PASSWORD */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-slate-500" size={16} />
                            <input
                                type="password"
                                aria-label="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className={`${MODAL_FIELD_CLASS} py-2 pl-10 text-sm font-bold`}
                                placeholder="••••••"
                            />
                        </div>
                    </div>

                    {/* CHOIX DU RÔLE (Seulement à l'inscription) */}
                    {isRegister && (
                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">License Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole("DRIVER")}
                                    className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all duration-150 active:scale-[0.98] ${role === 'DRIVER' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-900/20' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
                                >
                                    <UserCheck size={20}/>
                                    <span className="text-xs font-bold">PILOT</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole("ADMIN")}
                                    className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all duration-150 active:scale-[0.98] ${role === 'ADMIN' ? 'bg-red-600/20 border-red-500 text-red-400 shadow-lg shadow-red-900/20' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
                                >
                                    <Shield size={20}/>
                                    <span className="text-xs font-bold">MANAGER</span>
                                </button>
                            </div>

                            {/* CHAMP SECRET MANAGER (S'affiche uniquement si MANAGER sélectionné) */}
                            {role === 'ADMIN' && (
                                <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                                    <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
                                        <Key size={10}/> Required Access Code
                                    </label>
                                    <div className="relative mt-1">
                                        <div className="absolute left-3 top-2.5 text-red-400"><Key size={16}/></div>
                                        <input
                                            type="password"
                                            aria-label="Manager access code"
                                            value={managerCode}
                                            onChange={e => setManagerCode(e.target.value)}
                                            className={`${MODAL_FIELD_DANGER_CLASS} py-2 pl-10 text-sm font-bold placeholder-red-500/30 focus:bg-red-900/20`}
                                            placeholder="Enter Admin Password"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <Button type="submit" variant="primary" size="lg" block className="mt-4 font-black italic flex justify-center items-center gap-2">
                        {isRegister ? "CREATE ACCOUNT" : <><LogIn size={18}/> ACCESS TELEMETRY</>}
                    </Button>
                </form>

                <div className="mt-6 text-center pt-4 border-t border-white/5">
                    <button onClick={() => setIsRegister(!isRegister)} className="text-xs text-slate-400 hover:text-indigo-400 transition-colors font-medium">
                        {isRegister ? "Already have an account? Login" : "No account? Register now"}
                    </button>
                </div>
        </ModalShell>
    );
};
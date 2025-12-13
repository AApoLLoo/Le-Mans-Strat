import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, Lock, LogIn } from 'lucide-react';

const API_URL = "https://api.racetelemetrybyfbt.com";

export const AuthModal = ({ onClose }: { onClose: () => void }) => {
    const { login } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
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
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#0f172a] w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-white italic tracking-wider">
                        {isRegister ? "JOIN THE TEAM" : "PILOT LOGIN"}
                    </h2>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-white"/></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="bg-red-500/20 text-red-400 p-3 rounded text-xs font-bold text-center border border-red-500/30">{error}</div>}

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-slate-500" size={16} />
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                                   className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 text-white focus:border-indigo-500 outline-none text-sm font-bold" placeholder="Maverick" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-slate-500" size={16} />
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                   className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 text-white focus:border-indigo-500 outline-none text-sm font-bold" placeholder="••••••" />
                        </div>
                    </div>

                    <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-black italic shadow-lg transition-all mt-4 flex justify-center items-center gap-2">
                        {isRegister ? "CREATE ACCOUNT" : <><LogIn size={18}/> ACCESS TELEMETRY</>}
                    </button>
                </form>

                <div className="mt-6 text-center pt-4 border-t border-white/5">
                    <button onClick={() => setIsRegister(!isRegister)} className="text-xs text-slate-400 hover:text-indigo-400 transition-colors">
                        {isRegister ? "Already have an account? Login" : "No account? Register now"}
                    </button>
                </div>
            </div>
        </div>
    );
};
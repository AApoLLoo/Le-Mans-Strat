import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Save, Plus, Trash2, Car, Users, Crown, Shield, Download, Upload, RotateCcw, RefreshCw } from 'lucide-react';
import type { GameState, Driver } from '../types';
import Panel from './ui/Panel';
import Button from './ui/Button';
import Badge from './ui/Badge';
import ModalShell, { MODAL_FIELD_CLASS } from './ui/ModalShell';
import { API_BASE_URL } from '../constants';

type SettingsTab = 'DRIVERS' | 'RACE' | 'DATA' | 'ADMIN';

/* eslint-disable no-unused-vars */
interface SettingsModalProps {
    teamId: string;
    gameState: GameState;
    syncUpdate: (...args: [Partial<GameState>]) => void;
    onClose: () => void;
    isHypercar: boolean;
    isLMGT3: boolean;
    onAddDriver: () => void;
    onRemoveDriver: (...args: [number | string]) => void;
    onUpdateDriver: (...args: [number | string, string, string | number]) => void;
    onReset: () => void;
    canManageLineup: boolean;
    canAccessAdmin: boolean;
}
/* eslint-enable no-unused-vars */

const toSafeNumber = (value: unknown, fallback: number, min?: number, max?: number): number => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    const withMin = min !== undefined ? Math.max(min, n) : n;
    return max !== undefined ? Math.min(max, withMin) : withMin;
};

const isDriverArray = (value: unknown): value is Driver[] => {
    return Array.isArray(value) && value.every((d) => d && typeof d === 'object' && 'id' in d && 'name' in d && 'color' in d);
};

export default function SettingsModal({
    teamId,
    gameState,
    syncUpdate,
    onClose,
    isHypercar,
    isLMGT3,
    onAddDriver,
    onRemoveDriver,
    onUpdateDriver,
    onReset,
    canManageLineup,
    canAccessAdmin
}: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('RACE');
    const [statusText, setStatusText] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [draftTankCap, setDraftTankCap] = useState<number>(gameState.tankCapacity || 100);
    const [draftFuelCons, setDraftFuelCons] = useState<number>(gameState.fuelCons || 3.5);
    const [draftVeCons, setDraftVeCons] = useState<number>(gameState.veCons || 2.5);
    const [draftRaceHours, setDraftRaceHours] = useState<number>(gameState.raceDurationHours || 24);
    const [members, setMembers] = useState<Array<{ userId: number; username: string; teamRole: 'LEADER' | 'MEMBER'; globalRole: 'ADMIN' | 'DRIVER' }>>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState<string>('');
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

    const categoryLabel = useMemo(() => {
        if (isHypercar) return 'HYPERCAR';
        if (isLMGT3) return 'LMGT3';
        return 'PROTO/GT';
    }, [isHypercar, isLMGT3]);

    const applyRaceSettings = () => {
        syncUpdate({
            tankCapacity: toSafeNumber(draftTankCap, gameState.tankCapacity || 100, 10, 200),
            fuelCons: toSafeNumber(draftFuelCons, gameState.fuelCons || 3.5, 0.1, 20),
            veCons: toSafeNumber(draftVeCons, gameState.veCons || 2.5, 0, 20),
            raceDurationHours: toSafeNumber(draftRaceHours, gameState.raceDurationHours || 24, 1, 48)
        });
        setStatusText('Race settings sauvegardes.');
    };

    const applyCategoryPreset = () => {
        if (isHypercar) {
            setDraftTankCap(105);
            setDraftFuelCons(8.2);
            setDraftVeCons(2.4);
        } else if (isLMGT3) {
            setDraftTankCap(110);
            setDraftFuelCons(5.1);
            setDraftVeCons(0);
        } else {
            setDraftTankCap(100);
            setDraftFuelCons(4.2);
            setDraftVeCons(0);
        }
        setStatusText(`Preset ${categoryLabel} charge (non applique tant que tu ne cliques pas Save).`);
    };

    const exportSettings = () => {
        const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            settings: {
                currentStint: gameState.currentStint,
                activeDriverId: gameState.activeDriverId,
                drivers: gameState.drivers,
                stintConfig: gameState.stintConfig,
                stintAssignments: gameState.stintAssignments,
                stintNotes: gameState.stintNotes,
                fuelCons: gameState.fuelCons,
                veCons: gameState.veCons,
                tankCapacity: gameState.tankCapacity,
                raceDurationHours: gameState.raceDurationHours
            }
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lmu-settings-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setStatusText('Export JSON cree.');
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const content = await file.text();
            const parsed = JSON.parse(content) as { settings?: Partial<GameState> };
            const incoming = parsed?.settings;

            if (!incoming || typeof incoming !== 'object') {
                setStatusText('Import invalide: format settings absent.');
                return;
            }

            const patch: Partial<GameState> = {};

            if (isDriverArray(incoming.drivers)) patch.drivers = incoming.drivers;
            if (incoming.currentStint !== undefined) patch.currentStint = toSafeNumber(incoming.currentStint, gameState.currentStint, 0, 99);
            if (incoming.activeDriverId !== undefined) patch.activeDriverId = incoming.activeDriverId;
            if (incoming.stintConfig && typeof incoming.stintConfig === 'object') patch.stintConfig = incoming.stintConfig;
            if (incoming.stintAssignments && typeof incoming.stintAssignments === 'object') patch.stintAssignments = incoming.stintAssignments;
            if (incoming.stintNotes && typeof incoming.stintNotes === 'object') patch.stintNotes = incoming.stintNotes;
            if (incoming.fuelCons !== undefined) patch.fuelCons = toSafeNumber(incoming.fuelCons, gameState.fuelCons, 0.1, 20);
            if (incoming.veCons !== undefined) patch.veCons = toSafeNumber(incoming.veCons, gameState.veCons, 0, 20);
            if (incoming.tankCapacity !== undefined) patch.tankCapacity = toSafeNumber(incoming.tankCapacity, gameState.tankCapacity, 10, 200);
            if (incoming.raceDurationHours !== undefined) patch.raceDurationHours = toSafeNumber(incoming.raceDurationHours, gameState.raceDurationHours, 1, 48);

            syncUpdate(patch);
            setStatusText('Import applique.');
        } catch {
            setStatusText('Import impossible: JSON invalide.');
        } finally {
            event.target.value = '';
        }
    };

    const clearStrategyOnly = () => {
        if (!confirm('Reset uniquement la strategie (stints, notes, assignations) ?')) return;
        syncUpdate({
            currentStint: 0,
            stintConfig: {},
            stintAssignments: {},
            stintNotes: {}
        });
        setStatusText('Strategie reinitialisee.');
    };

    const handleDeleteLineup = () => {
        if (!confirm('Supprimer la strategie courante et l historique local ?')) return;
        clearStrategyOnly();
    };

    const loadLineupMembers = async () => {
        setMembersLoading(true);
        setMembersError('');
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        try {
            const res = await fetch(`${API_BASE_URL}/api/lineups/${teamId}/members`, { headers });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                setMembersError(String(payload?.error || `Chargement impossible (HTTP ${res.status}).`));
                return;
            }

            const payload = await res.json().catch(() => ({ members: [] }));
            const nextMembers = Array.isArray(payload?.members) ? payload.members : [];
            setMembers(nextMembers.map((m: any) => ({
                userId: Number(m.userId),
                username: String(m.username || `user-${m.userId}`),
                teamRole: (String(m.teamRole || 'MEMBER').toUpperCase() === 'LEADER' ? 'LEADER' : 'MEMBER'),
                globalRole: (String(m.globalRole || 'DRIVER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'DRIVER')
            })));
        } finally {
            setMembersLoading(false);
        }
    };

    const updateTeamRole = async (userId: number, role: 'LEADER' | 'MEMBER') => {
        setUpdatingUserId(userId);
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        try {
            const res = await fetch(`${API_BASE_URL}/api/lineups/${teamId}/members/${userId}/team-role`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ role })
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                setStatusText(String(payload?.error || `Update role equipe impossible (HTTP ${res.status}).`));
                return;
            }
            setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, teamRole: role } : m)));
            setStatusText(`Role equipe mis a jour: ${userId} -> ${role}`);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const updateGlobalRole = async (userId: number, role: 'ADMIN' | 'DRIVER') => {
        setUpdatingUserId(userId);
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        try {
            const res = await fetch(`${API_BASE_URL}/api/users/${userId}/global-role`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ role })
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                setStatusText(String(payload?.error || `Update role global impossible (HTTP ${res.status}).`));
                return;
            }
            setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, globalRole: role } : m)));
            setStatusText(`Role global mis a jour: ${userId} -> ${role}`);
        } finally {
            setUpdatingUserId(null);
        }
    };

    useEffect(() => {
        if (activeTab === 'ADMIN' && canAccessAdmin) {
            loadLineupMembers();
        }
    }, [activeTab, canAccessAdmin]);

    return (
        <ModalShell
            title={<span className="flex items-center gap-2"><Shield size={20} className="text-indigo-500"/> RACE SETTINGS</span>}
            onClose={onClose}
            ariaLabel="Race settings"
            closeLabel="Close race settings"
            size="xl"
            tone={activeTab === 'ADMIN' ? 'danger' : 'brand'}
            layer="modal"
        >
            <div className="-mx-6 -my-6 flex flex-col max-h-[90vh]">

                <div className="flex border-b border-white/5 text-[11px]">
                    <button onClick={() => setActiveTab('RACE')} className={`flex-1 p-3 font-bold uppercase tracking-widest ${activeTab === 'RACE' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}>Race</button>
                    <button onClick={() => setActiveTab('DRIVERS')} className={`flex-1 p-3 font-bold uppercase tracking-widest ${activeTab === 'DRIVERS' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}>Drivers</button>
                    <button onClick={() => setActiveTab('DATA')} className={`flex-1 p-3 font-bold uppercase tracking-widest ${activeTab === 'DATA' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}>Data</button>
                    {canAccessAdmin && (
                        <button onClick={() => setActiveTab('ADMIN')} className={`flex-1 p-3 font-bold uppercase tracking-widest ${activeTab === 'ADMIN' ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}>Admin</button>
                    )}
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                    {statusText && (
                        <div className="text-xs font-bold text-emerald-300 border border-emerald-500/30 bg-emerald-900/20 rounded px-3 py-2">
                            {statusText}
                        </div>
                    )}

                    {activeTab === 'RACE' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Panel className="rounded-lg p-4 space-y-3">
                                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                        <Car size={14}/> Car Baseline ({categoryLabel})
                                    </div>
                                    <label className="block text-[11px] text-slate-400">Tank Capacity (L)</label>
                                    <input aria-label="Tank Capacity" type="number" value={draftTankCap} onChange={(e) => setDraftTankCap(Number(e.target.value))} className={`${MODAL_FIELD_CLASS} p-2 font-bold`}/>
                                    <label className="block text-[11px] text-slate-400">Fuel Cons (L/Lap)</label>
                                    <input aria-label="Fuel Consumption" type="number" step="0.01" value={draftFuelCons} onChange={(e) => setDraftFuelCons(Number(e.target.value))} className={`${MODAL_FIELD_CLASS} p-2 font-bold`}/>
                                    {(isHypercar || isLMGT3) && (
                                        <>
                                            <label className="block text-[11px] text-slate-400">Virtual Energy (%/Lap)</label>
                                            <input aria-label="Virtual Energy Consumption" type="number" step="0.1" value={draftVeCons} onChange={(e) => setDraftVeCons(Number(e.target.value))} className={`${MODAL_FIELD_CLASS} p-2 font-bold`}/>
                                        </>
                                    )}
                                </Panel>

                                <Panel className="rounded-lg p-4 space-y-3">
                                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Session Baseline</div>
                                    <label className="block text-[11px] text-slate-400">Race Duration (hours)</label>
                                    <input aria-label="Race Duration" type="number" value={draftRaceHours} onChange={(e) => setDraftRaceHours(Number(e.target.value))} className={`${MODAL_FIELD_CLASS} p-2 font-bold`}/>
                                    <Button onClick={applyCategoryPreset} variant="secondary" size="sm" block>
                                        Charger preset categorie
                                    </Button>
                                    <Button onClick={applyRaceSettings} variant="success" size="sm" block className="flex items-center justify-center gap-2">
                                        <Save size={14}/> Save race settings
                                    </Button>
                                </Panel>
                            </div>
                        </div>
                    )}

                    {activeTab === 'DRIVERS' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <Users size={14}/> Driver lineup
                                </label>
                                {canManageLineup && (
                                    <Button onClick={onAddDriver} variant="primary" size="sm" className="flex items-center gap-1">
                                        <Plus size={12}/> Add driver
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {gameState.drivers.map((d, idx) => (
                                    <div key={d.id} className="flex gap-2 items-center bg-slate-900 p-2 rounded border border-white/5">
                                        <div className="w-6 text-center text-xs font-mono text-slate-500">{idx + 1}</div>
                                        <input
                                            aria-label={`Driver ${idx + 1} name`}
                                            type="text"
                                            value={d.name}
                                            onChange={(e) => onUpdateDriver(d.id, 'name', e.target.value)}
                                            disabled={!canManageLineup}
                                            className="flex-1 bg-transparent border-b border-transparent focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400/70 text-sm text-white font-bold outline-none px-2 rounded"
                                        />
                                        <input
                                            aria-label={`Driver ${idx + 1} color`}
                                            type="color"
                                            value={d.color}
                                            onChange={(e) => onUpdateDriver(d.id, 'color', e.target.value)}
                                            disabled={!canManageLineup}
                                            className="w-7 h-7 rounded bg-transparent border-none cursor-pointer"
                                        />
                                        {String(d.id) === String(gameState.activeDriverId) && (
                                            <Badge variant="success">ACTIVE</Badge>
                                        )}
                                        {canManageLineup && gameState.drivers.length > 1 && (
                                            <button onClick={() => onRemoveDriver(d.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                                                <Trash2 size={16}/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'DATA' && (
                        <div className="space-y-4">
                            <Panel className="rounded-lg p-4 space-y-3">
                                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Backup and restore</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Button onClick={exportSettings} variant="secondary" size="sm" className="flex items-center justify-center gap-2">
                                        <Download size={14}/> Export JSON
                                    </Button>
                                    <Button onClick={handleImportClick} variant="primary" size="sm" className="flex items-center justify-center gap-2">
                                        <Upload size={14}/> Import JSON
                                    </Button>
                                </div>
                                <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden"/>
                                <p className="text-[11px] text-slate-500">
                                    Exporte/importe drivers, stint config, notes, assignations et baselines conso.
                                </p>
                            </Panel>
                        </div>
                    )}

                    {activeTab === 'ADMIN' && canAccessAdmin && (
                        <div className="space-y-4">
                            <Panel className="rounded-lg p-4 border-indigo-500/20 bg-indigo-900/10">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                                        <Users size={14}/> User grades
                                    </h3>
                                    <Button onClick={loadLineupMembers} variant="secondary" size="sm" className="flex items-center gap-2" disabled={membersLoading}>
                                        <RefreshCw size={12} className={membersLoading ? 'animate-spin' : ''}/> Refresh
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {membersError && <div className="text-xs text-amber-300">{membersError}</div>}
                                    {!membersError && members.length === 0 && !membersLoading && (
                                        <div className="text-xs text-slate-500">Aucun membre charge.</div>
                                    )}
                                    {members.map((member) => (
                                        <div key={member.userId} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-center bg-slate-900/60 border border-white/10 rounded p-2">
                                            <div className="min-w-0">
                                                <div className="text-sm text-white font-bold truncate">{member.username}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">userId: {member.userId}</div>
                                            </div>

                                            <select
                                                aria-label={`Team role ${member.username}`}
                                                value={member.teamRole}
                                                disabled={updatingUserId === member.userId}
                                                onChange={(e) => updateTeamRole(member.userId, e.target.value as 'LEADER' | 'MEMBER')}
                                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-white"
                                            >
                                                <option value="MEMBER">TEAM: MEMBER</option>
                                                <option value="LEADER">TEAM: LEADER</option>
                                            </select>

                                            <select
                                                aria-label={`Global role ${member.username}`}
                                                value={member.globalRole}
                                                disabled={updatingUserId === member.userId || gameState.userGlobalRole !== 'ADMIN'}
                                                onChange={(e) => updateGlobalRole(member.userId, e.target.value as 'ADMIN' | 'DRIVER')}
                                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-white"
                                            >
                                                <option value="DRIVER">GLOBAL: DRIVER</option>
                                                <option value="ADMIN">GLOBAL: ADMIN</option>
                                            </select>
                                        </div>
                                    ))}
                                    <div className="text-[10px] text-slate-500">
                                        Roles equipe: <span className="font-mono">PATCH /api/lineups/:teamId/members/:userId/team-role</span>
                                        {' '}| Roles globaux: <span className="font-mono">PATCH /api/users/:userId/global-role</span>
                                    </div>
                                </div>
                            </Panel>

                            <Panel className="rounded-lg p-4 border-red-500/25 bg-red-900/10">
                                <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Crown size={14}/> Danger Zone
                                </h3>
                                <div className="space-y-3">
                                    <Button onClick={clearStrategyOnly} variant="secondary" size="sm" block className="flex items-center justify-center gap-2">
                                        <RotateCcw size={14}/> Reset strategy only
                                    </Button>
                                    <Button onClick={onReset} variant="warning" size="sm" block>
                                        Reset race data (laps/timers/incidents)
                                    </Button>
                                    <Button onClick={handleDeleteLineup} variant="danger" size="sm" block>
                                        Delete lineup (current plan)
                                    </Button>
                                </div>
                            </Panel>
                        </div>
                    )}
                </div>
            </div>
        </ModalShell>
    );
}
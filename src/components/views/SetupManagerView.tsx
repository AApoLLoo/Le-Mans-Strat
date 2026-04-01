import React, { useEffect } from 'react';
import { RefreshCw, UploadCloud, Wrench } from 'lucide-react';
import type { SetupSummary } from '../../types';
import { SETUPS_LIST_ENDPOINTS, SETUPS_LOAD_ENDPOINTS } from '../../constants';

interface SetupManagerViewProps {
    setups: SetupSummary[];
    loading: boolean;
    error: string | null;
    applyingSetupId: string | null;
    applyStatus: { type: 'success' | 'error'; message: string } | null;
    onRefresh: () => void;
    // eslint-disable-next-line no-unused-vars
    onApply: (_setupId: string) => void;
    lastTestedEndpoints?: { list: string; load: string };
}

const SetupManagerView: React.FC<SetupManagerViewProps> = ({
    setups,
    loading,
    error,
    applyingSetupId,
    applyStatus,
    onRefresh,
    onApply,
    lastTestedEndpoints
}) => {
    useEffect(() => {
        onRefresh();
    }, [onRefresh]);

    return (
        <div className="h-full bg-[#050a10] p-4 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-900/60 border border-white/10 rounded-xl p-3">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <Wrench size={14} className="text-indigo-400"/> Setup Manager
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">Liste des setups disponibles sur le bridge REST et chargement direct sur la voiture.</p>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="px-3 py-1.5 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-white/10 flex items-center gap-2 disabled:opacity-50"
                >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
                </button>
            </div>

            {applyStatus && (
                <div className={`rounded-lg border px-3 py-2 text-xs font-bold ${applyStatus.type === 'success' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-900/20' : 'text-red-300 border-red-500/30 bg-red-900/20'}`}>
                    {applyStatus.message}
                </div>
            )}

            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-300 font-bold">
                    <div className="mb-2">API Error: {error}</div>
                    <div className="text-[11px] text-red-400 space-y-1">
                        <div className="font-bold text-amber-300">⚠️ CORS Issue or Bridge Unreachable</div>
                        <div>Tried VPS proxy first, then local endpoints</div>
                        <div className="text-amber-300 mt-1.5">Solution:</div>
                        <div>1. Configure VPS bridge to proxy `/api/bridge/setups/list` and `/api/bridge/setups/apply`</div>
                        <div>2. Or run LMU bridge on same machine</div>
                        <div className="mt-1">Debug info:</div>
                        <div>List endpoints tried: {SETUPS_LIST_ENDPOINTS.join(', ')}</div>
                        <div>Load endpoints tried: {SETUPS_LOAD_ENDPOINTS.join(', ')}</div>
                        {lastTestedEndpoints?.list && <div className="text-emerald-400">✓ Last working list: {lastTestedEndpoints.list}</div>}
                        {lastTestedEndpoints?.load && <div className="text-emerald-400">✓ Last working load: {lastTestedEndpoints.load}</div>}
                    </div>
                </div>
            )}

            {!error && !loading && setups.length === 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 px-3 py-2 text-xs text-amber-300 font-bold">
                    <div className="mb-1">No setups returned from bridge.</div>
                    <div className="text-[11px] text-amber-400 space-y-0.5">
                        Check that:<br/>
                        • Bridge API is running<br/>
                        • Endpoints are correctly configured<br/>
                        • REST API returns valid setup list
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                {!loading && setups.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                        No setup found.
                    </div>
                )}

                {setups.map((setup) => {
                    const isApplying = applyingSetupId === setup.id;
                    return (
                        <div key={setup.id} className="bg-slate-900/50 border border-white/10 rounded-lg p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-bold text-white truncate">{setup.name}</div>
                                <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5">
                                    <span>ID: {setup.id}</span>
                                    {setup.car && <span>Car: {setup.car}</span>}
                                    {setup.updatedAt && <span>Updated: {setup.updatedAt}</span>}
                                </div>
                            </div>
                            <button
                                onClick={() => onApply(setup.id)}
                                disabled={isApplying}
                                className="shrink-0 px-3 py-1.5 rounded text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 disabled:opacity-50"
                            >
                                <UploadCloud size={12} className={isApplying ? 'animate-pulse' : ''}/>
                                {isApplying ? 'Loading...' : 'Load on car'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SetupManagerView;


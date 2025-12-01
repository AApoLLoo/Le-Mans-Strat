import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { Clock, Plus, Users, ChevronRight, User, X, Trash2, Car } from 'lucide-react';
import type { GameState, Driver } from '../types';

// État par défaut
const DEFAULT_GAME_STATE: GameState = {
    currentStint: 0,
    raceTime: 24 * 3600,
    sessionTimeRemaining: 24 * 3600,
    stintDuration: 0,
    isRaceRunning: false,
    trackName: "LE MANS",
    sessionType: "RACE",
    weather: "SUNNY",
    airTemp: 25,
    trackTemp: 35,
    trackWetness: 0,
    rainIntensity: 0,
    fuelCons: 3.65,
    veCons: 2.5,
    tankCapacity: 105,
    raceDurationHours: 24,
    avgLapTimeSeconds: 210,
    drivers: [],
    activeDriverId: 1,
    incidents: [],
    chatMessages: [],
    stintNotes: {},
    stintAssignments: {},
    position: 0,
    telemetry: {
        laps: 0, curLap: 0, lastLap: 0, bestLap: 0, position: 0,
        speed: 0, rpm: 0, maxRpm: 8000, gear: 0,
        throttle: 0, brake: 0, clutch: 0, steering: 0,
        waterTemp: 0, oilTemp: 0,
        fuel: { current: 0, max: 105, lastLapCons: 0, averageCons: 0 },
        VE: { VEcurrent: 100, VElastLapCons: 0, VEaverageCons: 0 },
        batterySoc: 0,
        tires: { fl: 100, fr: 100, rl: 100, rr: 100 },
        tirePressures: { fl: 0, fr: 0, rl: 0, rr: 0 },
        tireTemps: { flc: 0, frc: 0, rlc: 0, rrc: 0 },
        brakeTemps: { flc: 0, frc: 0, rlc: 0, rrc: 0 },
        tireCompounds: { fl: "---", fr: "---", rl: "---", rr: "---" },
        strategyEstPitTime: 0,
        inPitLane: false, inGarage: true, pitLimiter: false,
        damageIndex: 0, isOverheating: false
    }
};

const CATEGORIES = ["Hypercar", "LMP2", "LMP2 (ELMS)", "LMP3", "GT3"];

// --- MODAL DE CRÉATION AVEC CATÉGORIE ---
const CreateTeamModal = ({ onClose, onCreate }: { onClose: () => void, onCreate: (name: string, category: string, drivers: Driver[]) => void }) => {
    const [teamName, setTeamName] = useState("");
    const [category, setCategory] = useState("Hypercar");
    const [drivers, setDrivers] = useState<Driver[]>([
        { id: Date.now(), name: "", color: "#3b82f6" }
    ]);

    const handleAddDriver = () => {
        setDrivers([...drivers, { id: Date.now(), name: "", color: "#ec4899" }]);
    };

    const handleRemoveDriver = (id: number | string) => {
        if (drivers.length > 1) {
            setDrivers(drivers.filter(d => d.id !== id));
        }
    };

    const handleUpdateDriver = (id: number | string, val: string) => {
        setDrivers(drivers.map(d => d.id === id ? { ...d, name: val } : d));
    };

    const handleSubmit = () => {
        if (!teamName.trim()) return alert("Please enter a Line Up Name");
        const validDrivers = drivers.filter(d => d.name.trim() !== "");
        if (validDrivers.length === 0) return alert("Please add at least one driver");
        onCreate(teamName, category, validDrivers);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f172a] w-full max-w-md rounded-xl border border-indigo-500/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* Header */}
                <div className="bg-indigo-600/10 p-4 border-b border-indigo-500/20 flex justify-between items-center">
                    <h2 className="text-xl font-black italic text-white tracking-wider">NEW LINE UP</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Line Up Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Line Up Name</label>
                        <input 
                            type="text" 
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="ex: Alpine #35" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                            autoFocus
                        />
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Car size={12}/> Car Category
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                        category === cat 
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/20' 
                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Drivers List */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Drivers List</label>
                            <button onClick={handleAddDriver} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors">
                                <Plus size={12}/> ADD DRIVER
                            </button>
                        </div>
                        
                        <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                            {drivers.map((driver, idx) => (
                                <div key={driver.id} className="flex gap-2">
                                    <div className="flex items-center justify-center w-8 bg-slate-800 rounded text-xs font-mono text-slate-500 border border-slate-700">
                                        {idx + 1}
                                    </div>
                                    <input 
                                        type="text" 
                                        value={driver.name}
                                        onChange={(e) => handleUpdateDriver(driver.id, e.target.value)}
                                        placeholder={`Driver Name`}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none placeholder:text-slate-700"
                                    />
                                    {drivers.length > 1 && (
                                        <button onClick={() => handleRemoveDriver(driver.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                                            <Trash2 size={16}/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-900/50 border-t border-white/5 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-lg font-bold text-slate-400 hover:bg-white/5 transition-colors text-sm">CANCEL</button>
                    <button onClick={handleSubmit} className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-900/20 transition-all active:scale-95 text-sm">
                        CREATE LINE UP
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- LANDING PAGE PRINCIPALE ---
const LandingPage = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [strategies, loading] = useCollection(
    query(collection(db, "strategies"), orderBy("createdAt", "desc"))
  );

  const handleJoinTeam = (teamId: string) => {
    localStorage.setItem('teamId', teamId);
    navigate('/strategy');
  };

  const handleCreateSession = async (name: string, category: string, drivers: Driver[]) => {
      const teamId = name.replace(/\s+/g, '-').toLowerCase();
      
      try {
          await setDoc(doc(db, "strategies", teamId), {
              ...DEFAULT_GAME_STATE,
              id: teamId,
              carCategory: category, // Sauvegarde de la catégorie
              drivers: drivers,
              activeDriverId: drivers[0]?.id,
              createdAt: new Date().toISOString(),
              lastPacketTime: Date.now()
          });
          handleJoinTeam(teamId);
      } catch (e) {
          alert("Error creating session: " + e);
      }
  };

  const activeTeams = strategies?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) || [];

  const getCategoryColor = (cat: string) => {
      const c = (cat || "").toLowerCase();
      if (c.includes('hyper')) return 'bg-red-500/20 text-red-400 border-red-500/30';
      if (c.includes('lmp2')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      if (c.includes('gt3')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      if (c.includes('lmp3')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      return 'bg-white/10 text-slate-300 border-white/10';
  };

  return (
    <div className="min-h-screen bg-[#020408] text-white font-display overflow-x-hidden relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex flex-col items-center">
        
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500 drop-shadow-2xl">
            LE MANS ULTIMATE <span className="text-indigo-500"> </span>
          </h1>
          <p className="text-slate-400 text-lg uppercase tracking-[0.3em] font-bold">Strategic Command Center</p>
        </div>

        {/* Bouton Création */}
        <div className="w-full max-w-2xl flex gap-4 mb-16">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex-1 group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 p-1 rounded-xl shadow-[0_0_40px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_rgba(79,70,229,0.5)] transition-all duration-300 transform hover:-translate-y-1"
          >
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

        {/* Liste des Sessions */}
        <div className="w-full max-w-5xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            <h2 className="text-xl font-bold text-white tracking-widest uppercase">Live Sessions</h2>
            <div className="h-px bg-gradient-to-r from-white/20 to-transparent flex-1 ml-4"></div>
          </div>

          {loading ? (
            <div className="text-center text-slate-500 animate-pulse">Loading mission control...</div>
          ) : activeTeams.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 border-dashed">
              <div className="text-slate-500 font-bold">NO ACTIVE SESSIONS FOUND</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTeams.map((team: any) => (
                <div 
                  key={team.id}
                  onClick={() => handleJoinTeam(team.id)}
                  className="group bg-slate-900/50 border border-white/10 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:bg-slate-800/80 hover:shadow-2xl hover:shadow-indigo-500/10 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users size={80} className="text-white"/>
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-2xl font-black text-white italic tracking-tight group-hover:text-indigo-400 transition-colors">
                          {team.id.toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getCategoryColor(team.carCategory)}`}>
                            {team.carCategory || "CATEGORY"}
                          </span>
                          {team.carNumber && <span className="text-[10px] font-bold px-2 py-0.5 bg-white/5 text-slate-400 border border-white/10 rounded">#{team.carNumber}</span>}
                        </div>
                      </div>
                      <ChevronRight className="text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all"/>
                    </div>

                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                        <User size={10}/> On Track
                      </div>
                      <div className="font-mono text-emerald-400 font-bold truncate">
                        {team.driverName || "NO DRIVER"}
                      </div>
                    </div>

                    {team.drivers && team.drivers.length > 0 && (
                        <div className="space-y-1">
                            <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Lineup</div>
                            <div className="flex flex-wrap gap-2">
                                {team.drivers.map((d: any) => (
                                    <span key={d.id} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300 border border-white/5">
                                        {d.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock size={10}/>
                        <span>{team.lastPacketTime ? new Date(team.lastPacketTime).toLocaleTimeString() : "--:--"}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${team.isRaceRunning ? 'text-emerald-500' : 'text-slate-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${team.isRaceRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
                        {team.isRaceRunning ? "LIVE" : "OFFLINE"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateTeamModal 
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateSession}
        />
      )}
    </div>
  );
};

export default LandingPage;
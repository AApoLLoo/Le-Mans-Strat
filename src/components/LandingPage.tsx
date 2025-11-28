import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc } from "firebase/firestore";
import { db } from '../lib/firebase';
import lmp2CarImg from '../assets/lmp2-car.jpg'; 
import hypercarCarImg from '../assets/Hypercar.jpg';
import baguetteImg from '../assets/Baguette.png';
import { ArrowRight, ChevronLeft, Car, Users, RefreshCw, Trash2 } from 'lucide-react';

const generateBaguettes = (count: number) => {
  const baguettes = [];
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100 + '%';
    const animationDuration = Math.random() * 10 + 5 + 's'; 
    const animationDelay = Math.random() * -15 + 's'; 
    const scale = Math.random() * 0.5 + 0.3; 
    baguettes.push(
        <img key={i} src={baguetteImg} className="baguette-fall" alt="" style={{ left, animationDuration, animationDelay, transform: `scale(${scale})` }} />
    );
  }
  return baguettes;
};

interface Team {
    id: string;
    name: string;
    category: string;
    color: string;
}

interface LandingPageProps {
    onSelectTeam: (team: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectTeam }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customId, setCustomId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "teams"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Team[];
        setTeams(teamsData);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCustomJoin = (e: React.FormEvent) => {
      e.preventDefault();
      if(customId.trim()) onSelectTeam(customId.trim().toLowerCase());
  };

  const handleDeleteTeam = async (teamId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!db) return;

      if (window.confirm(`Are you sure you want to delete team "${teamId}"? This action cannot be undone.`)) {
          try {
              await deleteDoc(doc(db, "teams", teamId));
          } catch (error) {
              console.error("Error deleting team:", error);
              alert("Error deleting team. Check console.");
          }
      }
  };

  const renderLineupSelection = () => {
    const lineups = teams.filter(t => t.category.toLowerCase().includes(selectedCategory!.toLowerCase()));
    const bgImage = selectedCategory === 'hypercar' ? hypercarCarImg : lmp2CarImg;

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-4xl z-20 animate-fade-in-up">
        <button 
          onClick={() => setSelectedCategory(null)} 
          className="self-start text-slate-400 hover:text-white flex items-center gap-2 mb-4 transition-colors font-bold uppercase tracking-widest text-xs"
        >
          <ChevronLeft size={16}/> Back to Categories
        </button>

        <h2 className="text-3xl font-black text-white italic uppercase mb-4">
          SELECT YOUR <span className={selectedCategory === 'hypercar' ? 'text-red-500' : 'text-blue-500'}>{selectedCategory}</span>
        </h2>

        {lineups.length === 0 ? (
            <div className="text-slate-400 text-sm font-mono flex flex-col items-center gap-4 bg-slate-900/80 p-8 rounded-xl border border-white/10">
                <RefreshCw size={32} className="animate-spin text-indigo-500"/>
                <p>Waiting for car connection...</p>
                <p className="text-xs text-slate-500">Launch the Python Bridge to see your car here.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full px-4">
            {lineups.map((car) => (
                <div 
                    key={car.id} 
                    onClick={() => onSelectTeam(car.id)} 
                    className={`relative h-40 rounded-2xl overflow-hidden group hover:scale-105 transition-all duration-300 border-2 bg-slate-900/80 shadow-2xl cursor-pointer ${car.category === 'hypercar' ? 'border-red-500/50' : 'border-blue-500/50'}`}
                >
                    <div className="absolute inset-0 pointer-events-none">
                        <img src={bgImage} className="w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity filter blur-sm group-hover:blur-0" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                    </div>

                    <button 
                        onClick={(e) => handleDeleteTeam(car.id, e)}
                        className="absolute top-2 right-2 z-30 p-2 bg-black/60 hover:bg-red-600 text-slate-400 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
                        title="Delete Team"
                    >
                        <Trash2 size={14} />
                    </button>

                    <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 pointer-events-none">
                        <span className={`text-2xl font-black text-white italic drop-shadow-lg text-center leading-none mb-2`}>{car.name}</span>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg flex items-center gap-2 ${car.color || 'bg-slate-600'}`}>
                            <Users size={12}/> CONNECT
                        </div>
                        <span className="mt-2 text-[9px] text-slate-500 font-mono">ID: {car.id}</span>
                    </div>
                </div>
            ))}
            </div>
        )}
      </div>
    );
  };

  return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[#020408] gap-8 font-sans relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
           {generateBaguettes(40)}
           <div className="absolute inset-0 bg-[#020408] opacity-80"></div>
           <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-red-900/20 opacity-30 animate-pulse"></div>
        </div>

        <span className="text-xs font-bold text-indigo-500 tracking-widest uppercase mb-[-20px] z-20 relative">FBT Technologies only</span>
        <h1 className="text-5xl font-black text-white italic z-20 relative drop-shadow-2xl">LE MANS <span className="text-indigo-500">24H</span></h1>
        
        {selectedCategory ? (
          renderLineupSelection()
        ) : (
          <div className="flex flex-col md:flex-row gap-8 z-20 relative items-center">
            
            <button onClick={() => setSelectedCategory('hypercar')} className="w-72 h-80 rounded-3xl relative overflow-hidden group shadow-2xl hover:shadow-red-900/20 hover:-translate-y-2 transition-all duration-300 border border-red-500/20 bg-slate-900">
               <div className="absolute inset-0 pointer-events-none">
                 <img src={hypercarCarImg} alt="Hypercar" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
               </div>
               <div className="relative z-10 flex flex-col items-center justify-end h-full text-white p-8 pb-10 pointer-events-none">
                   <Car size={40} className="mb-4 text-red-500 opacity-80 group-hover:scale-110 transition-transform"/>
                   <span className="font-black text-4xl tracking-tighter italic">HYPERCAR</span>
                   <span className="text-xs text-red-200 mt-2 font-bold tracking-widest border border-red-500/50 px-3 py-1 rounded-full bg-red-900/30">SELECT CLASS</span>
                   {teams.filter(t => t.category === 'hypercar').length > 0 && (
                       <span className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-lg">
                           {teams.filter(t => t.category === 'hypercar').length} LIVE
                       </span>
                   )}
               </div>
            </button>

            <button onClick={() => setSelectedCategory('lmp2')} className="w-72 h-80 rounded-3xl relative overflow-hidden group shadow-2xl hover:shadow-blue-900/20 hover:-translate-y-2 transition-all duration-300 border border-blue-500/20 bg-slate-900">
               <div className="absolute inset-0 pointer-events-none">
                 <img src={lmp2CarImg} alt="LMP2" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
               </div>
               <div className="relative z-10 flex flex-col items-center justify-end h-full text-white p-8 pb-10 pointer-events-none">
                   <Car size={40} className="mb-4 text-blue-500 opacity-80 group-hover:scale-110 transition-transform"/>
                   <span className="font-black text-4xl tracking-tighter italic">LMP2</span>
                   <span className="text-xs text-blue-200 mt-2 font-bold tracking-widest border border-blue-500/50 px-3 py-1 rounded-full bg-blue-900/30">SELECT CLASS</span>
                   {teams.filter(t => t.category === 'lmp2').length > 0 && (
                       <span className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-lg">
                           {teams.filter(t => t.category === 'lmp2').length} LIVE
                       </span>
                   )}
               </div>
            </button>
          </div>
        )}

        {!selectedCategory && (
          <div className="z-20 mt-8 flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Or join specific ID manually</span>
            <form onSubmit={handleCustomJoin} className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
                <input 
                    type="text" 
                    placeholder="e.g. car-99..." 
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    className="bg-transparent text-white text-xs px-3 py-1.5 outline-none w-32 placeholder-slate-600 font-mono text-center"
                />
                <button type="submit" className="bg-slate-700 hover:bg-indigo-600 text-white p-1.5 rounded-lg transition-colors">
                    <ArrowRight size={14} />
                </button>
            </form>
          </div>
        )}
      </div>
  );
};

export default LandingPage;
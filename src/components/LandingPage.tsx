import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc } from "firebase/firestore";
import { db } from '../lib/firebase';
import lmp2CarImg from '../assets/lmp2-car.jpg'; 
import LMGT3 from '../assets/LMGT3-MERC.jpg';
import ELMS from '../assets/LMP2-ELMS.jpg';
import LMP3 from '../assets/LMP3.jpg';
import hypercarCarImg from '../assets/Hypercar.jpg';
import baguetteImg from '../assets/Baguette.png';
import { ArrowRight, ChevronLeft, Car, Users, RefreshCw, Trash2 } from 'lucide-react';

// Animation inchangée
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
    currentDriver?: string;
}

interface LandingPageProps {
    onSelectTeam: (team: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectTeam }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customId, setCustomId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "teams"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Team[];
        setTeams(teamsData);
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
      if (window.confirm(`Delete team "${teamId}"?`)) {
          try { await deleteDoc(doc(db, "teams", teamId)); } catch (error) { console.error(error); }
      }
  };

  // --- COMPOSANT CARTE (Responsive) ---
  const CategoryCard = ({ id, label, subLabel, colorClass, bgImg, filter = "" }: any) => (
    <button 
        onClick={() => setSelectedCategory(id)} 
        // Utilisation de h-full w-full pour remplir la grille
        className={`relative w-full h-full rounded-2xl overflow-hidden group shadow-xl transition-all duration-300 hover:scale-[1.02] border border-white/5 ring-0 hover:ring-2 hover:ring-offset-2 hover:ring-offset-[#020408] ${colorClass}`}
    >
        <div className="absolute inset-0 pointer-events-none bg-slate-900">
            <img src={bgImg} alt={label} className={`w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-700 group-hover:scale-110 ${filter}`} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/90"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-end h-full text-white p-4 pointer-events-none">
            {/* Icone qui disparait sur les très petits écrans en hauteur */}
            <div className="mb-auto mt-2 p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 group-hover:bg-white/10 transition-colors hidden sm:block">
                <Car size={24} className="opacity-80 group-hover:text-white transition-colors"/>
            </div>

            <div className="flex flex-col items-center transform group-hover:-translate-y-1 transition-transform duration-300">
                {/* Taille de texte responsive */}
                <span className="font-black text-2xl lg:text-3xl tracking-tighter italic drop-shadow-2xl">{label}</span>
                <span className="text-[8px] lg:text-[10px] uppercase font-bold tracking-[0.2em] opacity-70 mt-1 border-t border-white/20 pt-1 w-full text-center">{subLabel}</span>
            </div>

            {teams.filter(t => t.category.includes(id.split(' ')[0])).length > 0 && (
                <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {teams.filter(t => t.category.includes(id.split(' ')[0])).length}
                </div>
            )}
        </div>
    </button>
  );

  // --- ÉCRAN 2 : LISTE DES VOITURES ---
  const renderLineupSelection = () => {
    const lineups = teams.filter(t => {
        const cat = t.category.toLowerCase();
        const sel = selectedCategory!.toLowerCase();
        if (sel === 'lmp2 (elms)') return cat.includes('elms') || (cat.includes('lmp2') && t.name.includes('ELMS'));
        return cat.includes(sel);
    });
    
    let bgImage = lmp2CarImg;
    let accentColor = 'text-blue-500';
    let borderColor = 'border-slate-500/30';
    let shadowColor = 'shadow-blue-900/20';

    if (selectedCategory === 'hypercar') {
        bgImage = hypercarCarImg; accentColor = 'text-red-600'; borderColor = 'border-red-500/50'; shadowColor = 'shadow-red-900/40';
    } else if (selectedCategory === 'lmgt3') {
        bgImage = LMGT3; accentColor = 'text-orange-500'; borderColor = 'border-orange-500/50'; shadowColor = 'shadow-orange-900/40';
    } else if (selectedCategory === 'lmp3') {
        accentColor = 'text-purple-500'; borderColor = 'border-purple-500/50'; shadowColor = 'shadow-purple-900/40';
    } else if (selectedCategory?.includes('elms')) {
        accentColor = 'text-sky-400'; borderColor = 'border-sky-500/50'; shadowColor = 'shadow-sky-900/40';
    }

    return (
      <div className="flex flex-col items-center w-full h-full px-4 pb-4 z-20 animate-fade-in-up overflow-hidden">
        {/* Header Compact */}
        <div className="w-full flex items-center justify-between mb-4 shrink-0">
            <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
                <div className="p-1.5 bg-slate-800 rounded-full"><ChevronLeft size={14}/></div> BACK
            </button>
            <h2 className="text-2xl md:text-4xl font-black text-white italic uppercase tracking-tighter">
                <span className={accentColor}>{selectedCategory}</span> CLASS
            </h2>
            <div className="w-16"></div>
        </div>

        {lineups.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full">
                <RefreshCw size={32} className={`${accentColor} animate-spin`}/>
                <p className="text-slate-500 text-xs font-mono">NO SIGNAL DETECTED</p>
            </div>
        ) : (
            // Grille scrollable si vraiment trop de voitures, mais compacte par défaut
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl flex-1 overflow-y-auto custom-scrollbar p-2">
            {lineups.map((car) => (
                <div key={car.id} onClick={() => onSelectTeam(car.id)} className={`relative h-32 lg:h-40 rounded-xl overflow-hidden group cursor-pointer border ${borderColor} bg-slate-900/90 shadow-lg ${shadowColor} hover:scale-[1.01] transition-all`}>
                    <div className="absolute inset-0 pointer-events-none">
                        <img src={bgImage} className="w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity filter grayscale group-hover:grayscale-0" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/60 to-transparent"></div>
                    </div>
                    <button onClick={(e) => handleDeleteTeam(car.id, e)} className="absolute top-2 right-2 z-30 p-1.5 bg-black/40 text-slate-500 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>

                    <div className="relative z-10 flex flex-col justify-center h-full p-5 pointer-events-none">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-bold px-1.5 py-px rounded border ${borderColor} bg-black/40 uppercase tracking-widest text-slate-300`}>{car.id}</span>
                            {car.currentDriver && <span className="text-[9px] font-bold text-amber-400 bg-amber-950/30 px-1.5 py-px rounded border border-amber-500/20 truncate max-w-[120px]">{car.currentDriver}</span>}
                        </div>
                        <span className="text-xl lg:text-2xl font-black text-white italic uppercase tracking-tighter">{car.name}</span>
                        <div className="mt-2 flex">
                            <div className={`px-3 py-1 rounded text-[9px] font-bold text-white shadow flex items-center gap-1 ${car.color || 'bg-slate-700'}`}>
                                <span>DASHBOARD</span> <ArrowRight size={10}/>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            </div>
        )}
      </div>
    );
  };

  // --- STRUCTURE PRINCIPALE (H-SCREEN FIXE) ---
  return (
      <div className="flex flex-col items-center h-screen w-full bg-[#020408] font-sans relative overflow-hidden selection:bg-indigo-500 selection:text-white">
        <style>{`.font-display { font-family: 'Chakra Petch', sans-serif; }`}</style>

        {/* Fond */}
        <div className="absolute inset-0 z-0 pointer-events-none">
           {generateBaguettes(30)}
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#020408] to-[#020408]"></div>
        </div>

        {/* HEADER TITRE (Fixe en haut) */}
        <div className={`z-20 mt-6 mb-2 text-center transition-all duration-1000 shrink-0 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <h1 className="text-5xl lg:text-6xl font-black text-white italic tracking-tighter drop-shadow-2xl font-display">
                LE MANS <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">24H</span>
            </h1>
            {!selectedCategory && <p className="text-slate-500 text-[10px] font-mono tracking-[0.3em] mt-1 uppercase">Live Strategy Tool</p>}
        </div>
        
        {/* ZONE DE CONTENU (Flexible) */}
        <div className="flex-1 w-full flex flex-col items-center justify-center min-h-0 p-4 relative z-10">
            {selectedCategory ? (
                renderLineupSelection()
            ) : (
                // GRILLE DES CATÉGORIES (S'adapte à la hauteur)
                <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full max-w-7xl h-full max-h-[60vh] transition-all duration-700 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    
                    <CategoryCard id="hypercar" label="HYPER" subLabel="TOP CLASS" bgImg={hypercarCarImg} colorClass="hover:shadow-red-900/30 hover:ring-red-600" />
                    <CategoryCard id="lmp2" label="LMP2" subLabel="WEC" bgImg={lmp2CarImg} colorClass="hover:shadow-blue-900/30 hover:ring-blue-600" />
                    <CategoryCard id="lmp2 (elms)" label="ELMS" subLabel="LMP2" bgImg={ELMS} filter="hue-rotate-15 contrast-125" colorClass="hover:shadow-sky-900/30 hover:ring-sky-500" />
                    <CategoryCard id="lmp3" label="LMP3" subLabel="JUNIOR" bgImg={LMP3} filter="hue-rotate-[240deg] contrast-125" colorClass="hover:shadow-purple-900/30 hover:ring-purple-500" />
                    <CategoryCard id="lmgt3" label="GT3" subLabel="TOURING" bgImg={LMGT3} filter="sepia-[0.5] contrast-110" colorClass="hover:shadow-orange-900/30 hover:ring-orange-500" />
                
                </div>
            )}
        </div>

        {/* FOOTER INPUT (Fixe en bas) */}
        {!selectedCategory && (
          <div className={`z-20 mb-6 shrink-0 transition-opacity duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <form onSubmit={handleCustomJoin} className="flex gap-0 p-1 bg-slate-900/90 rounded-lg border border-white/10 backdrop-blur-md shadow-xl group">
                <input 
                    type="text" 
                    placeholder="Car ID..." 
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    className="bg-transparent text-white text-xs px-3 py-1.5 outline-none w-32 placeholder-slate-600 font-mono text-center uppercase"
                />
                <button type="submit" className="bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white px-2 py-1 rounded transition-colors">
                    <ArrowRight size={14} />
                </button>
            </form>
          </div>
        )}
      </div>
  );
};

export default LandingPage;
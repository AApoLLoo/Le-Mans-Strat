import React from 'react';
import lmp2CarImg from '../assets/lmp2-car.jpg'; 
import hypercarCarImg from '../assets/Hypercar.jpg';
import baguetteImg from '../assets/Baguette.png';

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

interface LandingPageProps {
    onSelectTeam: (team: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectTeam }) => {
  return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[#020408] gap-8 font-sans relative overflow-hidden">
        
        {/* BACKGROUND */}
        <div className="absolute inset-0 z-0">
           {generateBaguettes(40)}
           <div className="absolute inset-0 bg-[#020408] opacity-80"></div>
           <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-red-900/40 opacity-50 animate-pulse"></div>
        </div>

        <span className="text-xs font-bold text-indigo-500 tracking-widest uppercase mb-[-20px] z-20 relative">FBT Technologies only</span>
        <h1 className="text-4xl font-black text-white italic z-20 relative">LE MANS <span className="text-indigo-500">24H</span> STRATEGY</h1>
        
        <div className="flex gap-6 z-20 relative">
          {/* HYPERCAR */}
          <button onClick={() => onSelectTeam('hypercar')} className="w-72 h-48 rounded-3xl relative overflow-hidden group shadow-2xl hover:scale-105 transition-all duration-300 border border-red-500/30">
             <img src={hypercarCarImg} alt="Hypercar" className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
             <div className="absolute inset-0 bg-gradient-to-t from-red-950/95 via-red-900/60 to-black/30 mix-blend-multiply transition-opacity group-hover:opacity-90"></div>
             <div className="relative z-10 flex flex-col items-center justify-center h-full text-white p-4">
                 <span className="font-black text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tight">HYPERCAR</span>
                 <span className="text-sm text-red-100 mt-2 font-bold bg-red-700/80 px-3 py-0.5 rounded-full drop-shadow">WEC TOP CLASS</span>
             </div>
          </button>

          {/* LMP2 */}
          <button onClick={() => onSelectTeam('lmp2')} className="w-72 h-48 rounded-3xl relative overflow-hidden group shadow-2xl hover:scale-105 transition-all duration-300 border border-blue-500/30">
             <img src={lmp2CarImg} alt="LMP2" className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
             <div className="absolute inset-0 bg-gradient-to-t from-blue-950/95 via-blue-900/60 to-black/30 mix-blend-multiply transition-opacity group-hover:opacity-90"></div>
             <div className="relative z-10 flex flex-col items-center justify-center h-full text-white p-4">
                 <span className="font-black text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tight">LMP2</span>
                 <span className="text-sm text-blue-100 mt-2 font-bold bg-blue-600/80 px-3 py-0.5 rounded-full drop-shadow">ORECA 07</span>
             </div>
          </button>
        </div>
        <div className="text-slate-500 text-sm mt-8 font-bold tracking-widest uppercase z-20 relative">Select your team to access the Pit Wall</div>
      </div>
  );
};

export default LandingPage;
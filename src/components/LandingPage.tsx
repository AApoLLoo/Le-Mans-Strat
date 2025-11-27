// src/components/LandingPage.tsx
import React from 'react';
import lmp2CarImg from '../assets/lmp2-car.jpg'; 
import hypercarCarImg from '../assets/Hypercar.jpg';
import baguetteImg from '../assets/Baguette.png';

// Note: tu devras peut-être passer la fonction generateBaguettes en prop ou la mettre dans utils
const LandingPage = ({ onSelectTeam }: { onSelectTeam: (team: string) => void }) => {
  return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[#020408] gap-8 font-sans relative overflow-hidden">
        {/* ... Copie tout le JSX du return initial de RaceStrategyApp ici ... */}
        {/* Remplace setSelectedTeam par onSelectTeam */}
         <div className="flex gap-6 z-20 relative">
          <button onClick={() => onSelectTeam('hypercar')} className="...">
             {/* ... */}
          </button>
          <button onClick={() => onSelectTeam('lmp2')} className="...">
             {/* ... */}
          </button>
        </div>
      </div>
  );
};

export default LandingPage;
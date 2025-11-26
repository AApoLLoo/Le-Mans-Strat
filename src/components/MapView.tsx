import React from 'react';
// Assure-toi que le chemin vers l'image est correct depuis ce dossier
import trackMapImg from '../assets/track-map.jpg'; 

const MapView = () => {
  return (
    <div className="flex-1 bg-[#e5e5e5] flex items-center justify-center p-8 overflow-hidden relative">
      <img 
        src={trackMapImg} 
        alt="Track Map" 
        className="max-w-full max-h-full object-contain map-invert drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
      />
      <div className="absolute bottom-4 right-4 text-black font-bold text-xs opacity-50">LE MANS 13.626 KM</div>
    </div>
  );
};

export default MapView;
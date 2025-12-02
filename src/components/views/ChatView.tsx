// src/components/views/ChatView.tsx
import React, { useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

const ChatView = ({ messages, username, setUsername, chatInput, setChatInput, onSendMessage }) => {
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(messages || []).map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.user === username ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                      {/* MODIFICATION : Ajout de la catégorie dans la bulle */}
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 ${msg.teamColor === 'bg-red-600' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                          {msg.team}
                          {msg.category && <span className="font-mono font-normal opacity-80 text-[8px]">[{msg.category}]</span>}
                      </span>
                      
                      <span className="text-[10px] font-bold text-indigo-300">{msg.user}</span>
                      <span className="text-[9px] text-slate-500">{msg.time}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-xl text-sm max-w-[80%] ${msg.user === username ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                      {msg.text}
                  </div>
              </div>
          ))}
          <div ref={chatEndRef} />
      </div>
      {/* ... (Footer input inchangé) */}
      <div className="p-3 bg-black/40 border-t border-slate-800 flex gap-2">
          <input 
            type="text" 
            placeholder="Pseudo" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-2 text-xs text-white outline-none focus:border-indigo-500"
          />
          <input 
            type="text" 
            placeholder="Message..." 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && onSendMessage()} 
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
          <button onClick={onSendMessage} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded transition-colors">
            <Send size={18}/>
          </button>
      </div>
    </div>
  );
};

export default ChatView;
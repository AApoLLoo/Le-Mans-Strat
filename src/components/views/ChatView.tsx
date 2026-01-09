import React, { useEffect, useRef } from 'react';
import { Send, AlertTriangle, Fuel, UserCheck } from 'lucide-react';

const ChatView = ({ messages, username, chatInput, setChatInput, onSendMessage }) => {
    const chatEndRef = useRef(null);

    // Auto-scroll à chaque nouveau message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Messages rapides pour gagner du temps en course
    const quickActions = [
        { label: "BOX BOX", text: "🚨 BOX CETTE FIN DE TOUR !", color: "bg-red-600" },
        { label: "FUEL OK", text: "⛽ Carburant suffisant, continue.", color: "bg-green-600" },
        { label: "SWAP", text: "🔄 Changement de pilote prêt.", color: "bg-blue-600" },
    ];

    const handleQuickMessage = (text) => {
        onSendMessage(text); // Il faudra adapter ton App.tsx pour accepter un texte en paramètre
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
            {/* Header : Infos Session */}
            <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live Team Chat
                </h3>
            </div>

            {/* Zone des messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.user === username ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-indigo-400">{msg.user}</span>
                            <span className="text-[9px] text-slate-500">{new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-2xl text-sm shadow-sm max-w-[85%] 
              ${msg.user === username
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Quick Actions Bar */}
            <div className="px-3 py-2 bg-black/20 flex gap-2 overflow-x-auto no-scrollbar">
                {quickActions.map((btn, i) => (
                    <button
                        key={i}
                        onClick={() => handleQuickMessage(btn.text)}
                        className={`${btn.color} text-[10px] font-bold text-white px-3 py-1.5 rounded-full hover:opacity-80 transition-all whitespace-nowrap`}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>

            {/* Input de saisie */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
                <div className="relative flex items-center gap-2 bg-slate-800 rounded-xl p-1 border border-slate-700 focus-within:border-indigo-500 transition-all">
                    <input
                        type="text"
                        placeholder="Écrire un message..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
                        className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none"
                    />
                    <button
                        onClick={onSendMessage}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-all shadow-lg active:scale-95"
                    >
                        <Send size={18}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatView;
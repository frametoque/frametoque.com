"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, Maximize2, Minimize2, Bot, User, MessageSquare, Zap, Cpu, Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", text: "Neural pathways active. I'm Toque AI. How can I facilitate your digital evolution today?", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const whatsappConfig = {
    phoneNumber: "+94701901461",
    defaultMessage: "Hello! I'd like to speak with a human agent regarding my project inquiry.",
    responseTime: "15 minutes",
    businessHours: "8 AM - 10 PM"
  };

  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(whatsappConfig.defaultMessage);
    window.open(`https://wa.me/${whatsappConfig.phoneNumber}?text=${encodedMessage}`, '_blank');
    setShowWhatsAppModal(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    setLoading(true);

    setMessages(prev => [
      ...prev,
      { role: "user", text: userText, timestamp: new Date() },
    ]);

    try {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate thinking
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();

      setMessages(prev => [
        ...prev,
        { role: "ai", text: data.reply, timestamp: new Date() },
      ]);
      setLoading(false);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "ai", text: "Connection interrupted. Still here to help!", timestamp: new Date() },
      ]);
      setLoading(false);
    }
  };

  const WhatsAppIcon = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.9 6.994c-.004 5.45-4.438 9.88-9.885 9.88m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.333.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411" />
    </svg>
  );

  return (
    <>
      <style jsx global>{`
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(0.9); opacity: 0.5; }
        }
        @keyframes float {
          0% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0); }
        }
        .toque-orb-ring {
          animation: orbit 4s linear infinite;
        }
        .toque-orb-pulse {
          animation: pulse-ring 3s ease-in-out infinite;
        }
        .toque-orb-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>

      {/* Trigger Button (Orb) */}
      <div className="z-[100]">
        <button
          onClick={() => setOpen(!open)}
          className="relative w-12 h-12 group outline-none"
          title="Toque AI Neural Interface"
        >
          {/* Pulsing Back Glow removed as requested */}

          {/* Rotating Outer Ring removed as requested */}

          {/* Main Orb */}
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-brand-400 to-brand-700 shadow-[0_0_20px_rgba(22,159,228,0.4)] border border-white/20 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-110 active:scale-95">
             <Bot className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
             
             {/* Inner Scanline Effect */}
             <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />
          </div>
        </button>
      </div>

      {/* Neural Interface Chat Box */}
      {open && (
        <div
          className="fixed z-[90] transition-all duration-500 ease-out bottom-24 right-6"
          style={{
            width: "min(22rem, calc(100vw - 4rem))",
            height: "min(32rem, calc(100vh - 8rem))",
          }}
        >
          <div className="relative h-full w-full overflow-hidden border border-white/10 bg-black/40 backdrop-blur-[60px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col animate-in zoom-in-95 duration-500 rounded-[2.5rem]">
            
            {/* Cyber Grid Texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                 style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />

            {/* Neural Header */}
            <div className="relative p-6 px-8 flex items-center justify-between border-b border-white/5 bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative group">
                   <div className="absolute -inset-1 bg-brand-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                   <Cpu className="w-6 h-6 text-brand-400 relative z-10" />
                   <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    Toque AI <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-brand-400 font-bold">Neural Engine v3.0</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Neural Streams (Messages) */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide overscroll-contain z-10"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`shrink-0 transition-transform duration-300 hover:scale-110 flex items-center justify-center`}>
                    {m.role === "user" ? <User className="w-5 h-5 text-white/70" /> : <Bot className="w-5 h-5 text-brand-400" />}
                  </div>
                  <div className={`relative max-w-[85%] rounded-2xl p-4 transition-all duration-300 ${
                    m.role === "user"
                      ? "bg-white/10 border border-white/20 text-white shadow-inner ml-auto"
                      : "bg-white/[0.03] border border-white/10 text-gray-200"
                  }`}>
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                       <div className="flex gap-1">
                          {[1,2,3].map(dot => <div key={dot} className="w-1 h-1 bg-white/[0.05] rounded-full" />)}
                       </div>
                       <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                         {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-4 animate-pulse">
                  <div className="shrink-0 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-brand-400/50" />
                  </div>
                  <div className="bg-[#0d0d0d]/80 border border-white/5 rounded-2xl p-4 w-32 flex items-center gap-1.5 h-12">
                     <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                     <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                     <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Neural Input Interface */}
            <div className="relative p-6 pt-2 shrink-0 z-10">
              <div className="relative group">
                <div className="relative bg-white/5 border border-white/10 rounded-full overflow-hidden backdrop-blur-xl flex items-center p-1.5 pl-5 gap-3 transition-all duration-300 group-within:bg-white/[0.08] group-within:border-white/20">
                  <button
                    onClick={() => setShowWhatsAppModal(true)}
                    className="p-1.5 text-gray-400 hover:text-green-400 transition-all shrink-0"
                    title="Direct Human Link"
                  >
                    <WhatsAppIcon className="w-5 h-5" />
                  </button>
                  
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Ask Toque AI anything..."
                    className="flex-1 bg-transparent py-3 text-white placeholder-gray-500 focus:outline-none text-[15px] font-normal"
                    disabled={loading}
                  />

                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-20 disabled:grayscale relative overflow-hidden"
                  >
                    {/* Background layers */}
                    <div className="absolute inset-0 bg-white/10" />
                    <div className="absolute inset-0 border border-white/20 rounded-full" />
                    
                    {/* Icon */}
                    <Send className="w-4.5 h-4.5 text-white relative z-10" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between px-2">
                 <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-brand-400" />
                    <span className="text-[10px] text-white/60 font-black uppercase tracking-widest leading-none">Hyper-Fast Processing</span>
                 </div>
                 <div className="flex gap-4">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest font-mono leading-none">ID: TQ-911-RS</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Neural Link Modal (WhatsApp) */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
          <div className="relative max-w-md w-full bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(22,159,228,0.15)] animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-10 text-center">
              <div className="mx-auto mb-8 flex items-center justify-center">
                <WhatsAppIcon className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Establish Neural Link?</h3>
              <p className="text-gray-400 leading-relaxed mb-10 text-lg">
                Connect directly with a human strategist on WhatsApp. Verified response within {whatsappConfig.responseTime}.
              </p>
              
              <div className="grid gap-4">
                <button
                  onClick={handleWhatsAppClick}
                  className="w-full py-5 rounded-2xl bg-green-500 text-black font-black text-lg hover:bg-green-400 transition-all shadow-xl shadow-green-500/20 flex items-center justify-center gap-3"
                >
                  <WhatsAppIcon className="w-6 h-6" />
                  INITIATE WHATSAPP
                </button>
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="w-full py-5 rounded-2xl bg-white/5 text-gray-500 font-bold hover:text-white transition-all border border-white/5 hover:border-white/10"
                >
                  STAY IN NEURAL MODE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
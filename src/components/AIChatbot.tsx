"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, Maximize2, Minimize2, Bot, User, MessageSquare } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hello! I'm your Frame Toque AI assistant. How can I help with your project?", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [aiStatus, setAiStatus] = useState({
    mode: 'intelligent',
    model: 'Toque AI'
  });

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const whatsappConfig = {
    phoneNumber: "+94701901461",
    defaultMessage: "Hello! I'd like to speak with a human agent about: ",
    businessHours: "8 AM - 10 PM",
    responseTime: "Typically within 15 minutes"
  };

  const handleWhatsAppClick = () => {
    const conversationSummary = messages
      .slice(-3)
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`)
      .join('\n');

    const fullMessage = `${whatsappConfig.defaultMessage}\n\nRecent conversation:\n${conversationSummary}`;
    const encodedMessage = encodeURIComponent(fullMessage);
    const whatsappUrl = `https://wa.me/${whatsappConfig.phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    setMessages(prev => [
      ...prev,
      {
        role: "ai",
        text: `I've connected you with a human agent via WhatsApp! A representative should respond within ${whatsappConfig.responseTime}. Business hours: ${whatsappConfig.businessHours}.`,
        timestamp: new Date()
      },
    ]);

    setShowWhatsAppModal(false);
  };

  const suggestWhatsApp = () => {
    setShowWhatsAppModal(true);
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

    const wantsHuman = /(human|agent|representative|person|talk to someone|speak with|real person)/i.test(userText);

    if (wantsHuman) {
      setLoading(false);
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: `I understand you'd like to speak with a human agent! Click the green WhatsApp button to connect with our team. Our business hours are ${whatsappConfig.businessHours} and we typically respond within ${whatsappConfig.responseTime}.`,
          timestamp: new Date()
        },
      ]);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          timestamp: new Date().toISOString()
        }),
      });
      const data = await res.json();

      if (data.mode === 'openrouter') {
        const modelName = data.model ? data.model.split('/').pop().split(':')[0] : 'OpenRouter';
        setAiStatus({ mode: 'cloud', model: modelName });
      } else if (data.mode === 'intelligent-fallback') {
        setAiStatus({ mode: 'intelligent', model: 'Enhanced AI' });
      } else {
        setAiStatus({ mode: 'local', model: 'Frame Toque AI' });
      }

      setMessages(prev => [
        ...prev,
        { role: "ai", text: data.reply, timestamp: new Date() },
      ]);
      setLoading(false);
    } catch (err) {
      console.error("Chat error:", err);

      const fallbackResponses = [
        "I'm optimizing my responses. Let me provide some guidance based on your query...",
        "While I connect to enhanced services, here's my take on that...",
        "Let me think about this. Based on design principles, I'd suggest...",
        "I'm processing your request. Here's what I recommend for now..."
      ];

      const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

      setAiStatus({ mode: 'offline', model: 'Local Mode' });
      setMessages(prev => [
        ...prev,
        { role: "ai", text: randomResponse, timestamp: new Date() },
      ]);
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleWheel = (e) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isAtTop = container.scrollTop === 0;
    const isAtBottom = container.scrollHeight - container.scrollTop === container.clientHeight;

    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) return;

    e.stopPropagation();
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const startY = touch.clientY;
    const container = messagesContainerRef.current;

    if (!container) return;

    const isAtTop = container.scrollTop === 0;
    const isAtBottom = container.scrollHeight - container.scrollTop === container.clientHeight;

    container.dataset.touchStartY = startY;
    container.dataset.isAtTop = isAtTop;
    container.dataset.isAtBottom = isAtBottom;
  };

  const handleTouchMove = (e) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const touch = e.touches[0];
    const startY = parseFloat(container.dataset.touchStartY);
    const deltaY = startY - touch.clientY;
    const isAtTop = container.dataset.isAtTop === 'true';
    const isAtBottom = container.dataset.isAtBottom === 'true';

    if ((isAtTop && deltaY < 0) || (isAtBottom && deltaY > 0)) return;

    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
  };

  const clearChat = () => {
    setMessages([
      { role: "ai", text: "Chat cleared! I'm ready to help with your next question.", timestamp: new Date() },
    ]);
  };

  const WhatsAppIcon = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.9 6.994c-.004 5.45-4.438 9.88-9.885 9.88m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.333.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411" />
    </svg>
  );

  return (
    <>
      {/* Toggle Button */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="
            rounded-lg backdrop-blur-xl transition-all duration-300 px-5 py-5
            hover:scale-105 active:scale-95 group shadow-2xl
            focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2 focus:ring-offset-transparent
            bg-[rgba(12,25,55,0.8)] border border-brand-500/20
            [box-shadow:0_8px_32px_rgba(2,12,45,0.4),0_0_0_1px_rgba(255,255,255,0.08),0_0_25px_rgba(59,130,246,0.15)]
            min-w-16 min-h-16
          "
          aria-label="Open Toque AI Chatbot"
          title="Open Toque AI (Ctrl+K)"
        >
          <MessageSquare className="w-6 h-6 text-brand-500" />
          <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-transparent via-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </button>
      </div>

      {/* Chat Box */}
      {open && (
        <div
          className={`fixed z-50 transition-all duration-300 ${isMaximized ? 'inset-0' : 'bottom-24 right-6'}`}
          style={{
            width: isMaximized ? '100vw' : '28rem',
            height: isMaximized ? '100vh' : '36rem',
            maxWidth: isMaximized ? '100%' : 'calc(100vw - 3rem)',
            maxHeight: isMaximized ? '100%' : 'calc(100vh - 6rem)',
          }}
        >
          <div
            className="relative h-full w-full rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(12,25,55,0.85) 0%, rgba(8,18,40,0.9) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(5,223,114,0.15)',
              boxShadow: '0 25px 50px -12px rgba(2,12,45,0.5), 0 0 0 1px rgba(59,130,246,0.1), 0 0 50px rgba(59,130,246,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Glass textures */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 30%, rgba(59,130,246,0.1) 0%, transparent 50%),
                                  radial-gradient(circle at 80% 70%, rgba(30,100,200,0.1) 0%, transparent 50%)`,
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)`,
                backgroundSize: '30px 30px',
              }}
            />

            {/* Header */}
            <div
              className="relative p-4 border-b border-brand-500/10"
              style={{ background: 'linear-gradient(to right, rgba(8,18,40,0.7), transparent)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl backdrop-blur-sm group relative overflow-hidden bg-[rgba(12,25,55,0.5)] border border-brand-500/20">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <Bot className="w-5 h-5 text-brand-500 relative" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Toque AI</h3>
                    <p className="text-xs text-white/50">Simple.Better.Fast.</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={clearChat}
                    className="p-2 rounded-lg transition-colors hover:text-brand-500 text-xs text-white/50 bg-[rgba(12,25,55,0.3)] border border-white/5"
                    title="Clear chat"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="p-2 rounded-lg transition-colors hover:text-brand-500 text-white/50 bg-[rgba(12,25,55,0.3)] border border-white/5"
                  >
                    {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-lg transition-colors hover:text-brand-500 text-white/50 bg-[rgba(12,25,55,0.3)] border border-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              className="h-[calc(100%-8rem)] overflow-y-auto p-4 space-y-4 scrollbar-hide overscroll-contain [-webkit-overflow-scrolling:touch]"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border backdrop-blur-sm ${
                      m.role === "user"
                        ? "border-brand-500/30 bg-brand-500/10"
                        : "border-white/10 bg-[rgba(12,25,55,0.5)]"
                    }`}
                  >
                    {m.role === "user"
                      ? <User className="w-4 h-4 text-brand-500" />
                      : <Bot className="w-4 h-4 text-brand-500" />
                    }
                  </div>
                  <div
                    className={`max-w-[70%] rounded-xl p-3 backdrop-blur-sm border ${
                      m.role === "user"
                        ? "border-brand-500/20 text-white"
                        : "border-white/10 text-gray-200"
                    }`}
                    style={{
                      background: m.role === "user"
                        ? 'linear-gradient(135deg, rgba(12,25,55,0.6) 0%, rgba(8,18,40,0.7) 100%)'
                        : 'linear-gradient(135deg, rgba(12,25,55,0.7) 0%, rgba(8,18,40,0.8) 100%)',
                    }}
                  >
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                      <ReactMarkdown
                        components={{
                          a: ({ children, href }) => (
                            <Link
                              href={href}
                              className="text-brand-500 hover:text-brand-500/80 underline transition-colors"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </Link>
                          )
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    </div>
                    <div className="mt-2">
                      <p className={`text-xs ${m.role === "user" ? "text-brand-500/60" : "text-white/40"}`}>
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm bg-[rgba(12,25,55,0.5)] border border-white/10">
                    <div className="flex gap-0.5">
                      <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce delay-150" />
                      <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce delay-300" />
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-3 backdrop-blur-sm border border-white/10"
                    style={{ background: 'linear-gradient(135deg, rgba(12,25,55,0.7) 0%, rgba(8,18,40,0.8) 100%)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              className="absolute bottom-0 left-0 right-0 p-4 border-t border-brand-500/10"
              style={{ background: 'linear-gradient(to top, rgba(8,18,40,0.8) 0%, transparent 100%)' }}
            >
              <div className="flex gap-2">
                {/* WhatsApp Button */}
                <button
                  onClick={suggestWhatsApp}
                  className="p-3 rounded-lg transition-all duration-200 flex items-center justify-center backdrop-blur-sm group relative overflow-hidden hover:scale-105 bg-[rgba(37,211,102,0.1)] border border-[rgba(37,211,102,0.2)] text-[#25D366]"
                  title="Chat with human agent via WhatsApp"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#25D366]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <WhatsAppIcon />
                </button>

                <div className="flex-1 relative">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="w-full rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none backdrop-blur-sm transition-all duration-200 bg-[rgba(12,25,55,0.5)] border border-[rgba(5,223,114,0.15)]"
                    placeholder="Let's talk about your next project"
                    disabled={loading}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500/30">↵</div>
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="px-4 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:text-brand-500 transition-all duration-200 flex items-center justify-center backdrop-blur-sm group relative overflow-hidden bg-[rgba(12,25,55,0.5)] border border-brand-500/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Send className="w-4 h-4 relative" />
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-white/50">
                    Powered by Toque AI •{' '}
                    <button
                      onClick={suggestWhatsApp}
                      className="hover:text-[#25D366] transition-colors underline"
                    >
                      Need human help?
                    </button>
                  </p>
                </div>
                <p className="text-xs text-white/40">
                  {messages.length} messages • Ctrl+K
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="relative rounded-2xl overflow-hidden max-w-md w-full border border-[rgba(37,211,102,0.2)]"
            style={{
              background: 'linear-gradient(135deg, rgba(12,25,55,0.95) 0%, rgba(8,18,40,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-[rgba(37,211,102,0.1)] border border-[rgba(37,211,102,0.2)]">
                  <WhatsAppIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">Connect with Human Agent</h3>
                  <p className="text-sm text-white/60">Get personalized assistance on WhatsApp</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Response Time</span>
                    <span className="text-sm font-medium text-white">{whatsappConfig.responseTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Business Hours</span>
                    <span className="text-sm font-medium text-white">{whatsappConfig.businessHours}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Contact</span>
                    <span className="text-sm font-medium text-white">{whatsappConfig.phoneNumber}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[rgba(37,211,102,0.05)] border border-[rgba(37,211,102,0.1)]">
                  <p className="text-sm text-center text-white/70">
                    Your recent conversation will be shared with the agent for context
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="flex-1 py-3 rounded-lg transition-colors text-white hover:text-brand-500 bg-[rgba(12,25,55,0.5)] border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWhatsAppClick}
                  className="flex-1 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium group relative overflow-hidden bg-[rgba(37,211,102,0.1)] border border-[rgba(37,211,102,0.2)] text-[#25D366]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#25D366]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <WhatsAppIcon className="w-5 h-5" />
                  <span>Open WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
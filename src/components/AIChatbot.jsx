"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, Maximize2, Minimize2, Bot, User, MessageSquare } from "lucide-react";
import ReactMarkdown from 'react-markdown';  
import Link from 'next/link';

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
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
  const [showBubble, setShowBubble] = useState(true); 
  
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

  useEffect(() => {
    // Hide bubble after 5 seconds
    if (showBubble) {
      const timer = setTimeout(() => setShowBubble(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showBubble]);

  
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    setLoading(true);

    // Add user message
    setMessages(prev => [
      ...prev,
      { 
        role: "user", 
        text: userText, 
        timestamp: new Date()
      },
    ]);

    try {
      // Add artificial delay for better UX
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
      // Update AI status based on response
      if (data.mode === 'openrouter') {
        const modelName = data.model ? data.model.split('/').pop().split(':')[0] : 'OpenRouter';
        setAiStatus({
          mode: 'cloud',
          model: modelName
        });
      } else if (data.mode === 'intelligent-fallback') {
        setAiStatus({
          mode: 'intelligent',
          model: 'Enhanced AI'
        });
      } else {
        setAiStatus({
          mode: 'local',
          model: 'Frame Toque AI'
        });
      }
      // Remove or adjust the transformation if switching to Markdown
      // const transformed = data.reply.replace(
      //   /<Link\s+href=["']([^"']+)["']>([^<]+)<\/Link>/gi,
      //   '<a href="$1" class="text-blue-600 hover:text-blue-800 underline transition-colors" target="_blank" rel="noopener noreferrer">$2</a>'
      // );
      // Instead, assume data.reply is in Markdown format (e.g., "[text](url)")
      setMessages(prev => [
        ...prev,
        { 
          role: "ai", 
          text: data.reply,  // Use raw reply if it's Markdown
          timestamp: new Date()
        },
      ]);
      
      setLoading(false);
    } catch (err) {
      console.error("Chat error:", err);
      
      // Enhanced error handling with fallback responses
      const fallbackResponses = [
        "I'm optimizing my responses. Let me provide some guidance based on your query...",
        "While I connect to enhanced services, here's my take on that...",
        "Let me think about this. Based on design principles, I'd suggest...",
        "I'm processing your request. Here's what I recommend for now..."
      ];
      
      const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      
      setAiStatus({
        mode: 'offline',
        model: 'Local Mode'
      });
      setMessages(prev => [
        ...prev,
        { 
          role: "ai", 
          text: randomResponse, 
          timestamp: new Date()
        },
      ]);
      setLoading(false);
    }
  };

  // Handle keyboard shortcuts
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

  // Handle wheel event on messages container
  const handleWheel = (e) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isAtTop = container.scrollTop === 0;
    const isAtBottom = container.scrollHeight - container.scrollTop === container.clientHeight;
    
    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
      return;
    }
    
    e.stopPropagation();
  };

  // Handle touch events for mobile
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
    
    if ((isAtTop && deltaY < 0) || (isAtBottom && deltaY > 0)) {
      return;
    }
    
    if (e.cancelable) {
      e.preventDefault();
    }
    e.stopPropagation();
  };

  // Clear chat history
  const clearChat = () => {
    setMessages([
      { role: "ai", text: "Chat cleared! I'm ready to help with your next question.", timestamp: new Date() },
    ]);
  };

  return (
    <>
      {/* Floating Button - Icon Only */}
      <div className="relative">
        {showBubble && (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-[#05df72] text-black text-sm rounded-lg shadow-lg whitespace-nowrap animate-fade-in">
            Chat with Toque AI
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#05df72]"></div>
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="fixed bottom-6 right-6 z-50 rounded-lg backdrop-blur-xl transition-all duration-300 px-5 py-5 hover:scale-105 active:scale-95 group shadow-2xl focus:outline-none focus:ring-2 focus:ring-[#05df72]/50 focus:ring-offset-2 focus:ring-offset-transparent"
          style={{
            background: 'rgba(12, 25, 55, 0.8)',
            border: '1px solid rgba(5, 223, 114, 0.2)',
            boxShadow: `
              0 8px 32px rgba(2, 12, 45, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.08),
              0 0 25px rgba(5, 223, 114, 0.15)
            `,
            minWidth: '64px', // Increased for mid-size
            minHeight: '64px'
          }}
          aria-label="Open Toque AI Chatbot"
          title="Open Toque AI (Ctrl+K)"
        >
          <MessageSquare className="w-6 h-6 text-[#05df72]" />
          <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-transparent via-[#05df72]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </button>
      </div>

      {/* Chat Box */}
      {open && (
        <div className={`fixed z-50 ${isMaximized ? 'inset-0' : 'bottom-24 right-6'} transition-all duration-300`}
          style={{
            width: isMaximized ? '100vw' : '28rem',
            height: isMaximized ? '100vh' : '36rem',
            maxWidth: isMaximized ? '100%' : 'calc(100vw - 3rem)',
            maxHeight: isMaximized ? '100%' : 'calc(100vh - 6rem)'
          }}
        >
          <div className="relative h-full w-full rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(12, 25, 55, 0.85) 0%, rgba(8, 18, 40, 0.9) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(5, 223, 114, 0.15)',
              boxShadow: `
                0 25px 50px -12px rgba(2, 12, 45, 0.5),
                0 0 0 1px rgba(5, 223, 114, 0.1),
                0 0 50px rgba(5, 223, 114, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.05)
              `,
            }}
          >
            {/* Glass textures */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `radial-gradient(circle at 20% 30%, rgba(5, 223, 114, 0.1) 0%, transparent 50%),
                                radial-gradient(circle at 80% 70%, rgba(30, 100, 200, 0.1) 0%, transparent 50%)`
            }} />
            
            <div className="absolute inset-0 opacity-3" style={{
              backgroundImage: `linear-gradient(rgba(5, 223, 114, 0.1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(5, 223, 114, 0.1) 1px, transparent 1px)`,
              backgroundSize: '30px 30px'
            }} />
            
            {/* Clean Header */}
            <div className="relative p-4 border-b" style={{ 
              borderColor: 'rgba(5, 223, 114, 0.1)',
              background: 'linear-gradient(to right, rgba(8, 18, 40, 0.7), transparent)'
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl backdrop-blur-sm group relative overflow-hidden"
                    style={{
                      background: 'rgba(12, 25, 55, 0.5)',
                      border: '1px solid rgba(5, 223, 114, 0.2)'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#05df72]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <Bot className="w-5 h-5 text-[#05df72] relative" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Toque AI</h3>
                    <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Simple.Unique.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={clearChat}
                    className="p-2 rounded-lg transition-colors hover:text-[#05df72] text-xs"
                    style={{ 
                      color: 'rgba(255, 255, 255, 0.5)',
                      background: 'rgba(12, 25, 55, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                    title="Clear chat"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="p-2 rounded-lg transition-colors hover:text-[#05df72]"
                    style={{ 
                      color: 'rgba(255, 255, 255, 0.5)',
                      background: 'rgba(12, 25, 55, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-lg transition-colors hover:text-[#05df72]"
                    style={{ 
                      color: 'rgba(255, 255, 255, 0.5)',
                      background: 'rgba(12, 25, 55, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div 
              ref={messagesContainerRef}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              className="h-[calc(100%-8rem)] overflow-y-auto p-4 space-y-4 scrollbar-hide"
              style={{ 
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border backdrop-blur-sm ${
                    m.role === "user" 
                      ? "border-[#05df72]/30"
                      : "border-white/10"
                  }`}
                    style={{
                      background: m.role === "user" 
                        ? 'rgba(5, 223, 114, 0.1)'
                        : 'rgba(12, 25, 55, 0.5)'
                    }}
                  >
                    {m.role === "user" ? (
                      <User className="w-4 h-4 text-[#05df72]" />
                    ) : (
                      <Bot className="w-4 h-4 text-[#05df72]" />
                    )}
                  </div>
                  <div className={`max-w-[70%] rounded-xl p-3 backdrop-blur-sm border ${
                    m.role === "user"
                      ? "border-[#05df72]/20 text-white"
                      : "border-white/10 text-gray-200"
                  }`}
                    style={{
                      background: m.role === "user"
                        ? 'linear-gradient(135deg, rgba(12, 25, 55, 0.6) 0%, rgba(8, 18, 40, 0.7) 100%)'
                        : 'linear-gradient(135deg, rgba(12, 25, 55, 0.7) 0%, rgba(8, 18, 40, 0.8) 100%)'
                    }}
                  >
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                      {/* Customize ReactMarkdown to style links as green */}
                      <ReactMarkdown
                        components={{
                          a: ({ children, href }) => (
                            <Link 
                              href={href} 
                              className="text-[#05df72] hover:text-[#05df72]/80 underline transition-colors" 
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
                      <p className={`text-xs ${
                        m.role === "user" 
                          ? "text-[#05df72]/60" 
                          : "text-white/40"
                      }`}>
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
                    style={{
                      background: 'rgba(12, 25, 55, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="flex gap-0.5">
                      <div className="w-1.5 h-1.5 bg-[#05df72] rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-[#05df72] rounded-full animate-bounce delay-150" />
                      <div className="w-1.5 h-1.5 bg-[#05df72] rounded-full animate-bounce delay-300" />
                    </div>
                  </div>
                  <div className="rounded-xl p-3 backdrop-blur-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(12, 25, 55, 0.7) 0%, rgba(8, 18, 40, 0.8) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area with Model Info at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t"
              style={{
                borderColor: 'rgba(5, 223, 114, 0.1)',
                background: 'linear-gradient(to top, rgba(8, 18, 40, 0.8) 0%, transparent 100%)'
              }}
            >
              <div className="flex gap-2">
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
                    className="w-full rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none backdrop-blur-sm transition-all duration-200"
                    style={{
                      background: 'rgba(12, 25, 55, 0.5)',
                      border: '1px solid rgba(5, 223, 114, 0.15)'
                    }}
                    placeholder={`Let's talk about your next project`}
                    disabled={loading}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(5, 223, 114, 0.3)' }}
                  >
                    ↵
                  </div>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="px-4 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:text-[#05df72] transition-all duration-200 flex items-center justify-center backdrop-blur-sm group relative overflow-hidden"
                  style={{
                    background: 'rgba(12, 25, 55, 0.5)',
                    border: '1px solid rgba(5, 223, 114, 0.2)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#05df72]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <Send className="w-4 h-4 relative" />
                </button>
              </div>
              
              {/* Model Information ONLY here at the bottom */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  
                      <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Powered by Toque AI. Responses may vary.
                        {/* {aiStatus.model} */}
                      </p>
                   
                </div>
                <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                  {messages.length} messages • Ctrl+K
                </p>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </>
  );
}

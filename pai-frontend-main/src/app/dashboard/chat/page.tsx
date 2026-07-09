'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Send, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './chat.css';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
}




export default function ChatConsultantPage() {
  const { profile, logout, apiFetch } = useApp();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const userName = profile.name ? profile.name.split(' ')[0] : 'Student';

  // Load chat sessions from backend on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res = await apiFetch('/api/chat/sessions');
        if (res.ok) {
          const data = await res.json();
          const mapped: ChatSession[] = data.map((s: any) => ({
            id: s.id,
            title: s.title,
            messages: [] // Messages are loaded on session select
          }));
          setSessions(mapped);
        }
      } catch (e) {
        console.error('Failed to load chat sessions', e);
      }
    };
    loadSessions();
  }, []);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSessionId || activeSessionId.startsWith('temp-')) return;
    const loadMessages = async () => {
      try {
        const res = await apiFetch(`/api/chat/sessions/${activeSessionId}/messages`);
        if (res.ok) {
          const data = await res.json();
          const mapped: ChatMessage[] = data.map((m: any) => ({
            id: m.id,
            sender: m.sender === 'user' ? 'user' : 'ai',
            text: m.text,
            timestamp: m.timestamp
          }));
          setSessions(prev => prev.map(s =>
            s.id === activeSessionId ? { ...s, messages: mapped } : s
          ));
        }
      } catch(e) {
        console.error('Failed to load messages', e);
      }
    };
    loadMessages();
  }, [activeSessionId]);

  // Get active session messages
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Optimistically add user message to UI
    if (activeSessionId) {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...s.messages, userMsg] };
        }
        return s;
      }));
    } else {
      // Temporary local-only session until backend creates one
      const tempId = `temp-${Date.now()}`;
      const title = textToSend.length > 22 ? `${textToSend.slice(0, 20)}...` : textToSend;
      setSessions(prev => [...prev, { id: tempId, title, messages: [userMsg] }]);
      setActiveSessionId(tempId);
    }

    setInput('');
    setIsTyping(true);

    try {
      const res = await apiFetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          session_id: activeSessionId && !activeSessionId.startsWith('temp-') ? activeSessionId : null
        })
      });

      if (res.ok) {
        const data = await res.json();

        const aiMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'ai',
          text: data.reply || data.text || 'I received your message.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // If this was a new session, update the session id to the real one from backend
        const realSessionId = data.session_id;
        
        setSessions(prev => {
          return prev.map(s => {
            if (s.id === activeSessionId || (s.id.startsWith('temp-') && !activeSessionId)) {
              return {
                ...s,
                id: realSessionId || s.id,
                title: data.session_title || s.title,
                messages: [...s.messages, aiMsg]
              };
            }
            return s;
          });
        });

        if (realSessionId) {
          setActiveSessionId(realSessionId);
        }
      } else if (res.status === 401 || res.status === 403) {
        logout();
        window.location.href = '/#login';
      } else {
        let errorDetail = 'Sorry, I encountered an error processing your request. Please try again.';
        try {
          const err = await res.json();
          if (err.detail) {
            errorDetail = typeof err.detail === 'string'
              ? err.detail
              : 'Sorry, I encountered an error processing your request. Please try again.';
          }
        } catch {
          // ignore parse errors
        }
        const aiMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'ai',
          text: errorDetail,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId || s.id.startsWith('temp-')) {
            return { ...s, messages: [...s.messages, aiMsg] };
          }
          return s;
        }));
      }
    } catch (e) {
      console.error('Chat send failed', e);
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: 'Connection error. Please check that the server is running and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId || s.id.startsWith('temp-')) {
          return { ...s, messages: [...s.messages, aiMsg] };
        }
        return s;
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
  };

  const preSets = [
    "Review my SOP strategy",
    "Analyze my profile gaps",
    "Help me plan my GRE prep",
    "What universities should I target?",
    "Build my study abroad roadmap"
  ];

  // Animated Mascot Avatar SVG
  const renderMascotAvatar = () => (
    <div className="chat-avatar-mascot">
      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g>
          {/* Head Base */}
          <rect x="20" y="20" width="60" height="60" rx="30" fill="white" stroke="#002d9c" strokeWidth="4" />
          <rect x="27" y="28" width="46" height="34" rx="17" fill="#0f172a" />
          
          {/* Animated Blinking Eyes */}
          <ellipse cx="41" cy="45" rx="5" ry="5" fill="#60a5fa">
            <animate attributeName="ry" values="5;5;0.5;5;5" dur="3s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="59" cy="45" rx="5" ry="5" fill="#60a5fa">
            <animate attributeName="ry" values="5;5;0.5;5;5" dur="3s" repeatCount="indefinite" />
          </ellipse>
          
          {/* Digital Scanner Mouth */}
          <line x1="38" y1="52" x2="62" y2="52" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round">
            <animate attributeName="stroke" values="#60a5fa;#3b82f6;#60a5fa" dur="2s" repeatCount="indefinite" />
          </line>
          
          {/* Antenna */}
          <line x1="50" y1="20" x2="50" y2="8" stroke="#002d9c" strokeWidth="4" />
          <circle cx="50" cy="8" r="5" fill="#ef4444">
            <animate attributeName="fill" values="#ef4444;#3b82f6;#ef4444" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
    </div>
  );

  const hasMessages = messages.length > 0;
  const layoutIdVal = "chat-input-form-shared";

  const renderInputForm = (formClass: string) => (
    <motion.form 
      layoutId={layoutIdVal}
      onSubmit={(e) => {
        e.preventDefault();
        handleSend(input);
      }}
      className="chat-input-form"
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
    >
      <input
        type="text"
        className="chat-input-field"
        placeholder="Ask PAI..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isTyping}
      />
      <button
        type="submit"
        className="chat-send-btn"
        disabled={isTyping || !input.trim()}
        aria-label="Send message"
      >
        <Send size={18} />
      </button>
    </motion.form>
  );

  return (
    <div className="chat-page-layout" style={{ height: '100vh' }}>
      
      {/* Right Main Conversational Panel */}
      <div className="chat-main-area">
        
        {hasMessages ? (
          /* Message Feed */
          <>
            <div className="chat-history-wrap">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    className={`chat-message-row ${msg.sender}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {msg.sender === 'user' ? (
                      <div className="chat-avatar-user" title={userName}>
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      renderMascotAvatar()
                    )}

                    <div className="chat-bubble-wrap">
                      <div className="chat-bubble">
                        {msg.text}
                      </div>
                      <span className="chat-bubble-time">{msg.timestamp}</span>
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div 
                    className="chat-message-row ai"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {renderMascotAvatar()}
                    <div className="chat-bubble-wrap">
                      <div className="chat-bubble">
                        <div className="typing-dots">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Bottom input area (active mode) */}
            <div className="chat-input-bar-wrap">
              {renderInputForm("chat-input-form-shared")}
            </div>
          </>
        ) : (
          /* Starting clean state (Gemini Style Centered) */
          <div className="chat-greeting-wrap">
            <motion.h2 
              className="chat-greeting-title"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              hey there
            </motion.h2>

            <div className="centered-input-container">
              <div className="chat-input-glow" />
              {renderInputForm("chat-input-form-shared")}
            </div>
          </div>
        )}

        {/* Preset tags (shown below active history or centered input) */}
        {!isTyping && (
          <div className="chat-presets-bar">
            {preSets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(preset)}
                className="chat-preset-tag"
              >
                <Sparkles size={13} style={{ color: 'var(--primary)', marginRight: '4px' }} /> {preset}
              </button>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}

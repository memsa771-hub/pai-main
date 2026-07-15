'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Send, User, Sparkles, Paperclip, Loader2, X } from 'lucide-react';
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
  const { profile, logout, apiFetch, uploadDocument, trackedUnis } = useApp();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedOptions, setSuggestedOptions] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Document uploading state
  const [isDocUploading, setIsDocUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('Resume');
  const [docUni, setDocUni] = useState('Stanford University');
  const [docName, setDocName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setDocName(baseName);
      if (trackedUnis && trackedUnis.length > 0) {
        setDocUni(trackedUnis[0].name);
      } else {
        setDocUni('Stanford University');
      }
      setIsUploadModalOpen(true);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !docName) return;

    setIsDocUploading(true);
    setIsUploadModalOpen(false);

    try {
      await uploadDocument(docUni, docName, docType, uploadFile);
      // Wait a brief moment to let database changes propagate on backend
      await new Promise(resolve => setTimeout(resolve, 800));
      // Send chat message automatically to sync user prompt with new vault information
      await handleSend(`I have successfully uploaded my ${docType} document: ${docName}.`);
    } catch(err) {
      console.error(err);
    } finally {
      setIsDocUploading(false);
      setUploadFile(null);
      setDocName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Static greeting presets
  const greetingPresets = [
    "Review my SOP strategy",
    "Analyze my profile gaps",
    "Help me plan my GRE prep",
    "What universities should I target?",
    "Build my study abroad roadmap"
  ];

  const userName = profile.name ? profile.name.split(' ')[0] : 'Student';

  // Load chat sessions from backend on mount and select the latest one automatically
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res = await apiFetch('/api/chat/sessions');
        if (res.ok) {
          const data = await res.json();
          const mapped: ChatSession[] = data.map((s: any) => ({
            id: s.id,
            title: s.title,
            messages: []
          }));
          setSessions(mapped);
          
          // Auto-select the most recent session to preserve conversation history
          if (mapped.length > 0) {
            setActiveSessionId(mapped[0].id);
          }
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

  useEffect(() => {
    if (!isTyping && !isDocUploading) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isTyping, isDocUploading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Clear dynamic suggestions when user sends a message
    setSuggestedOptions([]);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Optimistically add user message to UI
    let currentSessionId = activeSessionId;
    if (currentSessionId) {
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
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
      currentSessionId = tempId;
    }

    setInput('');
    setIsTyping(true);

    try {
      const res = await apiFetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          session_id: currentSessionId && !currentSessionId.startsWith('temp-') ? currentSessionId : null
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

        const realSessionId = data.session_id;
        
        setSessions(prev => {
          return prev.map(s => {
            if (s.id === currentSessionId) {
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

        // Handle dynamic quick-reply suggestions from backend
        if (data.requires_profile_data && data.suggested_options && data.suggested_options.length > 0) {
          setSuggestedOptions(data.suggested_options);
        } else {
          setSuggestedOptions([]);
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
          if (s.id === currentSessionId) {
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
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, aiMsg] };
        }
        return s;
      }));
    } finally {
      setIsTyping(false);
    }
  };

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

  const renderInputForm = () => (
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
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".pdf,.docx,.txt"
      />
      <button
        type="button"
        className="chat-attach-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={isTyping || isDocUploading}
        title="Upload Resume, SOP, LOR, or Transcript"
      >
        {isDocUploading ? (
          <Loader2 size={18} className="chat-spin text-primary" style={{ animation: 'spin 1.5s linear infinite' }} />
        ) : (
          <Paperclip size={18} />
        )}
      </button>
      <input
        ref={inputRef}
        type="text"
        className="chat-input-field"
        placeholder="Ask PAI..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isTyping || isDocUploading}
      />
      <button
        type="submit"
        className="chat-send-btn"
        disabled={isTyping || isDocUploading || !input.trim()}
        aria-label="Send message"
      >
        <Send size={18} />
      </button>
    </motion.form>
  );

  return (
    <div className="chat-page-layout" style={{ height: '100%' }}>
      
      {/* Main Conversational Panel */}
      <div className="chat-main-area" style={{ width: '100%' }}>
        
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

            {/* Dynamic quick-reply pills */}
            <AnimatePresence>
              {!isTyping && suggestedOptions.length > 0 && (
                <motion.div
                  className="chat-dynamic-replies"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.3 }}
                >
                  {suggestedOptions.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(option)}
                      className="chat-dynamic-pill"
                    >
                      {option}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom input area */}
            <div className="chat-input-bar-wrap">
              {renderInputForm()}
            </div>
          </>
        ) : (
          /* Starting clean state */
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
              {renderInputForm()}
            </div>
          </div>
        )}

        {/* Static greeting presets */}
        {!hasMessages && !isTyping && (
          <div className="chat-presets-bar">
            {greetingPresets.map((preset, idx) => (
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

      {/* Upload Document Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="chat-upload-modal-overlay">
            <motion.div 
              className="chat-upload-modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="chat-upload-modal-header">
                <h3>Upload Document to PAI</h3>
                <button type="button" className="chat-upload-modal-close" onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit}>
                <div className="chat-upload-form-group">
                  <label htmlFor="chat-doc-name">Document Name</label>
                  <input 
                    id="chat-doc-name"
                    type="text" 
                    value={docName} 
                    onChange={(e) => setDocName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="chat-upload-form-group">
                  <label htmlFor="chat-doc-type">Document Type</label>
                  <select id="chat-doc-type" value={docType} onChange={(e) => setDocType(e.target.value)}>
                    <option value="Resume">Resume / CV</option>
                    <option value="SOP">SOP (Statement of Purpose)</option>
                    <option value="LOR">LOR (Letter of Recommendation)</option>
                    <option value="Transcript">Academic Transcript</option>
                    <option value="Other">Other Document</option>
                  </select>
                </div>

                <div className="chat-upload-form-group">
                  <label htmlFor="chat-doc-uni">Target University</label>
                  <select id="chat-doc-uni" value={docUni} onChange={(e) => setDocUni(e.target.value)}>
                    {trackedUnis && trackedUnis.length > 0 ? (
                      trackedUnis.map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))
                    ) : (
                      ['Stanford University', 'MIT', 'London Business School', 'UCL', 'My Portfolio'].map(uni => (
                        <option key={uni} value={uni}>{uni}</option>
                      ))
                    )}
                  </select>
                </div>

                <button type="submit" className="chat-upload-submit-btn">
                  Upload & Sync with PAI
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

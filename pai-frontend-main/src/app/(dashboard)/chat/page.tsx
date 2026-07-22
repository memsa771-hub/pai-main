'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { streamChatMessage, createStreamController, StreamMetadata } from '@/lib/api/stream';
import { Send, Loader2, Sparkles, Bot, User as UserIcon } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: StreamMetadata;
}

export default function ChatPage() {
  const { profile } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hi ${profile.name || 'there'}! I'm PAI, your admissions companion. I can help you build your academic profile, write SOPs, research universities, and track your applications. What would you like to work on today?`,
      timestamp: new Date().toISOString(),
      metadata: {
        quick_replies: [
          'Build my profile',
          'Write an SOP',
          'Find universities',
          'Track applications',
        ],
      },
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || streaming) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setStreaming(true);
    setStreamingContent('');

    const controller = createStreamController();
    abortRef.current = controller;

    await streamChatMessage(
      sessionId,
      messageText,
      {
        onToken: (text) => {
          setStreamingContent((prev) => prev + text);
        },
        onMetadata: (metadata) => {
          setStreamingContent((prev) => {
            const assistantMsg: ChatMessage = {
              role: 'assistant',
              content: prev,
              timestamp: new Date().toISOString(),
              metadata,
            };
            setMessages((msgs) => [...msgs, assistantMsg]);
            if (metadata.session_id) setSessionId(metadata.session_id);
            return '';
          });
        },
        onComplete: (data) => {
          setStreamingContent((prev) => {
            if (prev.trim()) {
              const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: prev,
                timestamp: new Date().toISOString(),
              };
              setMessages((msgs) => [...msgs, assistantMsg]);
            }
            if (data.session_id) setSessionId(data.session_id);
            return '';
          });
          setStreaming(false);
        },
        onError: (error) => {
          const errorMsg: ChatMessage = {
            role: 'assistant',
            content: `Sorry, I encountered an error: ${error}. Please try again.`,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          setStreamingContent('');
          setStreaming(false);
        },
      },
      controller.signal,
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStopStreaming = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#ffffff' }}>
      {/* Chat Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: '#ffffff',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Bot size={20} color="#ffffff" />
        </div>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>PAI Assistant</h2>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Your AI admissions companion</p>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '24px',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}>
                <Bot size={18} color="#ffffff" />
              </div>
            )}
            <div style={{ maxWidth: '70%' }}>
              <div style={{
                padding: '12px 18px',
                borderRadius: '14px',
                background: msg.role === 'user' ? '#2563eb' : '#f8fafc',
                color: msg.role === 'user' ? '#ffffff' : '#334155',
                fontSize: '14px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
              }}>
                {msg.content}
              </div>
              {/* Quick Replies */}
              {msg.metadata?.quick_replies && msg.metadata.quick_replies.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {msg.metadata.quick_replies.map((reply, rIdx) => (
                    <button
                      key={rIdx}
                      onClick={() => handleSend(reply)}
                      disabled={streaming}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        color: '#2563eb',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: streaming ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: streaming ? 0.5 : 1,
                      }}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}>
                <UserIcon size={18} color="#64748b" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming indicator */}
        {streaming && streamingContent && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Bot size={18} color="#ffffff" />
            </div>
            <div style={{ maxWidth: '70%' }}>
              <div style={{
                padding: '12px 18px',
                borderRadius: '14px',
                background: '#f8fafc',
                color: '#334155',
                fontSize: '14px',
                lineHeight: 1.6,
                border: '1px solid #e2e8f0',
              }}>
                {streamingContent}
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '14px',
                  background: '#2563eb',
                  marginLeft: '2px',
                  animation: 'blink 1s step-end infinite',
                  verticalAlign: 'text-bottom',
                  borderRadius: '1px',
                }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid #f1f5f9',
        background: '#ffffff',
      }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask PAI anything about admissions..."
              rows={1}
              disabled={streaming}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                background: '#f8fafc',
                transition: 'border-color 0.2s',
              }}
            />
          </div>
          {streaming ? (
            <button
              onClick={handleStopStreaming}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Stop
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: input.trim() ? '#2563eb' : '#e2e8f0',
                color: input.trim() ? '#ffffff' : '#94a3b8',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
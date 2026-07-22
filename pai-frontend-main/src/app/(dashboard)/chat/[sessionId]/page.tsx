'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { streamChatMessage, createStreamController, StreamMetadata } from '@/lib/api/stream';
import { Send, Loader2, Bot, User as UserIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: StreamMetadata;
}

export default function ChatSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { profile } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hi ${profile.name || 'there'}! Continuing our conversation. What would you like to discuss?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
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
        onToken: (text) => setStreamingContent((prev) => prev + text),
        onMetadata: (metadata) => {
          setStreamingContent((prev) => {
            if (prev.trim()) {
              setMessages((msgs) => [...msgs, { role: 'assistant', content: prev, timestamp: new Date().toISOString(), metadata }]);
            }
            return '';
          });
        },
        onComplete: () => {
          setStreamingContent((prev) => {
            if (prev.trim()) {
              setMessages((msgs) => [...msgs, { role: 'assistant', content: prev, timestamp: new Date().toISOString() }]);
            }
            return '';
          });
          setStreaming(false);
        },
        onError: (error) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${error}`, timestamp: new Date().toISOString() }]);
          setStreamingContent('');
          setStreaming(false);
        },
      },
      controller.signal,
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#ffffff' }}>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/chat" style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bot size={16} color="#ffffff" />
        </div>
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Chat Session</h2>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>ID: {sessionId.slice(0, 8)}...</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '20px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={14} color="#ffffff" />
              </div>
            )}
            <div style={{ maxWidth: '70%', padding: '12px 16px', borderRadius: '12px', background: msg.role === 'user' ? '#2563eb' : '#f8fafc', color: msg.role === 'user' ? '#ffffff' : '#334155', fontSize: '14px', lineHeight: 1.5, border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none' }}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserIcon size={14} color="#64748b" />
              </div>
            )}
          </div>
        ))}
        {streaming && streamingContent && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={14} color="#ffffff" />
            </div>
            <div style={{ maxWidth: '70%', padding: '12px 16px', borderRadius: '12px', background: '#f8fafc', fontSize: '14px', border: '1px solid #e2e8f0' }}>
              {streamingContent}
              <span style={{ display: 'inline-block', width: '6px', height: '14px', background: '#2563eb', marginLeft: '2px', animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom', borderRadius: '1px' }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', gap: '10px', maxWidth: '800px', margin: '0 auto' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Continue the conversation..."
            rows={1}
            disabled={streaming}
            style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', resize: 'none', background: '#f8fafc' }}
          />
          <button onClick={() => handleSend()} disabled={!input.trim() || streaming}
            style={{ padding: '12px', borderRadius: '12px', border: 'none', background: input.trim() ? '#2563eb' : '#e2e8f0', color: input.trim() ? '#ffffff' : '#94a3b8', cursor: input.trim() ? 'pointer' : 'not-allowed' }}>
            {streaming ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
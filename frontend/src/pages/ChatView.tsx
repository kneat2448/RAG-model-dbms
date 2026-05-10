import React, { useState, useRef, useEffect } from 'react';
import { Send, Book, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useRAGStream } from '../hooks/useRAGStream';
import { CitationDrawer } from '../components/CitationDrawer';
import './ChatView.css';

export default function ChatView() {
  const [query, setQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const { activeChapterId, activeChapterTitle, chatHistory } = useStore();
  const { streamQuery, isStreaming, error } = useRAGStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isStreaming) return;
    
    streamQuery(query.trim(), activeChapterId);
    setQuery('');
  };

  const openSource = (source: any) => {
    setSelectedSource(source);
    setIsDrawerOpen(true);
  };

  const renderMessageContent = (content: string, sources?: any[]) => {
    // Basic regex to find [1], [2] etc and replace with interactive chips
    const parts = content.split(/(\[\d+\])/g);
    
    return (
      <>
        {parts.map((part, i) => {
          const match = part.match(/\[(\d+)\]/);
          if (match && sources) {
            const sourceIndex = parseInt(match[1]) - 1;
            const source = sources[sourceIndex];
            if (source) {
              return (
                <span 
                  key={i} 
                  className="citation-chip"
                  onClick={() => openSource(source)}
                >
                  p.{source.page} · Ch.{source.chapter?.split(' ')[1] || '*'}
                </span>
              );
            }
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <div className="chat-container">
      <div className="chat-header glass-panel">
        <div className="chat-context">
          <Book size={20} className="text-accent" />
          <span>
            Context: <strong>{activeChapterId ? `${activeChapterId} - ${activeChapterTitle}` : 'Global (All Chapters)'}</strong>
          </span>
        </div>
      </div>

      <div className="chat-messages">
        {chatHistory.length === 0 ? (
          <div className="empty-chat glass-panel">
            <Book size={48} className="text-muted mb-4" />
            <h2>RAG Study Assistant</h2>
            <p>Ask a question about {activeChapterId ? 'this chapter' : 'the textbook'}. The model will retrieve relevant context and provide a cited answer.</p>
          </div>
        ) : (
          chatHistory.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.role}`}>
              <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble glass-panel'}`}>
                {msg.role === 'assistant' && msg.content === '' ? (
                  <div className="typing-indicator">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                ) : (
                  <div className="message-content">
                    {msg.role === 'assistant' 
                      ? renderMessageContent(msg.content, msg.sources)
                      : msg.content}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {error && (
          <div className="message-row assistant">
            <div className="message-bubble error-bubble">
              <AlertCircle size={18} /> {error}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrapper glass-panel">
        <form onSubmit={handleSubmit} className="chat-form">
          <input
            type="text"
            className="input chat-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question..."
            disabled={isStreaming}
          />
          <button type="submit" className="btn btn-primary" disabled={!query.trim() || isStreaming}>
            <Send size={18} />
          </button>
        </form>
      </div>

      <CitationDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        source={selectedSource} 
      />
    </div>
  );
}

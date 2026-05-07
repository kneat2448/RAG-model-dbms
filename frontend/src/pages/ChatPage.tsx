import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, Hash, Book, ChevronDown, Quote, Loader2 } from 'lucide-react';
import { useRAGStream } from '../hooks/useRAGStream';
import type { Citation } from '../hooks/useRAGStream';
import Drawer from '../ui/Drawer';

interface Chapter {
  id: string;
  title: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

const ChatPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeCitation, setActiveCitation] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { tokens, citations, isStreaming, stream } = useRAGStream();

  // Fetch chapters
  const { data: chapters } = useQuery<Chapter[]>({
    queryKey: ['chapters'],
    queryFn: async () => {
      const res = await fetch('/api/progress/chapters');
      return res.json();
    },
  });

  // Update last message with tokens
  useEffect(() => {
    if (isStreaming && tokens) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant') {
          const updated = [...prev];
          updated[updated.length - 1] = { ...last, content: tokens, citations };
          return updated;
        }
        return prev;
      });
    }
  }, [tokens, citations, isStreaming]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, tokens]);

  const handleSend = async () => {
    if (!query.trim() || isStreaming) return;

    const userMsg: Message = { role: 'user', content: query };
    const assistantMsg: Message = { role: 'assistant', content: '' };
    
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setQuery('');
    
    await stream(query, selectedChapter === 'all' ? undefined : selectedChapter);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-h-[800px] gap-6">
      {/* Header / Chapter Select */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 px-4 py-2 glass rounded-full border border-white/10">
          <Book size={18} className="opacity-50" />
          <select 
            value={selectedChapter} 
            onChange={(e) => setSelectedChapter(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-mono cursor-pointer"
          >
            <option value="all">All Chapters</option>
            {chapters?.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <ChevronDown size={14} className="opacity-30" />
        </div>
      </div>

      {/* Message Thread */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center gap-4">
            <Quote size={48} />
            <p className="font-mono uppercase tracking-widest text-sm">Ask me anything about DBMS</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div 
              className={`max-w-[85%] px-5 py-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-primary text-white' 
                  : 'glass border border-white/10'
              }`}
            >
              <p className={`text-sm leading-relaxed ${msg.role === 'assistant' ? 'font-serif text-base' : 'font-sans'}`}>
                {msg.content || (isStreaming && i === messages.length - 1 ? "..." : "")}
              </p>
              
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-white/10">
                  {msg.citations.map((cite) => (
                    <button
                      key={cite.id}
                      onClick={() => setActiveCitation(cite)}
                      className="flex items-center gap-1.5 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] font-mono transition-colors"
                    >
                      <Hash size={10} />
                      Source {cite.id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isStreaming && !tokens && (
          <div className="flex items-center gap-2 opacity-50 font-mono text-xs">
            <Loader2 size={14} className="animate-spin" />
            Generating response...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="relative">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="Enter your query..."
          className="w-full glass rounded-2xl p-4 pr-16 border border-white/10 focus:ring-2 focus:ring-primary transition-all resize-none font-sans"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !query.trim()}
          className="absolute right-3 bottom-3 p-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </div>

      {/* Citation Drawer */}
      <Drawer
        isOpen={!!activeCitation}
        onClose={() => setActiveCitation(null)}
        title={`Source ${activeCitation?.id}`}
      >
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-3 rounded-lg border border-white/10">
              <span className="text-[10px] uppercase opacity-50 font-mono">Chapter</span>
              <p className="text-sm font-bold">{activeCitation?.chapter}</p>
            </div>
            <div className="glass p-3 rounded-lg border border-white/10">
              <span className="text-[10px] uppercase opacity-50 font-mono">Page</span>
              <p className="text-sm font-bold">{activeCitation?.page}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <span className="text-[10px] uppercase opacity-50 font-mono">Raw Context</span>
            <div className="p-4 bg-black/20 rounded-lg border border-white/5 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {activeCitation?.content}
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default ChatPage;

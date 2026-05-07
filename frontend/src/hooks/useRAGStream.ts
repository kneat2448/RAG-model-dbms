import { useState, useCallback } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export interface Citation {
  id: number;
  page: number;
  chapter: string;
  section: string;
  content: string;
}

export const useRAGStream = () => {
  const [tokens, setTokens] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const stream = useCallback(async (query: string, chapterId?: string) => {
    setTokens('');
    setCitations([]);
    setIsStreaming(true);

    const controller = new AbortController();

    try {
      await fetchEventSource('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, chapter_id: chapterId }),
        signal: controller.signal,
        onmessage(ev) {
          if (ev.event === 'metadata') {
            try {
              const data = JSON.parse(ev.data);
              setCitations(data.sources || []);
            } catch (e) {
              console.error('Failed to parse metadata', e);
            }
          } else if (ev.event === 'token') {
            setTokens((prev) => prev + ev.data);
          } else if (ev.event === 'end') {
            setIsStreaming(false);
          }
        },
        onclose() {
          setIsStreaming(false);
        },
        onerror(err) {
          console.error('Stream error:', err);
          setIsStreaming(false);
          throw err;
        },
      });
    } catch (err) {
      console.error('Fetch error:', err);
      setIsStreaming(false);
    }
  }, []);

  return { tokens, citations, isStreaming, stream };
};

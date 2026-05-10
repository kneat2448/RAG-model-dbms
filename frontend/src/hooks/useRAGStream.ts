import { useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useStore } from '../store/useStore';

export const useRAGStream = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addChatMessage = useStore(state => state.addChatMessage);
  const updateLastMessage = useStore(state => state.updateLastMessage);

  const streamQuery = async (query: string, chapter_id: string | null) => {
    setIsStreaming(true);
    setError(null);

    // Add user message immediately
    addChatMessage({
      id: Date.now().toString(),
      role: 'user',
      content: query
    });

    // Add empty assistant message placeholder
    addChatMessage({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: ''
    });

    let currentContent = '';

    try {
      await fetchEventSource('http://127.0.0.1:8000/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, chapter_id }),
        onmessage(ev) {
          if (ev.event === 'metadata') {
            const data = JSON.parse(ev.data);
            updateLastMessage(currentContent, data.sources);
          } else if (ev.event === 'token') {
            currentContent += ev.data;
            updateLastMessage(currentContent);
          } else if (ev.event === 'end') {
            setIsStreaming(false);
          }
        },
        onerror(err) {
          console.error("EventSource failed:", err);
          setError("Failed to fetch stream.");
          setIsStreaming(false);
          throw err; // Stop retrying
        }
      });
    } catch (err) {
      console.error(err);
      setIsStreaming(false);
    }
  };

  return { streamQuery, isStreaming, error };
};

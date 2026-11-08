import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User, Globe, ArrowRight, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

interface ChatStylistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPrompt: (vibe: string) => void;
}

const STARTER_SUGGESTIONS = [
  'What are the trending cyberpunk lo-fi aesthetics right now?',
  'Suggest 3 minimalist dark phone wallpaper concepts with gold accents',
  'Recommend dreamy anime sunset lighting and color palettes',
];

export const ChatStylistDrawer: React.FC<ChatStylistDrawerProps> = ({
  isOpen,
  onClose,
  onApplyPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        'Hello! I am your AI Wallpaper Stylist & Art Director. Describe a feeling, an atmosphere, or an aesthetic trend you want, and I will craft prompt-ready vibes for your next 4 variations!',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat-stylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          useSearch: true,
          model: 'gemini-3.8-flash',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      const botMsg: ChatMessage = {
        id: `m_${Date.now()}`,
        role: 'model',
        content: data.text,
        timestamp: Date.now(),
      };
      setMessages([...newHistory, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'model',
        content: `Error: ${err.message || 'Could not consult AI Stylist. Please try again.'}`,
        timestamp: Date.now(),
      };
      setMessages([...newHistory, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-neutral-950/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col justify-between select-none animate-slide-left text-left">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-sm font-bold text-white">AI Wallpaper Stylist</h3>
              <span className="flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                <Globe className="w-2.5 h-2.5" /> Search Grounded
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">Powered by Gemini 3.8 Flash</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-white/10 flex items-center justify-center text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Thread */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <div className="w-6 h-6 rounded-lg bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-400 shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-neutral-900 border border-white/10 text-neutral-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* If model suggests quotes, allow user to apply immediately */}
              {msg.role === 'model' && msg.id !== 'welcome' && (
                <button
                  onClick={() => {
                    // Extract first quote or use text
                    const match = msg.content.match(/"([^"]+)"/);
                    const promptToUse = match ? match[1] : msg.content.slice(0, 100);
                    onApplyPrompt(promptToUse);
                    onClose();
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-950/60 hover:bg-violet-900/60 border border-violet-500/30 text-[11px] text-violet-300 font-medium transition-colors"
                >
                  <span>Apply Vibe to Generator</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-neutral-800 border border-white/10 flex items-center justify-center text-neutral-300 shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-violet-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[11px]">Consulting aesthetic art director...</span>
          </div>
        )}
      </div>

      {/* Suggested Starters */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 space-y-1.5">
          <p className="text-[10px] text-neutral-400 uppercase font-semibold">Try asking:</p>
          <div className="flex flex-col gap-1">
            {STARTER_SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                className="text-left text-[11px] text-neutral-300 hover:text-white bg-neutral-900/70 hover:bg-neutral-800 border border-white/5 rounded-xl p-2 transition-colors truncate"
              >
                "{s}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Dock */}
      <div className="p-3 border-t border-white/10 bg-neutral-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for color palettes, aesthetic vibes..."
            disabled={isLoading}
            className="flex-1 bg-neutral-900 border border-white/15 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 flex items-center justify-center text-white shrink-0 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

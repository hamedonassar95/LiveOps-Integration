import React, { useState } from 'react';
import {
  X,
  Search,
  Globe,
  Sparkles,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';

interface GroundingSource {
  title: string;
  uri: string;
}

interface SearchGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPrompt: (prompt: string, autoGenerate?: boolean) => void;
  currentPrompt?: string;
}

const QUICK_TOPICS = [
  'James Webb Telescope latest deep space nebulae',
  'Tokyo cyberpunk rain street aesthetic 2026',
  'Formula 1 modern aero livery aesthetics',
  'Pantone Color of the Year 2026 palettes',
  'Studio Ghibli lush anime nature landscapes',
];

export const SearchGroundingModal: React.FC<SearchGroundingModalProps> = ({
  isOpen,
  onClose,
  onApplyPrompt,
  currentPrompt = '',
}) => {
  const [query, setQuery] = useState<string>(currentPrompt || 'James Webb Telescope latest deep space nebulae');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchGrounding = async (topicToSearch?: string) => {
    const textToSearch = topicToSearch !== undefined ? topicToSearch : query;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/search-grounded-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSearch.trim() }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch Google Search Grounding data');
      }

      setResultText(data.text);
      setGroundingSources(data.groundingChunks || []);
      setSearchQueries(data.webSearchQueries || []);
    } catch (err: any) {
      console.error('Search grounding failure:', err);
      setErrorMessage(err.message || 'Error querying Google Search data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract recommended prompt from resultText or use clean text
  const extractPrompt = (): string => {
    if (!resultText) return query;
    // Look for "Vibe Prompt:" or quotes
    const promptMatch = resultText.match(/(?:Vibe Prompt|Wallpaper Prompt|Prompt):\s*([^\n\r]+)/i);
    if (promptMatch && promptMatch[1]) {
      return promptMatch[1].replace(/^["']|["']$/g, '').trim();
    }
    const quoteMatch = resultText.match(/"([^"]{15,})"/);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1].trim();
    }
    // Fallback to first 120 characters of first paragraph
    const lines = resultText.split('\n').filter((l) => l.trim().length > 10);
    return lines[0] ? lines[0].slice(0, 140) : query;
  };

  const recommendedPrompt = extractPrompt();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in text-left">
      <div className="w-full max-w-xl max-h-[90vh] bg-[#0c0d14] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-neutral-950/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500/30 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-bold text-white tracking-tight">Google Search Grounding</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  gemini-3.8-flash
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Live Google Search data for up-to-date and accurate wallpaper aesthetics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Query Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
              <span>Topic or Aesthetic to Ground with Google Search:</span>
              <span className="text-[10px] text-neutral-500">Live Web Data</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchGrounding()}
                placeholder="e.g. Formula 1 2026 aero liveries, James Webb nebula discoveries..."
                className="w-full bg-neutral-950/90 border border-white/15 focus:border-emerald-500 rounded-2xl pl-3.5 pr-28 py-3 text-xs text-white placeholder-neutral-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => handleFetchGrounding()}
                disabled={isLoading || !query.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* Quick Trending Topics */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-neutral-400 flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Trending Search Topics:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TOPICS.map((topic, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuery(topic);
                    handleFetchGrounding(topic);
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] bg-neutral-900/90 hover:bg-neutral-800 border border-white/10 hover:border-emerald-500/40 text-neutral-300 hover:text-white transition-all text-left"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="py-8 text-center flex flex-col items-center justify-center space-y-2.5 text-neutral-400 animate-pulse">
              <Globe className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs font-semibold text-white">Querying Google Search Grounding...</p>
              <p className="text-[11px] text-neutral-500">
                Grounding with live web facts via gemini-3.8-flash googleSearch tool
              </p>
            </div>
          )}

          {/* Grounding Results Display */}
          {resultText && !isLoading && (
            <div className="space-y-4 pt-1">
              {/* Recommended Vibe Prompt Box */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-neutral-900 border border-emerald-500/30 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-emerald-300 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Search-Grounded 9:16 Wallpaper Prompt:</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400/80">Factually Accurate</span>
                </div>

                <p className="text-xs text-white bg-neutral-950/70 p-3 rounded-xl border border-white/10 leading-relaxed font-medium">
                  {recommendedPrompt}
                </p>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onApplyPrompt(recommendedPrompt, false);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-200 hover:text-white transition-colors"
                  >
                    Apply to Input
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onApplyPrompt(recommendedPrompt, true);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all shadow-md active:scale-95 flex items-center space-x-1.5"
                  >
                    <span>Apply & Generate (4x)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Detailed Synthesis Text */}
              <div className="p-3.5 rounded-2xl bg-neutral-900/70 border border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Compass className="w-3.5 h-3.5 text-violet-400" />
                  <span>Real-World Visual Insights & Aesthetics:</span>
                </h4>
                <div className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto pr-1">
                  {resultText}
                </div>
              </div>

              {/* Web Grounding Sources (Extracted from Google Search chunks) */}
              {groundingSources.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                    <span className="flex items-center space-x-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Google Search Web Sources ({groundingSources.length})</span>
                    </span>
                    <span className="text-[10px] text-neutral-500">Live Citations</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {groundingSources.map((source, i) => (
                      <a
                        key={i}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-white/10 hover:border-emerald-500/40 text-neutral-300 hover:text-white transition-all flex items-center justify-between group"
                      >
                        <span className="text-[11px] truncate font-medium group-hover:text-emerald-300">
                          {source.title || 'Web Source'}
                        </span>
                        <ExternalLink className="w-3 h-3 text-neutral-500 group-hover:text-emerald-400 shrink-0 ml-1.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Google Search Queries Executed */}
              {searchQueries.length > 0 && (
                <div className="flex items-center space-x-2 text-[10px] text-neutral-500 px-1">
                  <span>Google queries executed:</span>
                  <div className="flex flex-wrap gap-1">
                    {searchQueries.map((q, i) => (
                      <span key={i} className="text-neutral-400 font-mono">
                        "{q}"{i < searchQueries.length - 1 ? ' · ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-white/10 bg-neutral-950/80 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
          <span className="flex items-center space-x-1">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Search Grounding powered by gemini-3.8-flash</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

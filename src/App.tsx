/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Smartphone,
  RefreshCw,
  History,
  Layers,
  X,
  AlertCircle,
  SlidersHorizontal,
  Flame,
  Info,
  Maximize2,
  Mic,
  MicOff,
  Bot,
  Video,
} from 'lucide-react';
import { Wallpaper, WallpaperBatch, GenerationSettings, AspectRatio, ImageSize } from './types.ts';
import { VibePresets } from './components/VibePresets.tsx';
import { GenerationSettingsBar } from './components/GenerationSettingsBar.tsx';
import { BatchGrid } from './components/BatchGrid.tsx';
import { FullscreenModal } from './components/FullscreenModal.tsx';
import { ThreeDPhoneViewer } from './components/ThreeDPhoneViewer.tsx';
import { ChatStylistDrawer } from './components/ChatStylistDrawer.tsx';

// 4 Initial Starter Wallpapers so the user can immediately experience the app
const INITIAL_STARTER_WALLPAPERS: Wallpaper[] = [
  {
    id: 'starter_1',
    imageUrl:
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1080&q=80',
    prompt: 'rainy cyberpunk lo-fi alley with neon reflections, moody purple and cyan ambient glow',
    aspectRatio: '9:16',
    imageSize: '2K',
    model: 'gemini-3-pro-image-preview',
    variationIndex: 1,
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'starter_2',
    imageUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1080&q=80',
    prompt: 'rainy cyberpunk lo-fi neon skyline drenched in misty drizzle and holographic signage',
    aspectRatio: '9:16',
    imageSize: '2K',
    model: 'gemini-3-pro-image-preview',
    variationIndex: 2,
    createdAt: Date.now() - 3500000,
  },
  {
    id: 'starter_3',
    imageUrl:
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1080&q=80',
    prompt: 'rainy cyberpunk lo-fi ramen stall window on a wet futuristic boulevard',
    aspectRatio: '9:16',
    imageSize: '2K',
    model: 'gemini-3-pro-image-preview',
    variationIndex: 3,
    createdAt: Date.now() - 3400000,
  },
  {
    id: 'starter_4',
    imageUrl:
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1080&q=80',
    prompt: 'rainy cyberpunk lo-fi retro arcade with violet neon beams and ambient rain mist',
    aspectRatio: '9:16',
    imageSize: '2K',
    model: 'gemini-3-pro-image-preview',
    variationIndex: 4,
    createdAt: Date.now() - 3300000,
  },
];

export default function App() {
  const [vibeInput, setVibeInput] = useState<string>('rainy cyberpunk lo-fi');
  const [currentBatch, setCurrentBatch] = useState<Wallpaper[]>(INITIAL_STARTER_WALLPAPERS);
  const [historyBatches, setHistoryBatches] = useState<WallpaperBatch[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fullscreen Viewer State
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);

  // Remix reference image
  const [referenceWallpaper, setReferenceWallpaper] = useState<Wallpaper | null>(null);

  // Generation Settings (Aspect Ratio, Resolution, Model)
  const [settings, setSettings] = useState<GenerationSettings>({
    aspectRatio: '9:16',
    imageSize: '2K',
    model: 'gemini-3-pro-image-preview',
  });

  // Voice Input (gemini-3.5-transcribe)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  // AI Stylist Chatbot Drawer
  const [showChatStylist, setShowChatStylist] = useState<boolean>(false);

  // 3D Studio Showcase
  const [threeDWallpaper, setThreeDWallpaper] = useState<Wallpaper | null>(null);

  // Handle Voice Recording for Vibe Prompt
  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          setIsTranscribing(true);
          try {
            const res = await fetch('/api/transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioData: base64Data, mimeType }),
            });
            const data = await res.json();
            if (data.success && data.text) {
              setVibeInput((prev) => (prev ? `${prev}, ${data.text}` : data.text));
            }
          } catch (err) {
            console.error('Transcription error:', err);
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage('Could not access microphone for audio transcription.');
    }
  };

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vibepaper_history');
      if (saved) {
        const parsed: WallpaperBatch[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setHistoryBatches(parsed);
          // If the user already has saved batches, display the most recent one
          setCurrentBatch(parsed[0].wallpapers);
          setVibeInput(parsed[0].prompt);
        }
      }
    } catch (e) {
      console.warn('Failed to parse history:', e);
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (newBatch: WallpaperBatch) => {
    try {
      const updated = [newBatch, ...historyBatches.slice(0, 15)];
      setHistoryBatches(updated);
      localStorage.setItem('vibepaper_history', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save history:', e);
    }
  };

  // Main Generation Handler
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!vibeInput.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/generate-wallpapers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: vibeInput.trim(),
          aspectRatio: settings.aspectRatio,
          imageSize: settings.imageSize,
          model: settings.model,
          referenceImage: referenceWallpaper ? referenceWallpaper.imageUrl : undefined,
          count: 4, // 4 variations
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate wallpapers');
      }

      if (data.wallpapers && data.wallpapers.length > 0) {
        setCurrentBatch(data.wallpapers);

        const newBatch: WallpaperBatch = {
          id: `batch_${Date.now()}`,
          prompt: vibeInput.trim(),
          aspectRatio: settings.aspectRatio,
          imageSize: settings.imageSize,
          model: settings.model,
          referenceImage: referenceWallpaper ? referenceWallpaper.imageUrl : undefined,
          wallpapers: data.wallpapers,
          createdAt: Date.now(),
        };

        saveToHistory(newBatch);
      } else {
        throw new Error('No wallpaper variations were returned by the AI service.');
      }
    } catch (err: any) {
      console.error('Generation failure:', err);
      setErrorMessage(
        err.message || 'An error occurred during wallpaper generation. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Open Fullscreen Modal on Image Tap
  const handleOpenFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setIsFullscreenOpen(true);
  };

  // Handle Remix Action (sets current wallpaper as reference)
  const handleRemix = (wallpaper: Wallpaper) => {
    setReferenceWallpaper(wallpaper);
    setIsFullscreenOpen(false);
    // Prefill vibe input with remix tweak instruction
    setVibeInput(wallpaper.prompt);

    // Scroll smoothly to top input
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear Remix Reference
  const handleClearRemix = () => {
    setReferenceWallpaper(null);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-neutral-100 flex flex-col items-center justify-start relative overflow-x-hidden selection:bg-violet-600 selection:text-white">
      {/* Ambient Background Glows */}
      <div className="fixed top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-br from-violet-600/15 via-fuchsia-600/10 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[300px] bg-cyan-600/10 blur-[140px] pointer-events-none -z-10" />

      {/* Main Container - Mobile-First centered column */}
      <div className="w-full max-w-lg mx-auto flex flex-col px-4 py-4 sm:py-6 space-y-5">
        {/* Top Navbar */}
        <header className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-indigo-600 p-[1px] shadow-lg shadow-violet-600/20">
              <div className="w-full h-full bg-neutral-950 rounded-[15px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-base font-bold text-white tracking-tight">
                  VibePaper
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">
                  9:16 Studio
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                AI Phone Wallpaper Generator
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-1.5">
            {/* AI Stylist Chatbot Drawer */}
            <button
              onClick={() => setShowChatStylist(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-900/80 hover:bg-violet-950/40 border border-violet-500/30 text-violet-300 transition-colors shadow-sm"
              title="Open AI Wallpaper Stylist Chat"
            >
              <Bot className="w-3.5 h-3.5 text-violet-400" />
              <span>AI Stylist</span>
            </button>

            {/* 3D Phone Studio */}
            <button
              onClick={() => setThreeDWallpaper(currentBatch[0] || INITIAL_STARTER_WALLPAPERS[0])}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 text-neutral-300 transition-colors"
              title="View in 3D Phone Studio (Three.js)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>3D Studio</span>
            </button>

            {/* History Batches Button */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                showHistory
                  ? 'bg-violet-600/30 border-violet-500 text-white'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 border-white/10 text-neutral-300'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Batches</span>
              <span>({historyBatches.length})</span>
            </button>
          </div>
        </header>

        {/* History Drawer Modal */}
        {showHistory && (
          <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl space-y-3 animate-fade-in text-left">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-violet-400" />
                Previous Wallpaper Batches
              </span>
              <button
                onClick={() => setShowHistory(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {historyBatches.length === 0 ? (
              <p className="text-xs text-neutral-400 py-3 text-center">
                No past batches yet. Generate your first wallpaper batch below!
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {historyBatches.map((batch) => (
                  <div
                    key={batch.id}
                    onClick={() => {
                      setCurrentBatch(batch.wallpapers);
                      setVibeInput(batch.prompt);
                      setShowHistory(false);
                    }}
                    className="p-2.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-white/5 cursor-pointer transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {batch.wallpapers[0] && (
                        <img
                          src={batch.wallpapers[0].imageUrl}
                          alt=""
                          className="w-8 h-12 object-cover rounded-lg border border-white/10 shrink-0"
                        />
                      )}
                      <div className="truncate">
                        <p className="text-xs font-medium text-white truncate">
                          {batch.prompt}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {batch.wallpapers.length} variations • {batch.aspectRatio} • {batch.imageSize}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-violet-400 font-mono shrink-0">
                      View
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Remix Reference Active Banner */}
        {referenceWallpaper && (
          <div className="bg-gradient-to-r from-violet-950/60 to-fuchsia-950/40 border border-violet-500/30 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-lg animate-fade-in text-left">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative">
                <img
                  src={referenceWallpaper.imageUrl}
                  alt="Remix reference"
                  className="w-10 h-16 object-cover rounded-xl border border-violet-400/50 shadow-md"
                />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-600 text-[9px] font-bold text-white flex items-center justify-center">
                  #
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="text-xs font-bold text-violet-200">
                    Remixing from Variation #{referenceWallpaper.variationIndex || 1}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 truncate mt-0.5">
                  Using this image as visual reference for the next 4 variations.
                </p>
              </div>
            </div>

            <button
              onClick={handleClearRemix}
              title="Remove reference"
              className="w-7 h-7 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/15 flex items-center justify-center text-neutral-300 hover:text-white shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Vibe Prompt Card */}
        <form
          onSubmit={handleGenerate}
          className="bg-neutral-900/70 backdrop-blur-2xl border border-white/10 rounded-3xl p-3.5 sm:p-4 shadow-2xl space-y-3.5 text-left"
        >
          <div>
            <label className="text-xs font-semibold text-neutral-300 mb-1.5 block">
              Describe your desired wallpaper vibe:
            </label>
            <div className="relative">
              <textarea
                value={vibeInput}
                onChange={(e) => setVibeInput(e.target.value)}
                placeholder="e.g. rainy cyberpunk lo-fi, minimalist neon forest, pastel anime sunset..."
                rows={2}
                disabled={isLoading}
                className="w-full bg-neutral-950/80 border border-white/15 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-2xl p-3 pr-12 text-sm text-white placeholder-neutral-500 resize-none outline-none transition-all"
              />

              {/* Speech-to-Text Microphone Button (gemini-3.5-transcribe) */}
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isLoading || isTranscribing}
                title={isRecording ? 'Stop recording voice' : 'Speak your vibe (Audio transcription)'}
                className={`absolute right-2.5 bottom-3.5 p-2 rounded-xl transition-all ${
                  isRecording
                    ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/30'
                    : isTranscribing
                    ? 'bg-violet-600 text-white animate-spin'
                    : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/10'
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Voice Transcribing Indicator */}
            {isTranscribing && (
              <div className="flex items-center space-x-1.5 text-[11px] text-violet-400 mt-1 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Transcribing audio with Gemini 3.5 Transcribe...</span>
              </div>
            )}
            {isRecording && (
              <div className="flex items-center space-x-1.5 text-[11px] text-red-400 mt-1 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span>Listening... Tap mic when done speaking.</span>
              </div>
            )}
          </div>

          {/* Quick Vibe Chips Presets */}
          <VibePresets
            onSelectVibe={(vibe) => setVibeInput(vibe)}
            currentVibe={vibeInput}
          />

          {/* Aspect Ratio & Resolution Affordance Bar */}
          <GenerationSettingsBar
            settings={settings}
            onChange={setSettings}
            disabled={isLoading}
          />

          {/* Primary Action Button: Generate 4 Variations */}
          <button
            type="submit"
            disabled={isLoading || !vibeInput.trim()}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-indigo-500 shadow-xl shadow-violet-600/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 group"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Crafting 4 Variations...</span>
              </>
            ) : referenceWallpaper ? (
              <>
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span>Remix & Generate 4 Variations</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span>Generate 4 Variations (9:16)</span>
              </>
            )}
          </button>
        </form>

        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-start space-x-2.5 animate-fade-in text-left">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-300">Generation Notice</p>
              <p className="mt-0.5 text-rose-200/90">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 4 Variations Wallpaper Grid */}
        <section className="w-full">
          <BatchGrid
            wallpapers={currentBatch}
            isLoading={isLoading}
            aspectRatio={settings.aspectRatio}
            onOpenFullscreen={handleOpenFullscreen}
            onRemix={handleRemix}
            currentPrompt={vibeInput}
          />
        </section>

        {/* Footer info */}
        <footer className="pt-4 pb-6 text-center text-xs text-neutral-500 space-y-1">
          <p>Tap any wallpaper to preview fullscreen, test lock screen, download or remix.</p>
          <p className="text-[10px] text-neutral-600 font-mono">
            Powered by {settings.model} • 4 Variations in {settings.aspectRatio}
          </p>
        </footer>
      </div>

      {/* Fullscreen Modal Viewport */}
      {isFullscreenOpen && fullscreenIndex !== null && (
        <FullscreenModal
          wallpapers={currentBatch}
          currentIndex={fullscreenIndex}
          isOpen={isFullscreenOpen}
          onClose={() => setIsFullscreenOpen(false)}
          onSelectIndex={(newIdx) => setFullscreenIndex(newIdx)}
          onRemix={handleRemix}
          onOpen3DStudio={(wp) => setThreeDWallpaper(wp)}
        />
      )}

      {/* Three.js 3D Phone Studio Modal */}
      {threeDWallpaper && (
        <ThreeDPhoneViewer
          wallpaper={threeDWallpaper}
          isOpen={!!threeDWallpaper}
          onClose={() => setThreeDWallpaper(null)}
        />
      )}

      {/* AI Wallpaper Stylist Chat Drawer */}
      <ChatStylistDrawer
        isOpen={showChatStylist}
        onClose={() => setShowChatStylist(false)}
        onApplyPrompt={(vibe) => setVibeInput(vibe)}
      />
    </div>
  );
}

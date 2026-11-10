/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Heart,
  Trash2,
  Github,
  Radio,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { Wallpaper, WallpaperBatch, GenerationSettings, AspectRatio, ImageSize } from './types.ts';
import { VibePresets } from './components/VibePresets.tsx';
import { GenerationSettingsBar } from './components/GenerationSettingsBar.tsx';
import { BatchGrid } from './components/BatchGrid.tsx';
import { FullscreenModal } from './components/FullscreenModal.tsx';
import { ThreeDPhoneViewer } from './components/ThreeDPhoneViewer.tsx';
import { ChatStylistDrawer } from './components/ChatStylistDrawer.tsx';
import { GitHubOpenSourceHub, OpenSourceTemplate } from './components/GitHubOpenSourceHub.tsx';
import { LiveVoiceModal } from './components/LiveVoiceModal.tsx';
import { useAuth } from './context/AuthContext.tsx';
import {
  saveWallpaperToFirestore,
  removeWallpaperFromFirestore,
  subscribeToSavedWallpapers,
} from './lib/firestore.ts';




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

  // GitHub & Open Source Hub Modal
  const [showGitHubHub, setShowGitHubHub] = useState<boolean>(false);

  // Gemini 3.8 Live Voice Studio Modal
  const [showLiveVoiceModal, setShowLiveVoiceModal] = useState<boolean>(false);

  // 3D Studio Showcase
  const [threeDWallpaper, setThreeDWallpaper] = useState<Wallpaper | null>(null);


  // Handle open source template clone application
  const handleApplyOpenSourceTemplate = (template: OpenSourceTemplate) => {
    setVibeInput(template.vibePrompt);
    setSettings((prev) => ({
      ...prev,
      aspectRatio: template.recommendedAspect,
      imageSize: template.recommendedResolution,
    }));
  };


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

  // Firebase Auth Context Hook
  const { user, signInWithGoogle, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

  // Favorites State (Bookmarked wallpapers)
  const [favorites, setFavorites] = useState<Wallpaper[]>([]);
  const [historyTab, setHistoryTab] = useState<'batches' | 'favorites'>('batches');

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('vibepaper_history');
      if (savedHistory) {
        const parsed: WallpaperBatch[] = JSON.parse(savedHistory);
        if (parsed.length > 0) {
          setHistoryBatches(parsed);
          setCurrentBatch(parsed[0].wallpapers);
          setVibeInput(parsed[0].prompt);
        }
      }

      if (!user) {
        const savedFavorites = localStorage.getItem('vibepaper_favorites');
        if (savedFavorites) {
          const parsedFavs: Wallpaper[] = JSON.parse(savedFavorites);
          if (parsedFavs.length > 0) {
            setFavorites(parsedFavs);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse history or favorites:', e);
    }
  }, [user]);

  // Real-time Firestore sync when user is signed in
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToSavedWallpapers(
      user.uid,
      (firestoreWallpapers) => {
        setFavorites(firestoreWallpapers);
        localStorage.setItem('vibepaper_favorites', JSON.stringify(firestoreWallpapers));
      },
      (error) => {
        console.error('Firestore listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

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

  // Toggle Favorite (syncs to Firestore if user logged in, plus localStorage)
  const handleToggleFavorite = async (wallpaper: Wallpaper) => {
    const exists = favorites.some((w) => w.id === wallpaper.id);
    let updated: Wallpaper[];

    if (exists) {
      updated = favorites.filter((w) => w.id !== wallpaper.id);
      if (user) {
        try {
          await removeWallpaperFromFirestore(user.uid, wallpaper.id);
        } catch (e) {
          console.error('Failed to remove from Firestore:', e);
        }
      }
    } else {
      updated = [{ ...wallpaper, isFavorite: true }, ...favorites];
      if (user) {
        try {
          await saveWallpaperToFirestore(user.uid, wallpaper);
        } catch (e) {
          console.error('Failed to save to Firestore:', e);
        }
      }
    }

    setFavorites(updated);
    try {
      localStorage.setItem('vibepaper_favorites', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save favorites locally:', err);
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
            {/* GitHub & Open Source Hub */}
            <button
              onClick={() => setShowGitHubHub(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white transition-colors shadow-sm"
              title="Open Source & GitHub Hub (Clone, Templates, Dataset)"
            >
              <Github className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">GitHub Hub</span>
              <span className="sm:hidden">Git</span>
            </button>

            {/* Gemini 3.8 Live Voice Studio */}
            <button
              onClick={() => setShowLiveVoiceModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 hover:from-violet-600/50 hover:to-fuchsia-600/50 border border-violet-500/40 text-violet-200 transition-all shadow-sm active:scale-95"
              title="Real-Time Voice Conversation with Gemini 3.8 Live"
            >
              <Radio className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
              <span className="hidden sm:inline">Live Voice</span>
              <span className="sm:hidden">Live</span>
            </button>

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

            {/* History & Favorites Drawer Button */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                showHistory
                  ? 'bg-violet-600/30 border-violet-500 text-white'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 border-white/10 text-neutral-300'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Library</span>
              {favorites.length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-rose-300 bg-rose-500/20 border border-rose-500/30 font-bold px-1.5 py-0.2 rounded-full ml-0.5">
                  <Heart className="w-2.5 h-2.5 fill-current text-rose-400" />
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Google Sign-In & User Profile Avatar */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-1.5 p-1 rounded-full bg-neutral-900 border border-white/10 hover:border-violet-500/40 transition-all active:scale-95"
                  title={user.displayName || user.email || 'User Account'}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-10 w-48 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 shadow-2xl z-50 animate-fade-in text-left">
                    <div className="px-2 py-1.5 border-b border-white/10 mb-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {user.displayName || 'Google User'}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate">{user.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-white text-neutral-900 hover:bg-neutral-100 transition-all shadow-sm active:scale-95 shrink-0"
                title="Sign in with Google to sync bookmarks and save to Google Drive"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
          </div>
        </header>


        {/* History & Favorites Drawer Modal */}
        {showHistory && (
          <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl space-y-3 animate-fade-in text-left">
            {/* Tab Switcher Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center space-x-1 bg-neutral-950/80 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setHistoryTab('batches')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    historyTab === 'batches'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Batches ({historyBatches.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryTab('favorites')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    historyTab === 'favorites'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      historyTab === 'favorites' ? 'fill-current' : 'text-rose-400'
                    }`}
                  />
                  <span>Favorites ({favorites.length})</span>
                </button>
              </div>

              <button
                onClick={() => setShowHistory(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab 1: Previous Batches */}
            {historyTab === 'batches' && (
              <>
                {historyBatches.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-4 text-center">
                    No past batches yet. Generate your first wallpaper batch below!
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
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
                              {batch.wallpapers.length} variations • {batch.aspectRatio} •{' '}
                              {batch.imageSize}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-violet-400 font-mono shrink-0">
                          Load Batch
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Tab 2: Bookmarked Favorites */}
            {historyTab === 'favorites' && (
              <>
                {favorites.length === 0 ? (
                  <div className="py-6 px-3 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2.5">
                      <Heart className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-white">No Bookmarked Favorites Yet</p>
                    <p className="text-[11px] text-neutral-400 max-w-xs mt-1 leading-relaxed">
                      Tap the heart icon <Heart className="w-3 h-3 inline text-rose-400 fill-current" /> on any wallpaper in the grid to bookmark your favorite AI generations here!
                    </p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {favorites.map((fav) => (
                      <div
                        key={fav.id}
                        className="p-2.5 rounded-xl bg-neutral-800/60 border border-white/5 flex items-center justify-between gap-3 hover:border-rose-500/30 transition-colors"
                      >
                        <div
                          onClick={() => {
                            // If this wallpaper is in currentBatch, open fullscreen
                            const idx = currentBatch.findIndex((w) => w.id === fav.id);
                            if (idx >= 0) {
                              setFullscreenIndex(idx);
                            } else {
                              setCurrentBatch([fav, ...currentBatch.filter((w) => w.id !== fav.id)]);
                              setFullscreenIndex(0);
                            }
                            setIsFullscreenOpen(true);
                            setShowHistory(false);
                          }}
                          className="flex items-center space-x-2.5 min-w-0 cursor-pointer flex-1"
                        >
                          <img
                            src={fav.imageUrl}
                            alt=""
                            className="w-9 h-14 object-cover rounded-lg border border-white/10 shrink-0"
                          />
                          <div className="truncate">
                            <p className="text-xs font-medium text-white truncate">
                              {fav.prompt}
                            </p>
                            <p className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                              <span className="font-mono">{fav.aspectRatio}</span>
                              <span>•</span>
                              <span className="font-mono">{fav.imageSize}</span>
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            onClick={() => {
                              handleRemix(fav);
                              setShowHistory(false);
                            }}
                            title="Remix this favorite wallpaper"
                            className="p-1.5 rounded-lg bg-neutral-900/90 hover:bg-violet-600/90 border border-white/10 text-neutral-300 hover:text-white transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleFavorite(fav)}
                            title="Remove from favorites"
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
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
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
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
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
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

      {/* GitHub & Open Source Hub Modal */}
      <GitHubOpenSourceHub
        isOpen={showGitHubHub}
        onClose={() => setShowGitHubHub(false)}
        currentBatch={currentBatch}
        currentPrompt={vibeInput}
        onApplyTemplate={handleApplyOpenSourceTemplate}
      />

      {/* Gemini 3.8 Live Voice Studio Modal */}
      <LiveVoiceModal
        isOpen={showLiveVoiceModal}
        onClose={() => setShowLiveVoiceModal(false)}
        onApplyPrompt={(vibe) => setVibeInput(vibe)}
      />
    </div>
  );
}



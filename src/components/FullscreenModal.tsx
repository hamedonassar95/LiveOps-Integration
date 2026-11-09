import React, { useState } from 'react';
import {
  X,
  Download,
  Sparkles,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Share2,
  Check,
  Layers,
  Heart,
} from 'lucide-react';
import { Wallpaper } from '../types.ts';
import { LockScreenOverlay } from './LockScreenOverlay.tsx';

interface FullscreenModalProps {
  wallpapers: Wallpaper[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onRemix: (wallpaper: Wallpaper) => void;
  onOpen3DStudio?: (wallpaper: Wallpaper) => void;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (wallpaper: Wallpaper) => void;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({
  wallpapers,
  currentIndex,
  isOpen,
  onClose,
  onSelectIndex,
  onRemix,
  onOpen3DStudio,
  favoriteIds,
  onToggleFavorite,
}) => {
  const [showLockScreen, setShowLockScreen] = useState<boolean>(true);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

  // Live Video Animation State (gemini-omni-1.2-flash)
  const [isAnimatingVideo, setIsAnimatingVideo] = useState<boolean>(false);
  const [liveVideoUrl, setLiveVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Ambient Soundtrack State (lyria-3-clip-preview)
  const [isGeneratingMusic, setIsGeneratingMusic] = useState<boolean>(false);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  if (!isOpen || !wallpapers || wallpapers.length === 0) return null;

  const currentWallpaper = wallpapers[currentIndex] || wallpapers[0];
  const hasMultiple = wallpapers.length > 1;

  const fallbackCopyToClipboard = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          `VibePaper Phone Wallpaper: "${currentWallpaper.prompt}" - ${window.location.href}`
        );
      }
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const handleShare = async () => {
    const title = 'VibePaper Phone Wallpaper';
    const text = `Check out this AI-generated phone wallpaper: "${currentWallpaper.prompt}" (9:16)`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        let sharedFile: File | null = null;
        if (currentWallpaper.imageUrl.startsWith('data:image/')) {
          try {
            const res = await fetch(currentWallpaper.imageUrl);
            const blob = await res.blob();
            const file = new File([blob], 'vibepaper.png', { type: blob.type || 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              sharedFile = file;
            }
          } catch (e) {
            console.warn('Could not prepare image file for sharing:', e);
          }
        }

        if (sharedFile) {
          await navigator.share({
            title,
            text,
            files: [sharedFile],
          });
        } else {
          await navigator.share({
            title,
            text: `${text}\n${url}`,
            url,
          });
        }

        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Share error, falling back to clipboard:', err);
          fallbackCopyToClipboard();
        }
      }
    } else {
      fallbackCopyToClipboard();
    }
  };

  const handleAnimateVideo = async () => {
    setIsAnimatingVideo(true);
    setVideoError(null);
    try {
      const response = await fetch('/api/animate-wallpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentWallpaper.prompt,
          imageUrl: currentWallpaper.imageUrl,
          aspectRatio: currentWallpaper.aspectRatio === '16:9' ? '16:9' : '9:16',
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to animate wallpaper into video');
      }
      setLiveVideoUrl(data.videoUrl);
    } catch (err: any) {
      console.error('Animation error:', err);
      setVideoError(err.message || 'Video generation failed');
    } finally {
      setIsAnimatingVideo(false);
    }
  };

  const handleGenerateMusic = async () => {
    setIsGeneratingMusic(true);
    try {
      const response = await fetch('/api/generate-ambient-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentWallpaper.prompt }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate ambient soundtrack');
      }
      setMusicUrl(data.audioUrl);
      setIsPlayingMusic(true);
    } catch (err: any) {
      console.error('Music error:', err);
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = currentWallpaper.imageUrl;
      const sanitized = currentWallpaper.prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 30);
      link.download = `vibepaper-${sanitized}-var${currentWallpaper.variationIndex || currentIndex + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = (currentIndex - 1 + wallpapers.length) % wallpapers.length;
    onSelectIndex(prev);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = (currentIndex + 1) % wallpapers.length;
    onSelectIndex(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center select-none overflow-hidden animate-fade-in">
      {/* Top Header Floating Bar */}
      <div className="absolute top-4 inset-x-4 max-w-xl mx-auto z-40 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center space-x-2 bg-neutral-900/80 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full shadow-lg">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
          <span className="text-xs font-semibold text-white tracking-wide">
            Variation {currentWallpaper.variationIndex || currentIndex + 1} of {wallpapers.length}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono px-1.5 py-0.5 rounded bg-white/10">
            {currentWallpaper.aspectRatio}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono px-1.5 py-0.5 rounded bg-white/10">
            {currentWallpaper.imageSize || '2K'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Favorite Toggle Button */}
          {(() => {
            const isFav = favoriteIds ? favoriteIds.has(currentWallpaper.id) : !!currentWallpaper.isFavorite;
            return (
              <button
                onClick={() => onToggleFavorite?.(currentWallpaper)}
                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isFav
                    ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-500/25'
                    : 'bg-neutral-900/80 text-neutral-300 border-white/10 hover:bg-neutral-800 hover:text-rose-400'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{isFav ? 'Saved' : 'Favorite'}</span>
              </button>
            );
          })()}

          {/* Toggle Lock Screen Simulation */}
          <button
            onClick={() => setShowLockScreen(!showLockScreen)}
            title="Toggle Lock Screen simulation"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              showLockScreen
                ? 'bg-violet-600/90 text-white border-violet-400 shadow-lg shadow-violet-500/25'
                : 'bg-neutral-900/80 text-neutral-300 border-white/10 hover:bg-neutral-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock Screen</span>
          </button>

          {/* Share Button (Web Share API) */}
          <button
            onClick={handleShare}
            title={shareSuccess ? 'Shared / Copied to clipboard!' : 'Share wallpaper'}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              shareSuccess
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-500/25'
                : 'bg-neutral-900/80 text-neutral-300 border-white/10 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            {shareSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Shared!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-violet-400" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            aria-label="Close fullscreen view"
            className="w-8 h-8 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/15 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Wallpaper Canvas Viewport */}
      <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-6">
        {/* Phone Mockup Frame Container */}
        <div
          className={`relative max-h-[88vh] max-w-[92vw] overflow-hidden rounded-[36px] shadow-2xl border border-white/10 bg-neutral-950 flex items-center justify-center transition-all ${
            currentWallpaper.aspectRatio === '9:16'
              ? 'aspect-[9/16] w-full max-w-[400px]'
              : currentWallpaper.aspectRatio === '1:1'
              ? 'aspect-square w-full max-w-[500px]'
              : currentWallpaper.aspectRatio === '16:9'
              ? 'aspect-[16/9] w-full max-w-[700px]'
              : 'aspect-[9/16] w-full max-w-[420px]'
          }`}
        >
          {/* Ambient Glow */}
          <img
            src={currentWallpaper.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-110 pointer-events-none"
          />

          {/* High-Resolution Wallpaper */}
          <img
            src={currentWallpaper.imageUrl}
            alt={currentWallpaper.prompt}
            className="relative z-10 w-full h-full object-cover transition-transform duration-300"
          />

          {/* Optional Phone Lock Screen Simulation Overlay */}
          {showLockScreen && !liveVideoUrl && (
            <LockScreenOverlay prompt={currentWallpaper.prompt} />
          )}

          {/* If Live Video is active, show video layer */}
          {liveVideoUrl && (
            <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center">
              <video
                src={liveVideoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 z-40 flex items-center space-x-2">
                <span className="text-[10px] bg-red-600/90 text-white font-mono px-2 py-0.5 rounded-full animate-pulse">
                  LIVE MOTION
                </span>
                <button
                  onClick={() => setLiveVideoUrl(null)}
                  className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Previous Variation Chevron */}
        {hasMultiple && (
          <button
            onClick={handlePrev}
            aria-label="Previous variation"
            className="absolute left-2 sm:left-8 z-40 w-11 h-11 rounded-full bg-neutral-900/70 hover:bg-neutral-800/90 border border-white/15 flex items-center justify-center text-white backdrop-blur-md shadow-xl transition-transform active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Variation Chevron */}
        {hasMultiple && (
          <button
            onClick={handleNext}
            aria-label="Next variation"
            className="absolute right-2 sm:right-8 z-40 w-11 h-11 rounded-full bg-neutral-900/70 hover:bg-neutral-800/90 border border-white/15 flex items-center justify-center text-white backdrop-blur-md shadow-xl transition-transform active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Ambient Audio Player if active */}
      {musicUrl && (
        <audio
          ref={audioRef}
          src={musicUrl}
          autoPlay
          loop
          onPlay={() => setIsPlayingMusic(true)}
          onPause={() => setIsPlayingMusic(false)}
        />
      )}

      {/* Bottom Action Dock with Download, Remix, Animate Video & 3D Buttons */}
      <div className="absolute bottom-4 inset-x-4 max-w-lg mx-auto z-40 pointer-events-auto space-y-2">
        {/* Multimodal Quick Tools Row */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {/* Animate to Live Video Wallpaper (gemini-omni-1.2-flash) */}
          <button
            onClick={handleAnimateVideo}
            disabled={isAnimatingVideo}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all shadow-md active:scale-95"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnimatingVideo ? 'animate-spin' : ''}`} />
            <span>{isAnimatingVideo ? 'Synthesizing Video...' : 'Live Motion Video (Omni Flash)'}</span>
          </button>

          {/* Generate Ambient Soundtrack (lyria-3-clip-preview) */}
          <button
            onClick={handleGenerateMusic}
            disabled={isGeneratingMusic}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-medium transition-all shadow-md active:scale-95"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingMusic ? 'animate-spin' : ''}`} />
            <span>{isGeneratingMusic ? 'Composing Track...' : isPlayingMusic ? 'Ambient Track Playing 🎵' : 'Vibe Audio (Lyria)'}</span>
          </button>

          {/* 3D Phone Studio (Three.js) */}
          {onOpen3DStudio && (
            <button
              onClick={() => onOpen3DStudio(currentWallpaper)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-violet-500/30 text-violet-300 text-xs font-medium transition-all shadow-md active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>3D Studio (Three.js)</span>
            </button>
          )}
        </div>

        {/* Primary Action Buttons: Favorite, Download & Remix */}
        <div className="bg-neutral-950/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-2.5 sm:p-3 shadow-2xl flex items-center justify-between gap-2.5">
          {/* Favorite Toggle Button */}
          {(() => {
            const isFav = favoriteIds ? favoriteIds.has(currentWallpaper.id) : !!currentWallpaper.isFavorite;
            return (
              <button
                onClick={() => onToggleFavorite?.(currentWallpaper)}
                title={isFav ? 'Remove from favorites' : 'Save to favorites'}
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                  isFav
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/30'
                    : 'bg-neutral-800/90 hover:bg-neutral-700/90 border-white/10 text-neutral-300 hover:text-rose-400'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
              </button>
            );
          })()}

          {/* Share Button (Web Share API) */}
          <button
            onClick={handleShare}
            title={shareSuccess ? 'Shared / Copied to clipboard!' : 'Share wallpaper'}
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all active:scale-95 shrink-0 ${
              shareSuccess
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30'
                : 'bg-neutral-800/90 hover:bg-neutral-700/90 border-white/10 text-neutral-300 hover:text-white'
            }`}
          >
            {shareSuccess ? (
              <Check className="w-5 h-5 text-white animate-bounce" />
            ) : (
              <Share2 className="w-5 h-5 text-violet-400" />
            )}
          </button>

          {/* Remix Button - Uses this image as reference for next batch */}
          <button
            onClick={() => onRemix(currentWallpaper)}
            className="flex-1 flex items-center justify-center space-x-2 py-2.5 sm:py-3 px-3 rounded-2xl bg-neutral-800/90 hover:bg-neutral-700/90 border border-white/10 text-white font-medium text-xs sm:text-sm transition-all active:scale-[0.98] group"
          >
            <Sparkles className="w-4 h-4 text-violet-400 group-hover:rotate-12 transition-transform" />
            <span>Remix Vibe</span>
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 sm:py-3 px-3 rounded-2xl font-semibold text-xs sm:text-sm transition-all shadow-lg active:scale-[0.98] ${
              downloadSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-600/30'
            }`}
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4 animate-bounce" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download</span>
              </>
            )}
          </button>
        </div>

        {/* Wallpaper Prompt Preview Line */}
        <p className="text-center text-[10px] text-white/50 truncate font-mono px-4">
          "{currentWallpaper.prompt}"
        </p>
      </div>
    </div>
  );
};

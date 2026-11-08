import React from 'react';
import { Sparkles, Layers, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Wallpaper, AspectRatio } from '../types.ts';
import { WallpaperCard } from './WallpaperCard.tsx';

interface BatchGridProps {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  aspectRatio: AspectRatio;
  onOpenFullscreen: (index: number) => void;
  onRemix: (wallpaper: Wallpaper) => void;
  currentPrompt?: string;
}

export const BatchGrid: React.FC<BatchGridProps> = ({
  wallpapers,
  isLoading,
  aspectRatio,
  onOpenFullscreen,
  onRemix,
  currentPrompt,
}) => {
  // If loading, show 4 animated placeholder cards
  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Synthesizing 4 Wallpaper Variations...
            </h2>
          </div>
          <span className="text-xs text-neutral-400 font-mono">Aspect: {aspectRatio}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((num) => (
            <div
              key={num}
              style={{
                aspectRatio:
                  aspectRatio === '9:16'
                    ? '9 / 16'
                    : aspectRatio === '1:1'
                    ? '1 / 1'
                    : aspectRatio === '16:9'
                    ? '16 / 9'
                    : '9 / 16',
              }}
              className="relative rounded-3xl bg-neutral-900/80 border border-white/5 overflow-hidden flex flex-col items-center justify-center p-4 text-center"
            >
              {/* Shimmer gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-10 h-10 rounded-2xl bg-neutral-800/80 flex items-center justify-center text-violet-400 mb-2 border border-white/5">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <span className="text-xs font-semibold text-neutral-300">
                  Variation #{num}
                </span>
                <span className="text-[10px] text-neutral-500 mt-1">
                  Applying atmospheric lighting...
                </span>
              </div>

              {/* Progress bar line at bottom */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-violet-600/30 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-[progress_1.8s_ease-in-out_infinite]"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If no wallpapers yet, show an empty state card with guidance
  if (!wallpapers || wallpapers.length === 0) {
    return (
      <div className="w-full py-12 px-4 rounded-3xl bg-neutral-900/40 border border-white/5 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600/20 to-fuchsia-600/20 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 shadow-inner">
          <ImageIcon className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-white">No Wallpapers Generated Yet</h3>
        <p className="text-xs text-neutral-400 max-w-xs mt-1 leading-relaxed">
          Describe your vibe above (e.g., "rainy cyberpunk lo-fi") to generate 4 unique phone wallpaper variations.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Batch Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">
            4 Variations Ready
          </h2>
        </div>
        <span className="text-xs text-neutral-400 font-mono">
          Tap any image for Full Screen
        </span>
      </div>

      {/* 2x2 Grid of Variations */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {wallpapers.map((wallpaper, idx) => (
          <WallpaperCard
            key={wallpaper.id || idx}
            wallpaper={wallpaper}
            index={idx}
            onOpenFullscreen={onOpenFullscreen}
            onRemix={onRemix}
          />
        ))}
      </div>
    </div>
  );
};

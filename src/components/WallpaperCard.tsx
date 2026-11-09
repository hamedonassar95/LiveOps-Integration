import React from 'react';
import { Maximize2, Download, Sparkles, Smartphone, Heart } from 'lucide-react';
import { Wallpaper } from '../types.ts';

interface WallpaperCardProps {
  wallpaper: Wallpaper;
  index: number;
  isFavorite?: boolean;
  onOpenFullscreen: (index: number) => void;
  onRemix: (wallpaper: Wallpaper) => void;
  onToggleFavorite?: (wallpaper: Wallpaper) => void;
}

export const WallpaperCard: React.FC<WallpaperCardProps> = ({
  wallpaper,
  index,
  isFavorite = false,
  onOpenFullscreen,
  onRemix,
  onToggleFavorite,
}) => {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = wallpaper.imageUrl;
    const sanitized = wallpaper.prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30);
    link.download = `vibepaper-${sanitized}-var${wallpaper.variationIndex || index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemixClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemix(wallpaper);
  };

  return (
    <div
      onClick={() => onOpenFullscreen(index)}
      className="group relative cursor-pointer overflow-hidden rounded-3xl bg-neutral-900 border border-white/10 hover:border-violet-500/50 shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-violet-600/10 hover:-translate-y-1 active:scale-[0.98]"
      style={{
        aspectRatio:
          wallpaper.aspectRatio === '9:16'
            ? '9 / 16'
            : wallpaper.aspectRatio === '1:1'
            ? '1 / 1'
            : wallpaper.aspectRatio === '16:9'
            ? '16 / 9'
            : wallpaper.aspectRatio === '3:4'
            ? '3 / 4'
            : wallpaper.aspectRatio === '4:3'
            ? '4 / 3'
            : wallpaper.aspectRatio === '2:3'
            ? '2 / 3'
            : wallpaper.aspectRatio === '3:2'
            ? '3 / 2'
            : '9 / 16',
      }}
    >
      {/* Background Wallpaper Image */}
      <img
        src={wallpaper.imageUrl}
        alt={wallpaper.prompt}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Subtle Gradient Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40 opacity-80 group-hover:opacity-60 transition-opacity pointer-events-none" />

      {/* Top Left Badge: Variation # */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-1.5 bg-black/50 backdrop-blur-md border border-white/15 px-2.5 py-1 rounded-full text-white text-[11px] font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
        <span>Var #{wallpaper.variationIndex || index + 1}</span>
      </div>

      {/* Top Right: Heart/Favorite & Resolution */}
      <div className="absolute top-3 right-3 z-20 flex items-center space-x-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(wallpaper);
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-90 shadow-md ${
            isFavorite
              ? 'bg-rose-600/90 text-white border-rose-400 shadow-rose-500/30'
              : 'bg-black/50 hover:bg-black/80 text-white/70 hover:text-rose-400 border-white/15'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 transition-transform ${isFavorite ? 'fill-current scale-110 text-white' : ''}`} />
        </button>
        <div className="flex items-center space-x-1 bg-black/50 backdrop-blur-md border border-white/15 px-2 py-0.5 rounded-md text-[10px] font-mono text-neutral-300">
          <span>{wallpaper.imageSize || '2K'}</span>
        </div>
      </div>

      {/* Center Tap to Preview Indicator on Hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <div className="bg-black/60 backdrop-blur-md border border-white/20 text-white rounded-full p-3 shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
          <Maximize2 className="w-5 h-5 text-violet-300" />
        </div>
      </div>

      {/* Bottom Information & Quick Action Buttons */}
      <div className="absolute bottom-0 inset-x-0 p-3 z-20 flex items-end justify-between">
        <div className="text-left max-w-[60%]">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-violet-300 block">
            Tap to fullscreen
          </span>
          <p className="text-xs text-white/90 font-medium truncate drop-shadow">
            {wallpaper.prompt}
          </p>
        </div>

        {/* Quick Action Icons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(wallpaper);
            }}
            title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            className={`w-8 h-8 rounded-full border flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-md ${
              isFavorite
                ? 'bg-rose-600 text-white border-rose-400 shadow-rose-500/30'
                : 'bg-neutral-900/80 hover:bg-neutral-800 border-white/20 text-white hover:text-rose-400'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleRemixClick}
            title="Remix from this wallpaper"
            className="w-8 h-8 rounded-full bg-neutral-900/80 hover:bg-violet-600/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDownload}
            title="Download wallpaper"
            className="w-8 h-8 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

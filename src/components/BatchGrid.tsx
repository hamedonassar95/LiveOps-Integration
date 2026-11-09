import React, { useState } from 'react';
import { Sparkles, Layers, Image as ImageIcon, Loader2, Archive, Check } from 'lucide-react';
import JSZip from 'jszip';
import { Wallpaper, AspectRatio } from '../types.ts';
import { WallpaperCard } from './WallpaperCard.tsx';

interface BatchGridProps {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  aspectRatio: AspectRatio;
  onOpenFullscreen: (index: number) => void;
  onRemix: (wallpaper: Wallpaper) => void;
  currentPrompt?: string;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (wallpaper: Wallpaper) => void;
}

export const BatchGrid: React.FC<BatchGridProps> = ({
  wallpapers,
  isLoading,
  aspectRatio,
  onOpenFullscreen,
  onRemix,
  currentPrompt,
  favoriteIds,
  onToggleFavorite,
}) => {
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipSuccess, setZipSuccess] = useState<boolean>(false);

  const handleDownloadAllZip = async () => {
    if (!wallpapers || wallpapers.length === 0 || isZipping) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      const folderName = `vibepaper-${(currentPrompt || 'wallpapers')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 30)}`;
      const folder = zip.folder(folderName) || zip;

      // Add each wallpaper image to the ZIP
      for (let i = 0; i < wallpapers.length; i++) {
        const wp = wallpapers[i];
        const filename = `variation-${wp.variationIndex || i + 1}.png`;

        if (wp.imageUrl.startsWith('data:')) {
          // Extract base64
          const base64Data = wp.imageUrl.split(',')[1];
          folder.file(filename, base64Data, { base64: true });
        } else {
          // Fetch remote image
          const resp = await fetch(wp.imageUrl);
          const blob = await resp.blob();
          folder.file(filename, blob);
        }
      }

      // Add info metadata file
      const infoText = `VibePaper - AI Phone Wallpaper Studio
Prompt: ${currentPrompt || 'Wallpapers'}
Total Variations: ${wallpapers.length}
Aspect Ratio: ${aspectRatio}
Generated: ${new Date().toLocaleString()}
`;
      folder.file('vibe-info.txt', infoText);

      // Generate compressed zip
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      // Trigger download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${folderName}-batch.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to create ZIP:', err);
    } finally {
      setIsZipping(false);
    }
  };
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

        {/* Download All as ZIP button */}
        <button
          onClick={handleDownloadAllZip}
          disabled={isZipping}
          title="Download all 4 wallpapers as a compressed ZIP file"
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-md active:scale-95 ${
            zipSuccess
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/25'
              : 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 hover:from-violet-600/50 hover:to-fuchsia-600/50 text-violet-200 border-violet-500/40'
          }`}
        >
          {isZipping ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Zipping (0/4)...</span>
            </>
          ) : zipSuccess ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Downloaded ZIP!</span>
            </>
          ) : (
            <>
              <Archive className="w-3.5 h-3.5 text-violet-300" />
              <span>Download All (ZIP)</span>
            </>
          )}
        </button>
      </div>

      {/* 2x2 Grid of Variations */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {wallpapers.map((wallpaper, idx) => (
          <WallpaperCard
            key={wallpaper.id || idx}
            wallpaper={wallpaper}
            index={idx}
            isFavorite={favoriteIds ? favoriteIds.has(wallpaper.id) : !!wallpaper.isFavorite}
            onOpenFullscreen={onOpenFullscreen}
            onRemix={onRemix}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>

      {/* Prominent Download All Button at the bottom of the BatchGrid */}
      <div className="pt-2 pb-1 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-violet-950/40 via-neutral-900/60 to-fuchsia-950/40 border border-violet-500/20 backdrop-blur-xl shadow-lg">
        <div className="flex items-center space-x-2.5 text-left">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
            <Archive className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Full Batch Package</h4>
            <p className="text-[11px] text-neutral-400">
              Zip all {wallpapers.length} generated wallpapers ({aspectRatio}) with prompt info into one file
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadAllZip}
          disabled={isZipping}
          type="button"
          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 shrink-0 ${
            zipSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-500/30 border border-emerald-400'
              : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-600/30 hover:shadow-violet-600/50 border border-white/10'
          }`}
        >
          {isZipping ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Compressing ZIP...</span>
            </>
          ) : zipSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Downloaded ZIP!</span>
            </>
          ) : (
            <>
              <Archive className="w-4 h-4" />
              <span>Download All (ZIP)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};


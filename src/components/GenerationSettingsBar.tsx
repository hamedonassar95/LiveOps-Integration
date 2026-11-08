import React, { useState } from 'react';
import {
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Zap,
  Check,
  Smartphone,
  Square,
  Tv,
} from 'lucide-react';
import { AspectRatio, ImageSize, GenerationSettings } from '../types.ts';

interface GenerationSettingsBarProps {
  settings: GenerationSettings;
  onChange: (newSettings: GenerationSettings) => void;
  disabled?: boolean;
}

const ASPECT_RATIOS: { value: AspectRatio; label: string; iconDesc: string; popular?: boolean }[] = [
  { value: '9:16', label: '9:16 (Phone)', iconDesc: 'Vertical phone wallpaper', popular: true },
  { value: '1:1', label: '1:1 (Square)', iconDesc: 'Avatar or Instagram square' },
  { value: '2:3', label: '2:3 (Portrait)', iconDesc: 'Classic vertical photo' },
  { value: '3:4', label: '3:4 (Portrait)', iconDesc: 'Tablet & iPad portrait' },
  { value: '4:3', label: '4:3 (Classic)', iconDesc: 'Tablet landscape' },
  { value: '3:2', label: '3:2 (Landscape)', iconDesc: 'Standard landscape' },
  { value: '16:9', label: '16:9 (Desktop)', iconDesc: 'PC monitor & TV display' },
  { value: '21:9', label: '21:9 (Ultrawide)', iconDesc: 'Cinematic widescreen' },
];

const IMAGE_SIZES: { value: ImageSize; label: string; desc: string }[] = [
  { value: '1K', label: '1K', desc: 'Standard HD (Fastest)' },
  { value: '2K', label: '2K', desc: 'Quad HD (Crisp & Balanced)' },
  { value: '4K', label: '4K', desc: 'Ultra HD (Maximum Detail)' },
];

const MODELS: {
  value: 'gemini-3-pro-image-preview' | 'gemini-nano-banana-2.1';
  label: string;
  badge: string;
  desc: string;
}[] = [
  {
    value: 'gemini-3-pro-image-preview',
    label: 'Gemini 3 Pro Studio',
    badge: 'Studio Quality',
    desc: 'Deepest atmospheric lighting, texture, and fidelity',
  },
  {
    value: 'gemini-nano-banana-2.1',
    label: 'Nano Banana 2.1',
    badge: 'High-Res',
    desc: 'High quality images with broad aspect ratio range',
  },
];

export const GenerationSettingsBar: React.FC<GenerationSettingsBarProps> = ({
  settings,
  onChange,
  disabled,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className="w-full bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-lg transition-all">
      {/* Quick Summary / Toggle Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Ratio badge */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700/80 border border-white/10 text-xs font-medium text-white transition-colors"
          >
            <Smartphone className="w-3 h-3 text-violet-400" />
            <span>Ratio: {settings.aspectRatio}</span>
          </button>

          {/* Size badge */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700/80 border border-white/10 text-xs font-medium text-white transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Res: {settings.imageSize}</span>
          </button>

          {/* Model badge */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={disabled}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-950/40 border border-violet-500/20 text-xs font-medium text-violet-300"
          >
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span className="truncate max-w-[150px]">
              {settings.model === 'gemini-3-pro-image-preview' ? 'Studio Pro' : 'Nano Banana 2.1'}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={disabled}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white px-2 py-1 rounded-md transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{isExpanded ? 'Hide' : 'Configure'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Expanded Controls Drawer */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-white/10 space-y-4 animate-fade-in text-left">
          {/* Aspect Ratio Selector (Feature: 1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                <span>Aspect Ratio</span>
                <span className="text-[10px] text-violet-400 font-normal">
                  (Default 9:16 for Phone Wallpaper)
                </span>
              </label>
              <span className="text-[11px] font-mono text-neutral-400">
                {settings.aspectRatio}
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {ASPECT_RATIOS.map((item) => {
                const isSelected = settings.aspectRatio === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...settings, aspectRatio: item.value })}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-violet-600/30 text-white border-violet-500 shadow-md shadow-violet-500/20'
                        : 'bg-neutral-800/60 hover:bg-neutral-700/60 text-neutral-300 border-white/5'
                    }`}
                  >
                    <span className="text-xs font-bold">{item.value}</span>
                    <span className="text-[9px] text-neutral-400 truncate w-full">
                      {item.value === '9:16' ? 'Phone' : item.value === '1:1' ? 'Square' : item.value === '16:9' ? 'Wide' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image Size Selector (Feature: 1K, 2K, 4K) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                <span>Image Resolution</span>
                <span className="text-[10px] text-emerald-400 font-normal">
                  (High-Definition Wallpapers)
                </span>
              </label>
              <span className="text-[11px] font-mono text-neutral-400">
                {settings.imageSize}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {IMAGE_SIZES.map((size) => {
                const isSelected = settings.imageSize === size.value;
                return (
                  <button
                    key={size.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...settings, imageSize: size.value })}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-md shadow-emerald-500/15'
                        : 'bg-neutral-800/60 hover:bg-neutral-700/60 text-neutral-300 border-white/5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{size.value}</span>
                        {size.value === '2K' && (
                          <span className="text-[9px] font-medium px-1 rounded bg-emerald-500/20 text-emerald-300">
                            Sweet Spot
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate">{size.desc}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Selector (Feature: gemini-3-pro-image-preview vs gemini-nano-banana-2.1) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                <span>AI Generation Model</span>
              </label>
              <span className="text-[10px] text-violet-400 font-mono">
                {settings.model}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MODELS.map((model) => {
                const isSelected = settings.model === model.value;
                return (
                  <button
                    key={model.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...settings, model: model.value })}
                    className={`flex items-start justify-between p-2.5 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-violet-950/40 border-violet-500/60 text-white shadow-md shadow-violet-500/15'
                        : 'bg-neutral-800/60 hover:bg-neutral-700/60 text-neutral-300 border-white/5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white">{model.label}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
                          {model.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">{model.desc}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

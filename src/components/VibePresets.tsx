import React from 'react';
import { Sparkles, Dice5 } from 'lucide-react';

interface VibePresetsProps {
  onSelectVibe: (vibe: string) => void;
  currentVibe: string;
}

export const VIBE_CATEGORIES = [
  {
    category: 'Aesthetic',
    vibes: [
      { label: '🌧️ Rainy Cyberpunk Lo-Fi', prompt: 'rainy cyberpunk lo-fi street with neon reflections on wet asphalt, moody purple and cyan glow' },
      { label: '🌸 Dreamy Anime Sunset', prompt: 'dreamy anime pastel sunset clouds over a quiet hill, cinematic ethereal light, Makoto Shinkai style' },
      { label: '🌿 Moody Dark Botanical', prompt: 'moody dark botanical foliage, emerald monstera leaves with glistening dew drops and soft moody shadows' },
      { label: '🌌 Cosmic Nebula Horizon', prompt: 'deep space celestial nebula horizon, iridescent violet star dust and glowing distant constellations' },
      { label: '☕ Cozy Autumn Cafe', prompt: 'warm cozy autumn coffee shop window on a rainy afternoon, warm amber lighting, books and steaming mug' },
      { label: '🏎️ Neon Synthwave', prompt: 'retro synthwave highway stretching toward a wireframe digital sunset, chrome aesthetic, 80s outrun vibe' },
      { label: '🧊 Frosted Glass 3D', prompt: 'futuristic frosted glass morphism abstract sculpture, iridescent translucent pastel gradients in soft studio light' },
      { label: '🏯 Kyoto Cherry Snow', prompt: 'traditional Kyoto pagoda temple garden dusted in fresh winter snow, soft lantern light at twilight' },
      { label: '🏜️ Dune Minimal Horizon', prompt: 'minimalist cinematic desert sand dunes under a giant twilight moon, clean sweeping curves and warm terracotta tones' },
      { label: '✨ Mystical Fantasy Forest', prompt: 'enchanted mystical forest with bioluminescent glowing mushrooms and floating fireflies at dusk' },
    ],
  },
];

export const VibePresets: React.FC<VibePresetsProps> = ({ onSelectVibe, currentVibe }) => {
  const handleRandomize = () => {
    const all = VIBE_CATEGORIES.flatMap((c) => c.vibes);
    const randomItem = all[Math.floor(Math.random() * all.length)];
    onSelectVibe(randomItem.prompt);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          Popular Aesthetics
        </span>
        <button
          onClick={handleRandomize}
          type="button"
          className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-violet-950/40 transition-colors"
        >
          <Dice5 className="w-3.5 h-3.5" />
          Surprise Vibe
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {VIBE_CATEGORIES[0].vibes.map((item) => {
          const isSelected = currentVibe === item.prompt;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectVibe(item.prompt)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
                isSelected
                  ? 'bg-violet-600/30 text-violet-200 border-violet-500/60 shadow-sm shadow-violet-500/20'
                  : 'bg-neutral-900/70 hover:bg-neutral-800 text-neutral-300 border-white/5 hover:border-white/15'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

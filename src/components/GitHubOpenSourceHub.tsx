import React, { useState } from 'react';
import {
  GitBranch,
  Github,
  Copy,
  Check,
  Download,
  BookOpen,
  Terminal,
  Sparkles,
  ExternalLink,
  Code2,
  Share2,
  FileJson,
  X,
  Layers,
} from 'lucide-react';
import JSZip from 'jszip';
import { Wallpaper, AspectRatio, ImageSize } from '../types.ts';

export interface OpenSourceTemplate {
  id: string;
  title: string;
  description: string;
  author: string;
  stars: number;
  tags: string[];
  vibePrompt: string;
  recommendedAspect: AspectRatio;
  recommendedResolution: ImageSize;
}

const CURATED_COMMUNITY_TEMPLATES: OpenSourceTemplate[] = [
  {
    id: 'tokyo-cyber-mist',
    title: 'Neo-Tokyo Cyber Mist',
    description: 'Bioluminescent neon rain reflections on futuristic asphalt with atmospheric depth',
    author: 'alex-creative',
    stars: 342,
    tags: ['Cyberpunk', 'Moody', 'Reflections'],
    vibePrompt: 'rainy cyberpunk lo-fi neon alley in Neo Tokyo, vivid cyan and magenta puddles, hyper-detailed reflections, 8k cinematic lighting',
    recommendedAspect: '9:16',
    recommendedResolution: '4K',
  },
  {
    id: 'lofi-tokyo-bistro',
    title: 'Midnight Lo-Fi Bistro',
    description: 'Cozy anime-styled coffee house with warm tungsten light and soft watercolor textures',
    author: 'manga-vibes',
    stars: 289,
    tags: ['Anime', 'Cozy', 'Pastel'],
    vibePrompt: 'cozy anime lo-fi midnight coffee shop window, gentle warm tungsten lighting, steaming ceramic mug, soft purple evening sky',
    recommendedAspect: '9:16',
    recommendedResolution: '2K',
  },
  {
    id: 'deep-space-aurora',
    title: 'Nebula Genesis & Deep Cosmos',
    description: 'Stellar clouds swirling with spectral dust and luminous orbital rings',
    author: 'astro-design',
    stars: 512,
    tags: ['Cosmic', 'Minimalist', 'Stars'],
    vibePrompt: 'ethereal cosmic nebula with vibrant violet and gold stardust, glowing planetary horizon, sleek minimalist depth, dark matte background',
    recommendedAspect: '9:16',
    recommendedResolution: '4K',
  },
  {
    id: 'synthwave-sunset-84',
    title: 'Outrun Synthwave 1984',
    description: 'Retro wireframe neon grid stretching toward an oversized chrome sun',
    author: 'grid-runner',
    stars: 421,
    tags: ['Synthwave', 'Retro', 'Grid'],
    vibePrompt: 'outrun 80s synthwave perspective wireframe grid, giant glowing retro sun, chrome palm tree silhouettes, laser pink and cobalt blue haze',
    recommendedAspect: '9:16',
    recommendedResolution: '2K',
  },
  {
    id: 'bioluminescent-flora',
    title: 'Abyssal Bioluminescent Flora',
    description: 'Alien plant life emitting soft bioluminescent spores in a pitch-black sanctuary',
    author: 'nature-synth',
    stars: 198,
    tags: ['Organic', 'Bio-Tech', 'Dark'],
    vibePrompt: 'deep jungle bioluminescent flora, glowing emerald and aquamarine spores, macro botanical textures, dark obsidian backdrop',
    recommendedAspect: '9:16',
    recommendedResolution: '4K',
  },
  {
    id: 'matte-architectural-brutalism',
    title: 'Monolithic Architectural Shadows',
    description: 'Sharp concrete angles with dramatic natural sun geometry and negative space',
    author: 'brutalist-space',
    stars: 176,
    tags: ['Architecture', 'Minimal', 'Monochrome'],
    vibePrompt: 'monolithic brutalist architectural concrete tower with geometric diagonal sunlight and deep shadows, minimalist architectural photography',
    recommendedAspect: '9:16',
    recommendedResolution: '2K',
  },
];

interface GitHubOpenSourceHubProps {
  isOpen: boolean;
  onClose: () => void;
  currentBatch: Wallpaper[];
  currentPrompt: string;
  onApplyTemplate: (template: OpenSourceTemplate) => void;
}

export const GitHubOpenSourceHub: React.FC<GitHubOpenSourceHubProps> = ({
  isOpen,
  onClose,
  currentBatch,
  currentPrompt,
  onApplyTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'templates' | 'export'>('templates');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExportingDataset, setIsExportingDataset] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportDatasetJSON = () => {
    const dataset = {
      project: 'VibePaper - AI Phone Wallpaper Studio',
      repository: 'https://github.com/open-vibepaper/vibepaper',
      license: 'MIT',
      exportedAt: new Date().toISOString(),
      prompt: currentPrompt,
      wallpapers: currentBatch.map((wp, index) => ({
        id: wp.id,
        variation: wp.variationIndex || index + 1,
        prompt: wp.prompt,
        aspectRatio: wp.aspectRatio,
        imageSize: wp.imageSize,
        model: wp.model,
        createdAt: wp.createdAt,
        imageUrl: wp.imageUrl.startsWith('data:') ? '[Embedded Base64 PNG]' : wp.imageUrl,
      })),
    };

    const blob = new Blob([JSON.stringify(dataset, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibepaper-dataset-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportFullGitRepo = async () => {
    setIsExportingDataset(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('vibepaper-open-source') || zip;

      // Add README.md
      const readme = `# VibePaper - AI Phone Wallpaper Studio
Open-source mobile-first AI phone wallpaper generator with 9:16 aspect ratios, 1K/2K/4K resolution, 3D studio, and video motion.

## 🚀 Quickstart & Clone

\`\`\`bash
# 1. Clone this repository
git clone https://github.com/open-source/vibepaper.git

# 2. Enter directory and install dependencies
cd vibepaper
npm install

# 3. Configure your Gemini API Key
export GEMINI_API_KEY="your-gemini-api-key"

# 4. Launch full-stack development server
npm run dev
\`\`\`

## 📦 Exported Batch Details
- **Current Prompt**: ${currentPrompt || 'Default Vibe'}
- **Variations Generated**: ${currentBatch.length}
- **Export Date**: ${new Date().toLocaleString()}

## 📄 License
MIT License - Free for personal and commercial open-source modification.
`;
      folder.file('README.md', readme);

      // Add package.json schema
      const packageJson = {
        name: 'vibepaper-studio',
        version: '1.2.0',
        private: true,
        type: 'module',
        scripts: {
          dev: 'tsx server.ts',
          build: 'vite build',
          lint: 'tsc --noEmit',
        },
        dependencies: {
          react: '^19.0.0',
          'react-dom': '^19.0.0',
          '@google/genai': '^0.1.2',
          three: '^0.170.0',
          jszip: '^3.10.1',
          'lucide-react': '^1.16.0',
        },
      };
      folder.file('package.json', JSON.stringify(packageJson, null, 2));

      // Add wallpapers dataset & image files
      const assetsFolder = folder.folder('wallpapers') || folder;
      for (let i = 0; i < currentBatch.length; i++) {
        const wp = currentBatch[i];
        const filename = `wallpaper-var-${wp.variationIndex || i + 1}.png`;
        if (wp.imageUrl.startsWith('data:')) {
          const base64 = wp.imageUrl.split(',')[1];
          assetsFolder.file(filename, base64, { base64: true });
        } else {
          try {
            const resp = await fetch(wp.imageUrl);
            const blob = await resp.blob();
            assetsFolder.file(filename, blob);
          } catch {
            // fallback text
            assetsFolder.file(`${filename}.txt`, wp.imageUrl);
          }
        }
      }

      // Generate zip
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibepaper-github-repo-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export GitHub repo zip:', err);
    } finally {
      setIsExportingDataset(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in text-left">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-neutral-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-neutral-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>GitHub & Open Source Hub</span>
                <span className="text-[10px] font-mono font-normal text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                  MIT
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Clone, share prompt templates, and publish batches to GitHub
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-5 pt-3 border-b border-white/5 bg-neutral-950/40">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'templates'
                ? 'text-violet-400 border-violet-500 bg-neutral-900/80'
                : 'text-neutral-400 border-transparent hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Community Templates ({CURATED_COMMUNITY_TEMPLATES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('quickstart')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'quickstart'
                ? 'text-violet-400 border-violet-500 bg-neutral-900/80'
                : 'text-neutral-400 border-transparent hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Git Clone & Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'export'
                ? 'text-violet-400 border-violet-500 bg-neutral-900/80'
                : 'text-neutral-400 border-transparent hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to GitHub</span>
          </button>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: COMMUNITY TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-violet-950/30 border border-violet-500/20 text-xs text-neutral-300">
                <span className="font-semibold text-violet-300">Open-Source Recipes: </span>
                Click <strong>"Clone Template"</strong> to copy the prompt formula, resolution, and
                styling into VibePaper and immediately synthesize 4 new variations.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CURATED_COMMUNITY_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-3.5 rounded-2xl bg-neutral-950/60 border border-white/5 hover:border-violet-500/30 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                          {tmpl.title}
                        </h4>
                        <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-mono">
                          ★ {tmpl.stars}
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed mb-2">
                        {tmpl.description}
                      </p>

                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mb-3">
                        <span>@{tmpl.author}</span>
                        <span>·</span>
                        <span>{tmpl.recommendedAspect}</span>
                        <span>·</span>
                        <span className="text-violet-300">{tmpl.recommendedResolution}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1">
                        {tmpl.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onApplyTemplate(tmpl);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold flex items-center space-x-1 shadow-sm active:scale-95 transition-all"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Clone Template</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: GIT CLONE & QUICKSTART */}
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-white mb-1">
                  1. Clone VibePaper to your local terminal
                </h4>
                <div className="relative flex items-center bg-neutral-950 p-3 rounded-xl border border-white/10 font-mono text-xs text-neutral-300">
                  <span className="text-violet-400 mr-2">$</span>
                  <span className="select-all">git clone https://github.com/open-vibepaper/vibepaper.git</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'git clone https://github.com/open-vibepaper/vibepaper.git',
                        'clone'
                      )
                    }
                    className="ml-auto pl-3 text-neutral-400 hover:text-white"
                  >
                    {copiedKey === 'clone' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white mb-1">
                  2. Install dependencies & configure key
                </h4>
                <div className="relative flex items-center bg-neutral-950 p-3 rounded-xl border border-white/10 font-mono text-xs text-neutral-300">
                  <span className="text-violet-400 mr-2">$</span>
                  <span className="select-all">cd vibepaper && npm install && export GEMINI_API_KEY="your-key"</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'cd vibepaper && npm install && export GEMINI_API_KEY="your-key"',
                        'setup'
                      )
                    }
                    className="ml-auto pl-3 text-neutral-400 hover:text-white"
                  >
                    {copiedKey === 'setup' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white mb-1">
                  3. Run full-stack studio server (Dev mode)
                </h4>
                <div className="relative flex items-center bg-neutral-950 p-3 rounded-xl border border-white/10 font-mono text-xs text-neutral-300">
                  <span className="text-violet-400 mr-2">$</span>
                  <span className="select-all">npm run dev</span>
                  <button
                    onClick={() => copyToClipboard('npm run dev', 'run')}
                    className="ml-auto pl-3 text-neutral-400 hover:text-white"
                  >
                    {copiedKey === 'run' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950/40 border border-white/5 text-xs text-neutral-400 space-y-1">
                <p className="font-semibold text-neutral-200">Open-Source Tech Stack:</p>
                <p>• <strong>Frontend:</strong> React 19, TypeScript, Tailwind CSS, Lucide icons</p>
                <p>• <strong>3D Engine:</strong> Three.js PBR procedural viewport</p>
                <p>• <strong>Backend:</strong> Express with Vite dev server middleware</p>
                <p>• <strong>AI Engine:</strong> Google GenAI SDK (@google/genai)</p>
              </div>
            </div>
          )}

          {/* TAB 3: EXPORT TO GITHUB */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-950/60 border border-white/5 space-y-3">
                <div className="flex items-center space-x-2 text-white">
                  <FileJson className="w-4 h-4 text-violet-400" />
                  <h4 className="text-xs font-bold">Export Wallpaper Dataset (JSON)</h4>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Download a structured open-source dataset file containing current prompt metadata,
                  aspect ratios, timestamps, and variation specs to commit to your repository.
                </p>
                <button
                  type="button"
                  onClick={handleExportDatasetJSON}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center space-x-2 transition-colors border border-white/10"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download dataset.json</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-tr from-violet-950/40 via-neutral-950 to-neutral-950 border border-violet-500/20 space-y-3">
                <div className="flex items-center space-x-2 text-white">
                  <Code2 className="w-4 h-4 text-fuchsia-400" />
                  <h4 className="text-xs font-bold">Download Ready-to-Push Git Repo Bundle (ZIP)</h4>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Generates a full starter repository with your current wallpaper variations in{' '}
                  <code className="text-violet-300 font-mono">/wallpapers</code>, a complete{' '}
                  <code className="text-violet-300 font-mono">README.md</code>, and{' '}
                  <code className="text-violet-300 font-mono">package.json</code>.
                </p>
                <button
                  type="button"
                  onClick={handleExportFullGitRepo}
                  disabled={isExportingDataset}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md active:scale-95 ${
                    exportSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white'
                  }`}
                >
                  {isExportingDataset ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Packaging Git Repository...</span>
                    </>
                  ) : exportSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Exported Git Repo!</span>
                    </>
                  ) : (
                    <>
                      <Github className="w-3.5 h-3.5" />
                      <span>Download Git Repo Bundle</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-neutral-950/80 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Licensed under MIT Open Source</span>
          <span className="font-mono text-neutral-400">v1.2.0-opensource</span>
        </div>
      </div>
    </div>
  );
};

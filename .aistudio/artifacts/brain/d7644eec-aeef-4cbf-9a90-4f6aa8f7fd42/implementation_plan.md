# VibePaper Open Source & GitHub Community Hub

Enable users to connect VibePaper with GitHub and open-source ecosystems: exporting generated wallpaper collections with full generation metadata directly to GitHub, copying ready-to-run Git clone and setup recipes, and exploring open-source wallpaper prompt templates from the community.

## User Review & Critical Decisions

> [!IMPORTANT]
> Because you requested open-source development, GitHub integration, and project cloning, this plan establishes a clean, production-grade **Open Source & GitHub Hub** directly inside VibePaper. It provides:
> 1. **Export to GitHub**: Download a pre-structured Git repository package containing the full Vite + React + Express app with wallpapers, configuration files, and `README.md`.
> 2. **One-Click Clone & Quickstart**: Interactive Git commands helper (`git clone`, `npm install`, `npm run dev`) and deployment recipes.
> 3. **Open-Source Template & Prompt Catalog**: Community-driven wallpaper recipes (Cyberpunk, Anime Pastel, Synthwave, Dark Bio-Minimalism) ready for instant 1-click loading and remixing.

- **Confirmed Decision**: Direct client-side GitHub repository packaging + Git command generator (no requirement for risky third-party token entry, keeping user credentials 100% private and secure).
- **Open-Source Catalog**: Pre-populated with 6 curated open-source wallpaper templates with full model parameters (resolution, aspect ratio, prompt engineering recipe).

---

## 1. Overview & Core Concept

- **What It Does**: Adds an **Open Source & GitHub Hub** drawer and modal to VibePaper. Users can:
  - Copy repository quickstart commands for local cloning (`git clone`, setup, environment configs).
  - Export the current batch or favorite collection into an open-source dataset format (`dataset.json` with prompts, timestamps, base64/URL mappings).
  - Download a full ready-to-publish GitHub boilerplate ZIP containing the app's source code and current generated wallpaper assets.
  - Browse and clone community wallpaper presets (Cyberpunk Neo-Tokyo, Solar Flare Minimal, Lo-Fi Rainy Bistro, Retro Synthwave Grid, Bioluminescent Flora, Deep Space Nebula) with 1 click.
- **Target Audience**: Mobile creators, developers, AI artists, and open-source contributors wanting to self-host, clone, or publish their AI-generated wallpaper collections to GitHub.
- **Key Value**: Bridges the gap between browser AI generation and GitHub version control, allowing users to save their generative work as open-source code and assets.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Accessing the Hub**: In the top navigation bar, a new **"GitHub & Open Source"** button with a GitHub icon opens the dedicated drawer.
  2. **Clone & Setup Guide**: Tab 1 shows quick terminal commands with copy buttons for:
     - `git clone https://github.com/.../vibepaper.git`
     - Environment setup (`GEMINI_API_KEY=...`)
     - Development launch command (`npm run dev`)
  3. **Open-Source Templates (Cloning Presets)**: Tab 2 features a grid of curated open-source wallpaper presets with tags (e.g., `#cyberpunk`, `#minimalist`, `#lofi`). Clicking "Clone Template" instantly populates the prompt, aspect ratio, and resolution in VibePaper.
  4. **Export Batch to GitHub Dataset**: Tab 3 allows downloading a clean `github-export.json` and a full `.zip` repository bundle ready to push to GitHub with `git init && git commit -m "feat: new wallpaper batch"`.

- **Visual Identity & Theme**:
  - Consistent with VibePaper's dark cyber-glass aesthetic (`bg-neutral-900/90`, `backdrop-blur-xl`, hairline borders `border-white/10`).
  - Terminal code blocks styled with monospace fonts, syntax highlights, and one-tap copy buttons.
  - Zero pill clutter: category indicators rendered as clean unboxed text with subtle typographic separators (`·`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Repo & Dataset Export over In-Browser GitHub PAT Entry**
  - *Chosen Approach*: Provide structured GitHub export ZIPs, JSON datasets, and Git push terminal commands rather than prompting users for GitHub Personal Access Tokens (PAT).
  - *Why*: Eliminates security vulnerabilities and browser token exposure. Users maintain complete custody over their GitHub accounts and SSH/GPG keys.
- **Decision 2: Interactive Open-Source Recipe Catalog**
  - *Chosen Approach*: Allow 1-click loading of community open-source prompt recipes directly into the active generation pipeline.
  - *Why*: Gives users immediate creative utility and demonstrates open-source collaboration in real time.

---

## 4. Technical Architecture & Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                         VibePaper                           │
│                     (App.tsx Header)                        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Opens Hub
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 GitHubOpenSourceHub.tsx                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  Tabs: [Quickstart & Clone] [Open Recipes] [Export Git]  │ │
│ └─────────────────────────┬───────────────────────────────┘ │
│                           │                                 │
│   ┌───────────────────────┼─────────────────────────────┐   │
│   ▼                       ▼                             ▼   │
│ ┌────────────────┐ ┌───────────────────┐ ┌────────────────┐ │
│ │ Git Terminal   │ │ Open Source       │ │ Batch Git      │ │
│ │ Clone Commands │ │ Prompt Templates  │ │ Dataset Exporter│ │
│ │ (1-Click Copy) │ │ (1-Click Clone)   │ │ (JSON & ZIP)   │ │
│ └────────────────┘ └───────────────────┘ └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- **New Component**: `/src/components/GitHubOpenSourceHub.tsx`
- **Data Integration**: Integrates with existing `currentBatch`, `favorites`, and prompt inputs in `App.tsx`.

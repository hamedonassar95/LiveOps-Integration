import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parser with 50mb limit for reference images (base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get Gemini Client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment or project secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Supported models priority list
const DEFAULT_STUDIO_MODEL = 'gemini-3-pro-image-preview';
const FALLBACK_STUDIO_MODEL = 'gemini-3-pro-image';
const GENERAL_MODEL = 'gemini-nano-banana-2.1';
const FAST_MODEL = 'gemini-3.1-flash-lite-image';

interface GenerateRequest {
  prompt: string;
  aspectRatio?: string; // "1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"
  imageSize?: '1K' | '2K' | '4K';
  model?: string;
  referenceImage?: string; // base64 data url
  count?: number; // default 4
}

interface GeneratedItem {
  id: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  imageSize: string;
  model: string;
  variationIndex: number;
  createdAt: number;
}

// Variation styling nuances to ensure 4 distinct wallpaper options
const VARIATION_DIRECTIVES = [
  'Focus: Cinematic full-shot composition with deep atmospheric depth and luminous contrast.',
  'Focus: Dynamic perspective with dramatic lighting, rich architectural or organic textural details.',
  'Focus: Minimalist focal harmony, striking ambient shadows and evocative mood.',
  'Focus: Ethereal ambient glow, macro or mid-shot perspective with sublime color gradation.',
];

// Generate a single wallpaper variation with fallback logic
async function generateSingleWallpaper(
  ai: GoogleGenAI,
  vibePrompt: string,
  variationIndex: number,
  options: {
    aspectRatio: string;
    imageSize: '1K' | '2K' | '4K';
    model: string;
    referenceImage?: string;
  }
): Promise<GeneratedItem> {
  const modelsToTry = [
    options.model,
    options.model.includes('pro-image') ? FALLBACK_STUDIO_MODEL : GENERAL_MODEL,
    GENERAL_MODEL,
    FAST_MODEL,
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  const directive = VARIATION_DIRECTIVES[variationIndex % VARIATION_DIRECTIVES.length];
  const fullPrompt = options.referenceImage
    ? `Create a fresh, creative phone wallpaper variation visually inspired by the reference image. Preserve its atmospheric aesthetic, tonal harmony, and mood, while introducing new angles and compositional depth. Desired vibe: ${vibePrompt}. ${directive}. High quality wallpaper aesthetics.`
    : `High quality mobile phone wallpaper. Vibe: ${vibePrompt}. ${directive}. Clean composition, phone wallpaper friendly, beautiful framing, ultra-high fidelity visual aesthetic.`;

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const parts: any[] = [];

      // If remixing with reference image
      if (options.referenceImage) {
        const matches = options.referenceImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            },
          });
        }
      }

      parts.push({ text: fullPrompt });

      // Build imageConfig based on supported features
      // gemini-3-pro-image and gemini-nano-banana-2.1 support imageSize ("1K", "2K", "4K")
      // standard aspect ratios: "1:1", "3:4", "4:3", "9:16", "16:9", etc.
      const imageConfig: Record<string, any> = {
        aspectRatio: options.aspectRatio || '9:16',
      };

      if (options.imageSize) {
        imageConfig.imageSize = options.imageSize;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          imageConfig,
        },
      });

      // Extract image data
      let imageUrl: string | null = null;
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        return {
          id: `wp_${Date.now()}_${variationIndex}_${Math.random().toString(36).substring(2, 7)}`,
          imageUrl,
          prompt: vibePrompt,
          aspectRatio: options.aspectRatio,
          imageSize: options.imageSize,
          model: modelName,
          variationIndex: variationIndex + 1,
          createdAt: Date.now(),
        };
      } else {
        throw new Error(`Model ${modelName} returned no image candidate part.`);
      }
    } catch (err: any) {
      console.warn(`Failed generation with model ${modelName} (variation ${variationIndex + 1}):`, err?.message || err);
      lastError = err;
      // continue to next model in fallback list
    }
  }

  throw lastError || new Error(`Unable to generate variation ${variationIndex + 1} with available models.`);
}

// API: Generate wallpapers
app.post('/api/generate-wallpapers', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      aspectRatio = '9:16',
      imageSize = '2K',
      model = DEFAULT_STUDIO_MODEL,
      referenceImage,
      count = 4,
    } = req.body as GenerateRequest;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Please describe the desired wallpaper vibe.' });
    }

    const ai = getGeminiClient();
    const variationCount = Math.min(Math.max(count, 1), 4); // generate up to 4 variations

    // Execute in parallel
    const promises = Array.from({ length: variationCount }, (_, index) =>
      generateSingleWallpaper(ai, prompt.trim(), index, {
        aspectRatio,
        imageSize: imageSize as '1K' | '2K' | '4K',
        model,
        referenceImage,
      })
    );

    const results = await Promise.allSettled(promises);
    const wallpapers: GeneratedItem[] = [];
    const errors: string[] = [];

    results.forEach((resItem, idx) => {
      if (resItem.status === 'fulfilled') {
        wallpapers.push(resItem.value);
      } else {
        errors.push(`Variation ${idx + 1}: ${resItem.reason?.message || 'Generation failed'}`);
      }
    });

    if (wallpapers.length === 0) {
      return res.status(500).json({
        error: 'Failed to generate wallpapers.',
        details: errors.join('; '),
      });
    }

    return res.json({
      success: true,
      wallpapers,
      totalRequested: variationCount,
      totalGenerated: wallpapers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('Error generating wallpapers:', err);
    return res.status(500).json({
      error: err?.message || 'Server error generating wallpapers',
      details: err?.stack,
    });
  }
});

// API: Transcribe audio for voice prompt input (gemini-3.5-transcribe)
app.post('/api/transcribe-audio', async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const ai = getGeminiClient();
    const cleanBase64 = audioData.replace(/^data:audio\/[a-zA-Z0-9]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: 'Transcribe this voice audio accurately into a concise descriptive wallpaper prompt. Output only the transcribed text.',
          },
        ],
      },
    });

    const transcription = response.text?.trim() || '';
    return res.json({ success: true, text: transcription });
  } catch (err: any) {
    console.error('Transcription error:', err);
    return res.status(500).json({ error: err.message || 'Failed to transcribe audio' });
  }
});

// API: Animate wallpaper or prompt into Live Video Wallpaper (gemini-omni-1.2-flash via Interactions API)
app.post('/api/animate-wallpaper', async (req: Request, res: Response) => {
  try {
    const { prompt, imageUrl, aspectRatio = '9:16' } = req.body;
    const ai = getGeminiClient();

    const videoPrompt = prompt
      ? `Cinematic subtle live motion wallpaper of ${prompt}. Ambient looping motion, gentle light rays, floating micro dust particles, elegant atmospheric flow.`
      : 'Cinematic subtle live motion phone wallpaper. Ambient particles, gentle lighting shifts, smooth seamless flow.';

    const inputParts: any[] = [];
    if (imageUrl) {
      const match = imageUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        inputParts.push({
          type: 'image',
          mime_type: match[1],
          data: match[2],
        });
      }
    }
    inputParts.push({ type: 'text', text: videoPrompt });

    const interaction = await ai.interactions.create({
      model: 'gemini-omni-1.2-flash',
      input: inputParts,
      response_format: {
        type: 'video',
        aspect_ratio: aspectRatio === '16:9' ? '16:9' : '9:16',
      },
    }, { timeout: 300000 });

    const videoPart = interaction.output_video;
    if (videoPart && videoPart.data) {
      const mime = videoPart.mime_type || 'video/mp4';
      const videoDataUrl = `data:${mime};base64,${videoPart.data}`;
      return res.json({ success: true, videoUrl: videoDataUrl });
    }

    throw new Error('Omni Flash did not return video output data');
  } catch (err: any) {
    console.error('Video animation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate live motion video' });
  }
});

// API: Generate ambient vibe soundtrack with Lyria (lyria-3-clip-preview)
app.post('/api/generate-ambient-music', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    const ai = getGeminiClient();

    const musicPrompt = `Generate a 30-second atmospheric ambient lo-fi music track matching this aesthetic vibe: ${prompt || 'relaxing moody lo-fi wallpaper chillout'}. Warm vinyl crackle, mellow chords, gentle relaxing tempo.`;

    const responseStream = await ai.models.generateContentStream({
      model: 'lyria-3-clip-preview',
      contents: musicPrompt,
    });

    const audioChunks: Buffer[] = [];
    let mimeType = 'audio/mpeg';

    for await (const chunk of responseStream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
        }
      }
    }

    if (audioChunks.length === 0) {
      throw new Error('No audio data received from Lyria model');
    }

    const audioBase64 = Buffer.concat(audioChunks).toString('base64');
    const audioUrl = `data:${mimeType};base64,${audioBase64}`;

    return res.json({ success: true, audioUrl });
  } catch (err: any) {
    console.error('Music generation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate ambient soundtrack' });
  }
});

// API: AI Wallpaper Stylist Chat (gemini-3.8-flash with Google Search grounding)
app.post('/api/chat-stylist', async (req: Request, res: Response) => {
  try {
    const { messages, useSearch = true, model = 'gemini-3.8-flash' } = req.body;
    const ai = getGeminiClient();

    // Map conversation to contents format
    const contents = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const tools: any[] = [];
    if (useSearch) {
      tools.push({ googleSearch: {} });
    }

    const response = await ai.models.generateContent({
      model: model || 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction:
          'You are the VibePaper AI Wallpaper Stylist and Art Director. You help users discover, refine, and brainstorm aesthetic wallpaper vibes (cyberpunk, anime, minimalist, dark botanical, synthwave, 3D abstract, photography styles). Suggest 2-3 specific, prompt-ready vibes they can copy or click. Keep answers engaging, vivid, and concise.',
        tools: tools.length > 0 ? tools : undefined,
      },
    });

    return res.json({
      success: true,
      text: response.text || 'Here is an inspired wallpaper vibe for you!',
    });
  } catch (err: any) {
    console.error('Chat stylist error:', err);
    return res.status(500).json({ error: err.message || 'Failed to chat with AI Stylist' });
  }
});

// API: Health / config check
app.get('/api/health', (_req: Request, res: Response) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    defaultStudioModel: DEFAULT_STUDIO_MODEL,
    generalModel: GENERAL_MODEL,
    timestamp: Date.now(),
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development mode with Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wallpaper Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

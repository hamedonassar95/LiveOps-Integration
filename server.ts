import http from 'http';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  saveWallpaperToDb,
  getSavedWallpapersFromDb,
  deleteSavedWallpaperFromDb,
} from './src/db/wallpapers.ts';

dotenv.config();



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
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

// API: Gemini Multi-Turn Chatbot (supports gemini-4-argon, gemini-3.8-flash, gemini-3.1-flash-lite with role system instructions)
app.post('/api/chat-stylist', async (req: Request, res: Response) => {
  try {
    const {
      messages,
      useSearch = true,
      model = 'gemini-3.8-flash',
      role = 'art-director', // 'art-director' | 'prompt-engineer' | 'minimalist-poet'
    } = req.body;
    const ai = getGeminiClient();

    // Map conversation history to contents format
    const contents = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // Dynamic role system instruction
    let systemInstruction =
      'You are the VibePaper AI Wallpaper Stylist and Art Director. You help users discover, refine, and brainstorm aesthetic phone wallpaper vibes (cyberpunk, anime, minimalist, dark botanical, synthwave, 3D abstract). Suggest 2-3 specific, prompt-ready vibes formatted cleanly. Keep answers engaging, vivid, and concise.';

    if (role === 'prompt-engineer') {
      systemInstruction =
        'You are an Expert AI Prompt Engineer specializing in image synthesis models (Gemini Image, Imagen, Stable Diffusion). Given user vibes, output precise visual prompts engineered with photographic lighting, aspect ratio parameters (9:16), camera aperture, volumetric fog, color grading, and textures.';
    } else if (role === 'minimalist-poet') {
      systemInstruction =
        'You are an Aesthetic Minimalist Curator and Poet. You describe phone wallpapers with profound poetic brevity, focusing on quiet negative space, shadows, organic materials, single light sources, and tranquil mood.';
    }

    // Tools: Google Search grounding supported on flash models
    const tools: any[] = [];
    if (useSearch && (model === 'gemini-3.8-flash' || model === 'gemini-4-argon')) {
      tools.push({ googleSearch: {} });
    }

    // Supported models: gemini-4-argon (complex tasks), gemini-3.8-flash (general), gemini-3.1-flash-lite (fast)
    const activeModel =
      model === 'gemini-4-argon'
        ? 'gemini-4-argon'
        : model === 'gemini-3.1-flash-lite'
        ? 'gemini-3.1-flash-lite'
        : 'gemini-3.8-flash';

    const response = await ai.models.generateContent({
      model: activeModel,
      contents,
      config: {
        systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
      },
    });

    return res.json({
      success: true,
      text: response.text || 'Here is an inspired wallpaper vibe for you!',
      modelUsed: activeModel,
      roleUsed: role,
    });
  } catch (err: any) {
    console.error('Chat stylist error:', err);
    return res.status(500).json({ error: err.message || 'Failed to chat with Gemini Chatbot' });
  }
});

// Database API: Synchronize authenticated user with Cloud SQL PostgreSQL
app.post('/api/db/user', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || `${uid}@anonymous.vibepaper.app`;
    if (!uid) {
      return res.status(401).json({ error: 'User identifier not found in token' });
    }

    const userRecord = await getOrCreateUser(uid, email);
    return res.json({ success: true, user: userRecord });
  } catch (err: any) {
    console.error('Failed to sync user to Cloud SQL:', err);
    return res.status(500).json({ error: err.message || 'Failed to sync user record' });
  }
});

// Database API: Save wallpaper to Cloud SQL PostgreSQL
app.post('/api/db/wallpapers', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || `${uid}@anonymous.vibepaper.app`;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    const userRecord = await getOrCreateUser(uid, email);
    const { wallpaper } = req.body;
    if (!wallpaper || !wallpaper.imageUrl) {
      return res.status(400).json({ error: 'Missing wallpaper data' });
    }

    const saved = await saveWallpaperToDb(userRecord.id, {
      wallpaperId: wallpaper.id || `wp_${Date.now()}`,
      imageUrl: wallpaper.imageUrl,
      prompt: wallpaper.prompt || 'VibePaper aesthetic wallpaper',
      aspectRatio: wallpaper.aspectRatio || '9:16',
      imageSize: wallpaper.imageSize || '2K',
      model: wallpaper.model || 'gemini-3-pro-image-preview',
      variationIndex: wallpaper.variationIndex || 1,
    });

    return res.json({ success: true, wallpaper: saved });
  } catch (err: any) {
    console.error('Failed to save wallpaper to Cloud SQL:', err);
    return res.status(500).json({ error: err.message || 'Failed to save wallpaper' });
  }
});

// Database API: Retrieve user saved wallpapers from Cloud SQL PostgreSQL
app.get('/api/db/wallpapers', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || `${uid}@anonymous.vibepaper.app`;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    const userRecord = await getOrCreateUser(uid, email);
    const wallpapers = await getSavedWallpapersFromDb(userRecord.id);
    return res.json({ success: true, wallpapers });
  } catch (err: any) {
    console.error('Failed to retrieve wallpapers from Cloud SQL:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch saved wallpapers' });
  }
});

// Database API: Delete wallpaper from Cloud SQL PostgreSQL
app.delete('/api/db/wallpapers/:wallpaperId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || `${uid}@anonymous.vibepaper.app`;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    const userRecord = await getOrCreateUser(uid, email);
    const { wallpaperId } = req.params;
    await deleteSavedWallpaperFromDb(userRecord.id, wallpaperId);
    return res.json({ success: true, wallpaperId });
  } catch (err: any) {
    console.error('Failed to delete wallpaper from Cloud SQL:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete saved wallpaper' });
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

// Setup WebSocket Server for Live API Voice Conversations (gemini-3.8-live)
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Live Voice API WebSocket');
  let session: any = null;

  try {
    const ai = getGeminiClient();

    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction:
          'You are VibePaper Voice Assistant, an expert aesthetic wallpaper art director and creative companion. Talk directly, warmly, and concisely with the user in natural voice. Help them brainstorm visual vibes, colors, lighting, cyberpunk, anime, or nature concepts for phone wallpapers.',
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          if (clientWs.readyState !== WebSocket.OPEN) return;

          const content = message.serverContent;
          if (content?.inputTranscription?.text) {
            clientWs.send(
              JSON.stringify({ inputTranscript: content.inputTranscription.text })
            );
          }
          if (content?.outputTranscription?.text) {
            clientWs.send(
              JSON.stringify({ outputTranscript: content.outputTranscription.text })
            );
          }

          for (const part of content?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
            }
          }

          if (content?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }

          if (content?.turnComplete) {
            clientWs.send(JSON.stringify({ turnComplete: true }));
          }
        },
      },
    });

    clientWs.on('message', (data: any) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio && session) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (parsed.text && session) {
          session.sendRealtimeInput({
            text: parsed.text,
          });
        }
      } catch (e) {
        console.error('Error handling client WS message:', e);
      }
    });

    clientWs.on('close', () => {
      console.log('Client disconnected from Live Voice API');
      if (session && typeof session.close === 'function') {
        try {
          session.close();
        } catch (e) {
          // ignore session close errors
        }
      }
    });
  } catch (err: any) {
    console.error('Failed to initialize Live API session:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: err.message || 'Live API initialization failed' }));
      clientWs.close();
    }
  }
});

// Handle HTTP upgrade to WebSocket for /live path
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  if (pathname === '/live' || pathname === '/api/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development mode with Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
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

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Wallpaper Studio server with Gemini Live running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});


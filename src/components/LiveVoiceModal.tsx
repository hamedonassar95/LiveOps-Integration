import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPrompt: (vibe: string) => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  onApplyPrompt,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [modelTranscript, setModelTranscript] = useState<string>('');
  const [suggestedVibes, setSuggestedVibes] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const isMutedRef = useRef<boolean>(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Convert Float32Array to 16kHz 16-bit PCM Little Endian base64 string
  const pcmToBase64 = (float32Array: Float32Array): string => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Decode 24kHz raw PCM little-endian from base64 string and schedule playback
  const playAudioChunk = (audioCtx: AudioContext, base64Data: string) => {
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const buffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      buffer.copyToChannel(float32Array, 0, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);

      const currentTime = audioCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;
    } catch (e) {
      console.error('Error playing 24kHz audio chunk:', e);
    }
  };

  const startLiveSession = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    setUserTranscript('');
    setModelTranscript('');
    nextStartTimeRef.current = 0;

    try {
      // 1. Setup AudioContexts (16kHz for input mic, 24kHz for output playback)
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;

      // 2. Request mic stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      audioStreamRef.current = stream;

      // 3. Connect WebSocket to server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);

        // 4. Capture microphone and send 16kHz PCM chunks
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;

        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (isMutedRef.current || ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const base64Audio = pcmToBase64(inputData);
          ws.send(JSON.stringify({ audio: base64Audio }));
        };
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.error) {
            setErrorMessage(msg.error);
          }

          if (msg.inputTranscript) {
            setUserTranscript((prev) => `${prev} ${msg.inputTranscript}`.trim());
          }

          if (msg.outputTranscript) {
            setModelTranscript((prev) => {
              const updated = `${prev} ${msg.outputTranscript}`.trim();
              extractVibes(updated);
              return updated;
            });
          }

          if (msg.audio && outputAudioCtxRef.current) {
            playAudioChunk(outputAudioCtxRef.current, msg.audio);
          }

          if (msg.interrupted) {
            // Stop scheduled chunks on interruption
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
          }
        } catch (e) {
          console.error('Error handling WS message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket Live API error:', err);
        setErrorMessage('Connection to Live Voice API encountered an error.');
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch (err: any) {
      console.error('Failed to start Live session:', err);
      setErrorMessage(err.message || 'Could not access microphone or initiate Live API.');
      setIsConnecting(false);
      setIsConnected(false);
    }
  };

  const stopLiveSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      inputAudioCtxRef.current.close();
    }
    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== 'closed') {
      outputAudioCtxRef.current.close();
    }
    setIsConnected(false);
    setIsConnecting(false);
  };

  // Helper to extract clean prompt candidates from the conversation
  const extractVibes = (text: string) => {
    const candidates: string[] = [];
    const quoteMatches = text.match(/"([^"]{10,80})"/g);
    if (quoteMatches) {
      quoteMatches.forEach((q) => candidates.push(q.replace(/"/g, '')));
    }
    if (candidates.length === 0 && text.length > 20) {
      const parts = text.split(/[.?!]/).map((s) => s.trim()).filter((s) => s.length > 15 && s.length < 80);
      if (parts.length > 0) {
        candidates.push(parts[parts.length - 1]);
      }
    }
    if (candidates.length > 0) {
      setSuggestedVibes(Array.from(new Set(candidates)).slice(-3));
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopLiveSession();
    }
    return () => {
      stopLiveSession();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in text-left">
      <div className="relative w-full max-w-lg bg-neutral-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-neutral-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-md">
              <Radio className={`w-4 h-4 ${isConnected ? 'animate-pulse' : ''}`} />
              {isConnected && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-neutral-900" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Gemini 3.8 Live Voice Studio</span>
                <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  Real-Time
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Talk directly with Gemini 3.8 Live to design wallpapers in real-time
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopLiveSession();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Main Visualizer Sphere & Status */}
          <div className="py-6 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-neutral-950/80 to-neutral-900/40 border border-white/5 relative overflow-hidden">
            {/* Visualizer Pulses */}
            <div className="relative flex items-center justify-center mb-4">
              {isConnected && (
                <>
                  <div className="absolute w-28 h-28 rounded-full bg-violet-600/20 animate-ping" />
                  <div className="absolute w-20 h-20 rounded-full bg-fuchsia-500/20 animate-pulse" />
                </>
              )}
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                  isConnected
                    ? 'bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-indigo-600 text-white scale-105'
                    : isConnecting
                    ? 'bg-violet-900/60 text-violet-300'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {isConnecting ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : isConnected ? (
                  <Mic className="w-8 h-8 animate-bounce" />
                ) : (
                  <MicOff className="w-8 h-8" />
                )}
              </div>
            </div>

            <div className="text-center px-4">
              <p className="text-xs font-semibold text-white">
                {isConnected
                  ? 'Listening & Speaking in Real-Time...'
                  : isConnecting
                  ? 'Connecting to Gemini 3.8 Live (Audio WebSocket)...'
                  : 'Voice session ready to start'}
              </p>
              <p className="text-[11px] text-neutral-400 mt-1 max-w-xs">
                {isConnected
                  ? 'Say things like: "I want a dark cyberpunk rainy neon wallpaper with reflections"'
                  : 'Uses model gemini-3.8-live with full duplex 16kHz speech input & 24kHz audio synthesis.'}
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mt-3 mx-4 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Real-Time Live Transcripts */}
          {(userTranscript || modelTranscript) && (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {userTranscript && (
                <div className="p-3 rounded-xl bg-neutral-950/80 border border-white/5 text-xs">
                  <span className="font-semibold text-neutral-400 block mb-0.5">You said:</span>
                  <p className="text-neutral-200 leading-relaxed">{userTranscript}</p>
                </div>
              )}

              {modelTranscript && (
                <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/20 text-xs">
                  <span className="font-semibold text-violet-300 block mb-0.5">
                    Gemini 3.8 Live:
                  </span>
                  <p className="text-violet-100 leading-relaxed">{modelTranscript}</p>
                </div>
              )}
            </div>
          )}

          {/* Suggested Prompts to Apply */}
          {suggestedVibes.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-white/5">
              <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Discovered Wallpaper Vibes:</span>
              </span>
              <div className="flex flex-col gap-1.5">
                {suggestedVibes.map((vibe, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onApplyPrompt(vibe);
                      stopLiveSession();
                      onClose();
                    }}
                    className="p-2 rounded-xl bg-neutral-950/80 hover:bg-violet-950/50 border border-white/5 hover:border-violet-500/30 text-xs text-neutral-200 hover:text-white flex items-center justify-between group transition-all"
                  >
                    <span className="truncate pr-2 font-medium">{vibe}</span>
                    <span className="shrink-0 text-[10px] text-violet-400 group-hover:text-violet-300 flex items-center gap-1">
                      <span>Apply & Close</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-neutral-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isConnected && (
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-xl text-xs flex items-center space-x-1.5 transition-colors border ${
                  isMuted
                    ? 'bg-amber-950/50 text-amber-300 border-amber-500/30'
                    : 'bg-neutral-800 text-neutral-300 border-white/5 hover:text-white'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMuted ? 'Muted' : 'Mute'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isConnected ? (
              <button
                type="button"
                onClick={startLiveSession}
                disabled={isConnecting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold shadow-md shadow-violet-600/25 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5" />
                    <span>Start Voice Conversation</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopLiveSession}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/25 active:scale-95 transition-all flex items-center space-x-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>End Conversation</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

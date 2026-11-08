import React, { useEffect, useState } from 'react';
import { Lock, Wifi, Battery, Camera, Flashlight, Bell } from 'lucide-react';

interface LockScreenOverlayProps {
  prompt?: string;
}

export const LockScreenOverlay: React.FC<LockScreenOverlayProps> = ({ prompt }) => {
  const [time, setTime] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
      setDateStr(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 select-none z-20 text-white">
      {/* Top Status Bar & Notch */}
      <div className="w-full">
        <div className="flex items-center justify-between text-xs font-semibold px-2 pt-1 tracking-wider text-white/90">
          <span>{time || '09:41'}</span>
          {/* Dynamic Island / Speaker Pill */}
          <div className="w-24 h-5 bg-black/90 backdrop-blur-md rounded-full mx-auto shadow-inner flex items-center justify-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-700/50"></div>
            <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-1.5">
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-[10px]">5G</span>
            <Battery className="w-4 h-4 fill-white" />
          </div>
        </div>

        {/* Lock Icon, Date & Huge Clock */}
        <div className="flex flex-col items-center mt-6">
          <div className="flex items-center space-x-1.5 text-white/80 text-xs mb-1 font-medium bg-black/20 backdrop-blur-md px-3 py-1 rounded-full">
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Screen Preview</span>
          </div>
          <p className="text-sm font-medium text-white/90 drop-shadow-md tracking-wide mt-1">
            {dateStr || 'Sunday, November 8'}
          </p>
          <h1 className="text-7xl font-extralight tracking-tight text-white drop-shadow-xl mt-0 font-[sans-serif]">
            {time || '09:41'}
          </h1>
        </div>
      </div>

      {/* Center Simulated Notification Card */}
      <div className="mx-auto max-w-xs w-full">
        <div className="bg-black/40 backdrop-blur-xl border border-white/15 rounded-2xl p-3.5 shadow-2xl animate-fade-in text-left">
          <div className="flex items-center justify-between text-xs text-white/70 mb-1">
            <div className="flex items-center space-x-1.5 font-medium">
              <span className="w-4 h-4 rounded-md bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center text-[9px] text-white font-bold">
                V
              </span>
              <span className="text-white/90 font-semibold">VibePaper</span>
            </div>
            <span className="text-[10px] text-white/50">now</span>
          </div>
          <p className="text-xs font-semibold text-white truncate">
            {prompt ? `Vibe: "${prompt}"` : 'Wallpaper preview'}
          </p>
          <p className="text-[11px] text-white/70 line-clamp-1 mt-0.5">
            Perfect fit for home screen & lock screen icons
          </p>
        </div>
      </div>

      {/* Bottom Lock Screen Controls */}
      <div className="w-full pb-3">
        <div className="flex items-center justify-between px-6">
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/90 shadow-lg">
            <Flashlight className="w-5 h-5" />
          </div>
          <div className="text-[10px] text-white/60 tracking-widest font-mono uppercase bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
            Swipe up to unlock
          </div>
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/90 shadow-lg">
            <Camera className="w-5 h-5" />
          </div>
        </div>
        {/* Home Indicator Bar */}
        <div className="w-32 h-1 bg-white/70 rounded-full mx-auto mt-4 shadow"></div>
      </div>
    </div>
  );
};

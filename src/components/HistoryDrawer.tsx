import React, { useState, useMemo } from 'react';
import {
  History,
  Heart,
  X,
  Calendar as CalendarIcon,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trash2,
  Clock,
  Layers,
  ArrowRight,
  CheckCircle2,
  CalendarDays,
  Filter,
} from 'lucide-react';
import { Wallpaper, WallpaperBatch } from '../types.ts';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  batches: WallpaperBatch[];
  favorites: Wallpaper[];
  onSelectBatch: (batch: WallpaperBatch) => void;
  onDeleteBatch?: (batchId: string) => void;
  onOpenWallpaperFullscreen: (wallpaper: Wallpaper) => void;
  onRemixWallpaper: (wallpaper: Wallpaper) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  activeBatchId?: string;
}

type ViewMode = 'list' | 'calendar';

// Helper to format date keys (YYYY-MM-DD in local time)
function getDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get friendly relative date label
function getFriendlyDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const now = new Date();

  const todayKey = getDateKey(now.getTime());
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterdayKey = getDateKey(yesterdayDate.getTime());

  if (dateKey === todayKey) {
    return 'Today';
  }
  if (dateKey === yesterdayKey) {
    return 'Yesterday';
  }

  // Format e.g. "Monday, Nov 10, 2026"
  return target.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: target.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Helper to format time (e.g. "2:34 PM")
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  batches,
  favorites,
  onSelectBatch,
  onDeleteBatch,
  onOpenWallpaperFullscreen,
  onRemixWallpaper,
  onToggleFavorite,
  activeBatchId,
}) => {
  const [activeTab, setActiveTab] = useState<'batches' | 'favorites'>('batches');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Calendar month state
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(() => new Date());

  if (!isOpen) return null;

  // Map batches by dateKey (YYYY-MM-DD)
  const batchesByDateKey = useMemo(() => {
    const map = new Map<string, WallpaperBatch[]>();
    for (const batch of batches) {
      const key = getDateKey(batch.createdAt || Date.now());
      const list = map.get(key) || [];
      list.push(batch);
      map.set(key, list);
    }
    return map;
  }, [batches]);

  // Unique dates with batch counts
  const dateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [key, list] of batchesByDateKey.entries()) {
      counts.set(key, list.length);
    }
    return counts;
  }, [batchesByDateKey]);

  // Filtered batches based on search query & selectedDateKey
  const filteredBatches = useMemo(() => {
    let result = batches;

    if (selectedDateKey) {
      result = result.filter((b) => getDateKey(b.createdAt || Date.now()) === selectedDateKey);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.prompt.toLowerCase().includes(q) ||
          b.aspectRatio.toLowerCase().includes(q) ||
          b.imageSize.toLowerCase().includes(q)
      );
    }

    return result;
  }, [batches, selectedDateKey, searchQuery]);

  // Group filtered batches by date
  const dateGroupedBatches = useMemo(() => {
    const groups: { dateKey: string; label: string; batches: WallpaperBatch[] }[] = [];
    const groupedMap = new Map<string, WallpaperBatch[]>();

    for (const batch of filteredBatches) {
      const key = getDateKey(batch.createdAt || Date.now());
      const list = groupedMap.get(key) || [];
      list.push(batch);
      groupedMap.set(key, list);
    }

    // Sort descending by date key
    const sortedKeys = Array.from(groupedMap.keys()).sort().reverse();
    for (const key of sortedKeys) {
      groups.push({
        dateKey: key,
        label: getFriendlyDateLabel(key),
        batches: groupedMap.get(key)!,
      });
    }

    return groups;
  }, [filteredBatches]);

  // Calendar calculations for currentCalendarDate
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const daysInMonth = lastDayOfMonth.getDate();
    // Start of week: Sunday (0) to Saturday (6)
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const days: {
      date: Date;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      batchCount: number;
    }[] = [];

    const todayKey = getDateKey(Date.now());

    // Previous month padding
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, 0 - (startingDayOfWeek - 1 - i));
      const key = getDateKey(prevDate.getTime());
      days.push({
        date: prevDate,
        dateKey: key,
        isCurrentMonth: false,
        isToday: key === todayKey,
        batchCount: dateCounts.get(key) || 0,
      });
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = getDateKey(date.getTime());
      days.push({
        date,
        dateKey: key,
        isCurrentMonth: true,
        isToday: key === todayKey,
        batchCount: dateCounts.get(key) || 0,
      });
    }

    // Trailing padding to make grid 35 or 42 cells (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const key = getDateKey(nextDate.getTime());
      days.push({
        date: nextDate,
        dateKey: key,
        isCurrentMonth: false,
        isToday: key === todayKey,
        batchCount: dateCounts.get(key) || 0,
      });
    }

    return days;
  }, [currentCalendarDate, dateCounts]);

  const handlePrevMonth = () => {
    setCurrentCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleTodayMonth = () => {
    const now = new Date();
    setCurrentCalendarDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(getDateKey(now.getTime()));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl max-h-[90vh] bg-[#0c0d14] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left relative">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0 bg-neutral-950/70">
          <div className="flex items-center space-x-1.5 bg-neutral-900/90 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('batches')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'batches'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Wallpaper Batches ({batches.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'favorites'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  activeTab === 'favorites' ? 'fill-current text-white' : 'text-rose-400'
                }`}
              />
              <span>Favorites ({favorites.length})</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors shrink-0"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: Wallpaper Batches with Date-Grouping and Calendar View */}
        {activeTab === 'batches' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Control Bar: Search & View Mode Switcher */}
            <div className="px-4 py-3 border-b border-white/5 bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search past vibes (e.g. cyberpunk, anime)..."
                  className="w-full bg-neutral-950/90 border border-white/10 focus:border-violet-500 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-neutral-500 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* View Mode Toggle: Date-Grouped List vs Calendar Grid */}
              <div className="flex items-center space-x-1 bg-neutral-950/80 p-0.5 rounded-xl border border-white/10 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Date-grouped timeline list"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Timeline</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Visual calendar month view"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Calendar</span>
                </button>
              </div>
            </div>

            {/* Active Date Filter Notice Banner */}
            {selectedDateKey && (
              <div className="px-4 py-2 bg-violet-950/40 border-b border-violet-500/20 flex items-center justify-between text-xs text-violet-200 shrink-0">
                <div className="flex items-center space-x-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-violet-400" />
                  <span>
                    Filtered to <strong>{getFriendlyDateLabel(selectedDateKey)}</strong> ({filteredBatches.length} {filteredBatches.length === 1 ? 'batch' : 'batches'})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDateKey(null)}
                  className="px-2 py-0.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 text-[11px] font-medium transition-colors"
                >
                  Clear Filter
                </button>
              </div>
            )}

            {/* Sub-View: Visual Calendar View */}
            {viewMode === 'calendar' && (
              <div className="p-4 border-b border-white/10 bg-neutral-950/50 shrink-0">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {currentCalendarDate.toLocaleDateString(undefined, {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </h3>
                    <button
                      onClick={handleTodayMonth}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-900 border border-white/10 text-neutral-300 hover:text-white"
                    >
                      Today
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white transition-colors"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white transition-colors"
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Weekday Labels */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-medium text-neutral-500">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((dayItem, idx) => {
                    const isSelected = selectedDateKey === dayItem.dateKey;
                    const hasBatches = dayItem.batchCount > 0;

                    return (
                      <button
                        key={`${dayItem.dateKey}-${idx}`}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDateKey(null);
                          } else {
                            setSelectedDateKey(dayItem.dateKey);
                          }
                        }}
                        disabled={!dayItem.isCurrentMonth}
                        className={`relative h-10 rounded-xl flex flex-col items-center justify-center transition-all ${
                          !dayItem.isCurrentMonth
                            ? 'opacity-20 cursor-default'
                            : isSelected
                            ? 'bg-violet-600 text-white font-bold ring-2 ring-violet-400 shadow-lg shadow-violet-600/30'
                            : hasBatches
                            ? 'bg-neutral-900/90 hover:bg-neutral-800 border border-violet-500/40 text-neutral-100 font-semibold'
                            : 'bg-neutral-950/40 hover:bg-neutral-900/60 text-neutral-400'
                        }`}
                      >
                        <span className="text-xs leading-none">{dayItem.date.getDate()}</span>

                        {/* Batch Indicator Pill / Dot */}
                        {hasBatches && (
                          <div className="flex items-center gap-0.5 mt-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-fuchsia-400 animate-pulse'
                              }`}
                            />
                            {dayItem.batchCount > 1 && (
                              <span
                                className={`text-[9px] leading-none ${
                                  isSelected ? 'text-violet-100' : 'text-fuchsia-300'
                                }`}
                              >
                                {dayItem.batchCount}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-2.5 pt-2 border-t border-white/5">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                      <span>Has Wallpapers</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                      <span>Selected Day</span>
                    </span>
                  </div>
                  <span>Tap any day with wallpapers to filter</span>
                </div>
              </div>
            )}

            {/* Scrollable Batches List (Date-Grouped) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {filteredBatches.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center text-neutral-500 mb-2.5">
                    <Layers className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-white">No Wallpaper Batches Found</p>
                  <p className="text-[11px] text-neutral-400 mt-1 max-w-xs">
                    {selectedDateKey
                      ? `No wallpapers generated on ${getFriendlyDateLabel(selectedDateKey)}.`
                      : searchQuery
                      ? `No batches matching "${searchQuery}".`
                      : 'Generate your first wallpaper batch to start filling your studio library!'}
                  </p>
                  {selectedDateKey && (
                    <button
                      onClick={() => setSelectedDateKey(null)}
                      className="mt-3 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-900 border border-white/10 text-white hover:bg-neutral-800"
                    >
                      Show All Batches
                    </button>
                  )}
                </div>
              ) : (
                dateGroupedBatches.map((group) => (
                  <div key={group.dateKey} className="space-y-2">
                    {/* Date Section Header */}
                    <div className="flex items-center justify-between sticky top-0 bg-[#0c0d14]/90 backdrop-blur-md py-1 z-10">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white tracking-tight">
                          {group.label}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {group.batches.length} {group.batches.length === 1 ? 'batch' : 'batches'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">{group.dateKey}</span>
                    </div>

                    {/* Batches under this Date */}
                    <div className="space-y-2.5">
                      {group.batches.map((batch) => {
                        const isActive = activeBatchId === batch.id;
                        return (
                          <div
                            key={batch.id}
                            className={`p-3 rounded-2xl border transition-all ${
                              isActive
                                ? 'bg-violet-950/30 border-violet-500/50 shadow-md'
                                : 'bg-neutral-900/70 hover:bg-neutral-900 border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              {/* Left Thumbnail Previews (up to 4 thumbnails in 9:16) */}
                              <div
                                onClick={() => {
                                  onSelectBatch(batch);
                                  onClose();
                                }}
                                className="flex items-center space-x-1.5 cursor-pointer shrink-0"
                                title="Click to load this batch into studio"
                              >
                                {batch.wallpapers.slice(0, 4).map((wp, i) => (
                                  <img
                                    key={wp.id || i}
                                    src={wp.imageUrl}
                                    alt=""
                                    className="w-8 h-14 object-cover rounded-lg border border-white/10 hover:scale-105 transition-transform"
                                  />
                                ))}
                              </div>

                              {/* Middle Prompt & Details */}
                              <div
                                onClick={() => {
                                  onSelectBatch(batch);
                                  onClose();
                                }}
                                className="flex-1 min-w-0 cursor-pointer text-left"
                              >
                                <div className="flex items-center space-x-1.5 text-[10px] text-neutral-400 mb-1">
                                  <Clock className="w-3 h-3 text-neutral-500" />
                                  <span>{formatTime(batch.createdAt || Date.now())}</span>
                                  <span>•</span>
                                  <span className="font-mono text-violet-300">
                                    {batch.wallpapers.length} variations
                                  </span>
                                  <span>•</span>
                                  <span className="font-mono">{batch.aspectRatio}</span>
                                  <span>•</span>
                                  <span className="font-mono">{batch.imageSize}</span>
                                </div>

                                <p className="text-xs font-semibold text-white line-clamp-2 leading-relaxed">
                                  {batch.prompt}
                                </p>
                              </div>

                              {/* Right Actions: Load & Delete */}
                              <div className="flex flex-col items-end space-y-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectBatch(batch);
                                    onClose();
                                  }}
                                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-600/30 hover:bg-violet-600 text-violet-200 hover:text-white border border-violet-500/40 transition-all flex items-center space-x-1"
                                  title="Load this batch into the studio"
                                >
                                  <span>Load</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>

                                {onDeleteBatch && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteBatch(batch.id);
                                    }}
                                    className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                                    title="Delete batch from history"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Bookmarked Favorites */}
        {activeTab === 'favorites' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {favorites.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2.5">
                  <Heart className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-white">No Bookmarked Favorites Yet</p>
                <p className="text-[11px] text-neutral-400 max-w-xs mt-1 leading-relaxed">
                  Tap the heart icon on any generated wallpaper to bookmark your top AI creations here!
                </p>
              </div>
            ) : (
              favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="p-2.5 rounded-2xl bg-neutral-900/70 border border-white/10 flex items-center justify-between gap-3 hover:border-rose-500/30 transition-colors"
                >
                  <div
                    onClick={() => {
                      onOpenWallpaperFullscreen(fav);
                      onClose();
                    }}
                    className="flex items-center space-x-2.5 min-w-0 cursor-pointer flex-1 text-left"
                  >
                    <img
                      src={fav.imageUrl}
                      alt=""
                      className="w-9 h-16 object-cover rounded-xl border border-white/10 shrink-0"
                    />
                    <div className="truncate">
                      <p className="text-xs font-medium text-white truncate">{fav.prompt}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono">{fav.aspectRatio}</span>
                        <span>•</span>
                        <span className="font-mono">{fav.imageSize}</span>
                        <span>•</span>
                        <span>{getFriendlyDateLabel(getDateKey(fav.createdAt || Date.now()))}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => {
                        onRemixWallpaper(fav);
                        onClose();
                      }}
                      title="Remix this favorite wallpaper"
                      className="p-2 rounded-xl bg-neutral-900 hover:bg-violet-600 border border-white/10 text-neutral-300 hover:text-white transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onToggleFavorite(fav)}
                      title="Remove from favorites"
                      className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer info strip */}
        <div className="p-3 border-t border-white/10 bg-neutral-950/80 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
          <span className="flex items-center space-x-1">
            <CalendarDays className="w-3.5 h-3.5 text-violet-400" />
            <span>Organized chronologically by date of generation</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

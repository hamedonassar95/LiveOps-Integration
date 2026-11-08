export type AspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '9:16'
  | '16:9'
  | '21:9';

export type ImageSize = '1K' | '2K' | '4K';

export interface Wallpaper {
  id: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  model: string;
  variationIndex: number;
  createdAt: number;
}

export interface WallpaperBatch {
  id: string;
  prompt: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  model: string;
  referenceImage?: string;
  wallpapers: Wallpaper[];
  createdAt: number;
}

export interface GenerationSettings {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  model: 'gemini-3-pro-image-preview' | 'gemini-nano-banana-2.1';
}

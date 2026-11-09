import { db } from './index.ts';
import { users, savedWallpapers } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database getOrCreateUser failed:', error);
    throw new Error('Failed to synchronize user record', { cause: error });
  }
}

export async function saveWallpaperToDb(
  userId: number,
  wallpaper: {
    wallpaperId: string;
    imageUrl: string;
    prompt: string;
    aspectRatio: string;
    imageSize: string;
    model: string;
    variationIndex: number;
  }
) {
  try {
    const result = await db
      .insert(savedWallpapers)
      .values({
        userId,
        wallpaperId: wallpaper.wallpaperId,
        imageUrl: wallpaper.imageUrl,
        prompt: wallpaper.prompt,
        aspectRatio: wallpaper.aspectRatio,
        imageSize: wallpaper.imageSize,
        model: wallpaper.model,
        variationIndex: wallpaper.variationIndex,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database saveWallpaperToDb failed:', error);
    throw new Error('Failed to save wallpaper in database', { cause: error });
  }
}

export async function getSavedWallpapersFromDb(userId: number) {
  try {
    return await db
      .select()
      .from(savedWallpapers)
      .where(eq(savedWallpapers.userId, userId))
      .orderBy(desc(savedWallpapers.createdAt));
  } catch (error) {
    console.error('Database getSavedWallpapersFromDb failed:', error);
    throw new Error('Failed to load saved wallpapers from database', { cause: error });
  }
}

export async function deleteSavedWallpaperFromDb(userId: number, wallpaperId: string) {
  try {
    return await db
      .delete(savedWallpapers)
      .where(eq(savedWallpapers.wallpaperId, wallpaperId));
  } catch (error) {
    console.error('Database deleteSavedWallpaperFromDb failed:', error);
    throw new Error('Failed to delete wallpaper from database', { cause: error });
  }
}

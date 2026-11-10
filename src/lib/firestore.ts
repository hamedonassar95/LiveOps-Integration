import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocFromServer,
} from 'firebase/firestore';
import { db, auth } from './firebase.ts';
import { Wallpaper } from '../types.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as required by firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline. Verify configuration.');
    }
    return false;
  }
}

// Save a wallpaper to the user's Firestore subcollection
export async function saveWallpaperToFirestore(userId: string, wallpaper: Wallpaper): Promise<void> {
  const safeWallpaperId = wallpaper.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const path = `users/${userId}/savedWallpapers/${safeWallpaperId}`;

  try {
    const docRef = doc(db, 'users', userId, 'savedWallpapers', safeWallpaperId);
    await setDoc(docRef, {
      id: safeWallpaperId,
      userId,
      imageUrl: wallpaper.imageUrl,
      prompt: wallpaper.prompt || 'VibePaper aesthetic wallpaper',
      aspectRatio: wallpaper.aspectRatio || '9:16',
      imageSize: wallpaper.imageSize || '2K',
      model: wallpaper.model || 'gemini-3-pro-image-preview',
      variationIndex: wallpaper.variationIndex || 1,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Remove a wallpaper from Firestore
export async function removeWallpaperFromFirestore(userId: string, wallpaperId: string): Promise<void> {
  const safeWallpaperId = wallpaperId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const path = `users/${userId}/savedWallpapers/${safeWallpaperId}`;

  try {
    const docRef = doc(db, 'users', userId, 'savedWallpapers', safeWallpaperId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Real-time listener for user's saved wallpapers
export function subscribeToSavedWallpapers(
  userId: string,
  onUpdate: (wallpapers: Wallpaper[]) => void,
  onError?: (error: any) => void
) {
  const path = `users/${userId}/savedWallpapers`;
  const q = query(collection(db, 'users', userId, 'savedWallpapers'));

  return onSnapshot(
    q,
    (snapshot) => {
      const results: Wallpaper[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        results.push({
          id: data.id,
          imageUrl: data.imageUrl,
          prompt: data.prompt,
          aspectRatio: data.aspectRatio,
          imageSize: data.imageSize,
          model: data.model,
          variationIndex: data.variationIndex,
          createdAt: new Date(data.createdAt || Date.now()).getTime(),
          isFavorite: true,
        });
      });
      onUpdate(results);
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}


// Upload wallpaper file directly to user's Google Drive
export async function uploadWallpaperToGoogleDrive(
  accessToken: string,
  wallpaper: Wallpaper
): Promise<{ success: boolean; fileId?: string; webViewLink?: string }> {
  try {
    // 1. Convert base64 or remote URL to Blob
    let blob: Blob;
    if (wallpaper.imageUrl.startsWith('data:')) {
      const parts = wallpaper.imageUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mime });
    } else {
      const resp = await fetch(wallpaper.imageUrl);
      blob = await resp.blob();
    }

    // 2. Prepare multipart metadata & binary body for Google Drive upload
    const metadata = {
      name: `VibePaper_${(wallpaper.prompt || 'Wallpaper').slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`,
      mimeType: 'image/png',
      description: `Generated by VibePaper AI Phone Wallpaper Studio\nPrompt: ${wallpaper.prompt}\nModel: ${wallpaper.model}`,
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', blob);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!uploadRes.ok) {
      const errData = await uploadRes.json();
      throw new Error(errData.error?.message || 'Google Drive upload failed');
    }

    const data = await uploadRes.json();
    return { success: true, fileId: data.id, webViewLink: data.webViewLink };
  } catch (err: any) {
    console.error('Failed to upload to Google Drive:', err);
    throw err;
  }
}

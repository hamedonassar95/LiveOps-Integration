import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(
  app,
  (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-vibepaperaiphone-d7644eec-aeef-4cbf-9a90-4f6aa8f7fd42'
);


export const googleAuthProvider = new GoogleAuthProvider();
// Workspace Drive scope for saving wallpapers directly to user's Google Drive
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.file');
// Workspace Google Forms scopes for feedback and wallpaper vibe polls
googleAuthProvider.addScope('https://www.googleapis.com/auth/forms.body');
googleAuthProvider.addScope('https://www.googleapis.com/auth/forms.responses.readonly');


# Firebase Authentication & Cloud Firestore Persistence Plan

Implement Firebase Authentication (Google Sign-In popup with user avatar) and Cloud Firestore persistence for real-time user bookmarks and generated wallpapers in VibePaper.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your confirmed answers:
> 1. **Persistence Target**: Cloud Firestore will store and synchronize user bookmarks and wallpaper batches with live snapshot updates.
> 2. **Authentication Flow**: Google Sign-In with popup (`signInWithPopup`), displaying user profile photo and email in the top navigation bar.
> 3. **Security Invariant**: Hardened Firestore rules (`firestore.rules`) strictly isolating user bookmarks to `request.auth.uid == userId`.

- **Confirmed Decision 1**: Use Cloud Firestore for bookmarks and wallpapers with full ABAC security rules.
- **Confirmed Decision 2**: Interactive Google Sign-In popup with avatar and sign-out menu in top navigation.

---

## 1. Overview & Core Concept

- **What It Does**:
  - Adds a Google Sign-In button and authenticated user profile avatar in VibePaper's top header.
  - Connects Firestore to sync user bookmarks (`users/{userId}/savedWallpapers`) in real time across devices.
  - Generates `firebase-blueprint.json` and hardened `firestore.rules` adhering to the zero-trust ABAC standard.
  - Adds comprehensive Firestore error handling with `handleFirestoreError`.
- **Target Persona**: Creators who want their saved wallpapers and favorites safely backed up in the cloud across sessions and accessible on any device.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Authentication**: Top bar displays a clean "Sign In with Google" button. Upon clicking, a popup authenticates the user, replacing the button with their Google profile avatar, name, and a sign-out dropdown.
  2. **Bookmarking & Live Sync**: When a signed-in user clicks the heart icon on any generated wallpaper, it writes to `users/{userId}/savedWallpapers/{wallpaperId}` in Firestore with server timestamps.
  3. **Library Integration**: The Favorites tab in the Library drawer reads directly from Firestore's real-time snapshot listener (`onSnapshot`), reflecting saved wallpapers instantly.
  4. **Offline & Guest Fallback**: If not signed in, favorites gracefully store in `localStorage`, and upon signing in, users can sync local favorites to the cloud with one tap.

- **Visual Identity & Theme**:
  - Consistent with VibePaper's dark cyber-glass UI (`bg-neutral-900/90`, `border-white/10`).
  - Google avatar formatted as a 32px circular image with online ring indicator and dropdown sheet.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Client Firestore SDK with ABAC Security Rules**
  - *Chosen Approach*: Use client-side Firebase SDK (`firebase/firestore`, `firebase/auth`) with strict server-side rules.
  - *Why*: Provides sub-100ms real-time bookmark updates (`onSnapshot`) without backend polling latency.
- **Decision 2: Provisioning Flow**
  - *Chosen Approach*: Provision Firestore and Auth using the platform tools (`set_up_firebase` / `ProvisionFirebase`), establishing `firebase-blueprint.json` and deploying `firestore.rules`.

---

## 4. Technical Architecture & Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                       Top Navigation Bar                    │
│   [VibePaper] ··· [Live Voice] [AI Stylist] [Google User]   │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│       FirebaseAuthContext    │ │      Firestore Sync Layer    │
│  • onAuthStateChanged        │ │  • onSnapshot                │
│  • signInWithPopup           │ │  • setDoc / deleteDoc        │
│  • signOut                   │ │  • handleFirestoreError      │
└──────────────┬───────────────┘ └─────────────┬────────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│    firebase-applet-config    │ │    Cloud Firestore Backend   │
│    Project: herculian-...    │ │    Collection: /users        │
└──────────────────────────────┘ └──────────────────────────────┘
```

- **Files to Create / Update**:
  - `firebase-blueprint.json`: IR schema defining `users` and `savedWallpapers`.
  - `firestore.rules`: ABAC zero-trust rules isolating data by `request.auth.uid`.
  - `/src/context/AuthContext.tsx`: React context for Firebase Auth state.
  - `/src/lib/firestore.ts`: Helper methods for bookmarks CRUD with error handling.
  - `/src/App.tsx`: Header user avatar and Firestore state integration.

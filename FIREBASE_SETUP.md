# Firebase Setup for Liberty Poker

## 1. Enable Authentication Methods

In [Firebase Console](https://console.firebase.google.com/) → Your Project → **Authentication** → **Sign-in method**:

- **Email/Password**: Enable
- **Google**: Enable and configure OAuth consent screen if needed

## 2. Deploy Firestore Rules

```bash
firebase deploy --only firestore
```

Or copy the contents of `firestore.rules` into Firebase Console → **Firestore** → **Rules**.

## 3. Create Firestore Database

If you haven't already, create a Firestore database in Firebase Console → **Firestore** → **Create database** (start in test mode, then update rules).

## 4. Add Authorized Domains

In **Authentication** → **Settings** → **Authorized domains**, add:
- `localhost` (for development)
- Your production domain (e.g. `yourapp.vercel.app`)

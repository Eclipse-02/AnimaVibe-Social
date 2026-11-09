# AnimaVibe Social

A mobile social media app built with **React Native (Expo)** and **Firebase**: share posts and 24-hour stories, follow people, comment, get push notifications, and discover content by username, hashtag, or caption.

---

## Features

**Account**
- Register and log in with email/password or Google Sign-In
- Forgot password via email reset
- Edit profile, follow and unfollow users

**Posts and stories**
- Create posts with images, captions, and tagged people (from the gallery or the camera)
- Stories that expire after 24 hours, cleaned up automatically by a scheduled Cloud Function
- Archive posts and stories, then view, unarchive, or repost them from the archive
- Share a post (image and caption) to other apps

**Interaction**
- Likes, comments, and replies, with like animations
- Saved pages: liked posts, bookmarks, and archives
- Interactive photo viewer: pinch to zoom, double-tap to zoom, swipe down to close

**Discovery**
- Search users and posts by username, hashtag, or caption, with debounced Firestore queries
- Trending hashtags and swipeable tabs on the Discovery screen

**Notifications**
- In-app notification list with unread count
- Push notifications through Firebase Cloud Messaging (FCM): a Cloud Function sends a push whenever a notification document is created and disables invalid device tokens

**Reliability**
- Offline banner and cached feed when the device loses its connection
- Loading skeletons on the feed

## Tech stack

| Area | Tools |
|---|---|
| App | React Native, Expo (dev client), React Navigation (stack, tabs, drawer) |
| State | Zustand |
| Animation | Reanimated, Moti, Gesture Handler |
| Backend | Firebase Auth, Cloud Firestore, Cloud Storage, Cloud Functions, Cloud Messaging |
| Build | EAS Build |

The full list of animations, with the screen and gesture behind each one, is in [`docs/ANIMATION_CATALOG.md`](docs/ANIMATION_CATALOG.md).

## Project structure

```
src/
├── components/   Reusable UI (PostCard, PhotoViewer, ConfirmationModal, ...)
├── config/       Firebase setup
├── hooks/        Auth, Google auth, offline cache, theme
├── lib/firestore Data layer: posts, stories, comments, users, notifications
├── navigation/   Root, auth, tab, feed, and profile navigators
├── screens/      auth, feed, story, comments, search, profile, notifications
└── store/        Zustand stores
functions/        Cloud Functions (push notifications, story cleanup)
```

## Running locally

The app uses native Firebase modules, so it needs a **development build**; it does not run in Expo Go.

```sh
npm install
npx expo run:android      # or: npx expo run:ios
```

To build with EAS:

```sh
npx eas build --profile development --platform android
```

To deploy the Cloud Functions:

```sh
cd functions
npm install
npx firebase deploy --only functions
```

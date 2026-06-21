import { create } from 'zustand';

export const useFeedStore = create((set) => ({
  posts: [],
  lastDoc: null,
  isLoadingMore: false,
  appendPosts: (newPosts, cursor) => set((state) => ({
    posts: [...state.posts, ...newPosts],
    lastDoc: cursor
  })),
  reset: () => set({ posts: [], lastDoc: null })
}));

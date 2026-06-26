import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => set((state) => ({
    unreadCount: 0,
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  }))
}));

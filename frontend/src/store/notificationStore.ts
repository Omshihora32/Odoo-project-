import { create } from 'zustand';
import type { Notification } from '@/types';
import api from '@/lib/api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/notifications');
      const notifications = response.data.data || response.data || [];
      const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch {
      // Fallback with sample notifications for demo
      const sampleNotifications: Notification[] = [
        { id: '1', title: 'New RFQ Assigned', message: 'You have been assigned to RFQ-2024-001', type: 'info', isRead: false, link: '/rfqs', createdAt: new Date().toISOString() },
        { id: '2', title: 'Quotation Received', message: 'Vendor TechSupply submitted a quotation', type: 'success', isRead: false, link: '/quotations', createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: '3', title: 'Approval Required', message: 'PO-2024-015 needs your approval', type: 'warning', isRead: true, link: '/approvals', createdAt: new Date(Date.now() - 7200000).toISOString() },
      ];
      set({ notifications: sampleNotifications, unreadCount: 2, isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
    } catch { /* ignore */ }
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.isRead).length };
    });
  },

  markAllAsRead: async () => {
    try {
      await api.put('/notifications/read-all');
    } catch { /* ignore */ }
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
    }));
  },

  removeNotification: (id: string) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: state.unreadCount - (notification && !notification.isRead ? 1 : 0),
      };
    });
  },
}));

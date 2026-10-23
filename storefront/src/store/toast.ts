import { create } from 'zustand';

export interface ToastMessage {
  id: number;
  text: string;
  actionLabel?: string;
  actionTo?: string;
}

interface ToastState {
  toast: ToastMessage | null;
  show: (text: string, action?: { label: string; to: string }) => void;
  hide: () => void;
}

let counter = 0;

export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: (text, action) => set({ toast: { id: ++counter, text, actionLabel: action?.label, actionTo: action?.to } }),
  hide: () => set({ toast: null }),
}));

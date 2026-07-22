import { create } from "zustand";

interface AppUIState {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  chatDraft: string;
  setChatDraft: (draft: string) => void;

  selectedAttachments: File[];
  addAttachment: (file: File) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;

  isMobilePanelOpen: boolean;
  setMobilePanelOpen: (open: boolean) => void;
}

export const useAppUIStore = create<AppUIState>((set) => ({
  isSidebarOpen: true,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  chatDraft: "",
  setChatDraft: (draft) => set({ chatDraft: draft }),

  selectedAttachments: [],
  addAttachment: (file) =>
    set((state) => ({
      selectedAttachments: [...state.selectedAttachments, file],
    })),
  removeAttachment: (index) =>
    set((state) => ({
      selectedAttachments: state.selectedAttachments.filter(
        (_, i) => i !== index,
      ),
    })),
  clearAttachments: () => set({ selectedAttachments: [] }),

  isMobilePanelOpen: false,
  setMobilePanelOpen: (open) => set({ isMobilePanelOpen: open }),
}));
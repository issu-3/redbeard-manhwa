import { create } from 'zustand';
import { Network } from '@capacitor/network';

interface NetworkState {
  isOnline: boolean;
  connectionType: string;
  initNetworkDetection: () => Promise<void>;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true, // Optimistic default
  connectionType: 'unknown',
  
  initNetworkDetection: async () => {
    const status = await Network.getStatus();
    set({ isOnline: status.connected, connectionType: status.connectionType });

    Network.addListener('networkStatusChange', (status) => {
      set({ isOnline: status.connected, connectionType: status.connectionType });
    });
  }
}));

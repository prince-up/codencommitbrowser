import { contextBridge, ipcRenderer } from 'electron';

// Expose safe, tightly-controlled API to the React application
contextBridge.exposeInMainWorld('electronSecureAPI', {
  // Listeners for window-level security violations
  onSecurityViolation: (callback: (violation: string) => void) => {
    ipcRenderer.on('security-violation', (_event, violation) => callback(violation));
  },
  
  // Active Hardware Checks
  checkMultipleMonitors: () => ipcRenderer.invoke('check-multiple-monitors'),
  checkScreenSharing: () => ipcRenderer.invoke('check-screen-sharing')
});

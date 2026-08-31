import { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    kiosk: true,        // Enforce true full screen (blocks OS menus)
    alwaysOnTop: true,  // Prevent other apps from overlaying
    frame: false,
    fullscreenable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,  // Strict: No developer tools allowed
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Completely disable the top menu bar
  mainWindow.setMenu(null);

  // Load the web application (React frontend for the exam)
  // In a production build, this would load a bundled index.html via \`file://\` protocol
  mainWindow.loadURL('http://localhost:3000/exam');

  // Security: Block unauthorized external navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.includes('localhost:3000')) {
      event.preventDefault();
    }
  });

  // Security: Detect focus lost (student tabbed out or opened another app)
  // We emit this to the React app, which sends a Socket.IO flag to the Proctor Engine
  mainWindow.on('blur', () => {
    mainWindow?.webContents.send('security-violation', 'FOCUS_LOST');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Security: Disable dangerous keyboard shortcuts globally
  globalShortcut.register('CommandOrControl+R', () => { /* Block Refresh */ });
  globalShortcut.register('F5', () => { /* Block Refresh */ });
  globalShortcut.register('CommandOrControl+Shift+I', () => { /* Block DevTools */ });
  globalShortcut.register('F12', () => { /* Block DevTools */ });
  globalShortcut.register('CommandOrControl+C', () => { /* Block Copy */ });
  globalShortcut.register('CommandOrControl+V', () => { /* Block Paste */ });
  globalShortcut.register('CommandOrControl+W', () => { /* Block Close Tab */ });
  globalShortcut.register('Alt+Tab', () => { /* OS Level - Handled via Blur event */ });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Detect multiple displays
ipcMain.handle('check-multiple-monitors', async () => {
  const { screen } = require('electron');
  const displays = screen.getAllDisplays();
  return displays.length > 1;
});

// Security: Detect active screen sharing applications natively
ipcMain.handle('check-screen-sharing', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  // If more than one screen source exists, something else is reading the buffer
  return sources.length > 1; 
});

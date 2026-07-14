const { app, BrowserWindow, shell } = require('electron')

const APP_URL = 'https://ielts-ai-checker.netlify.app'

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 360,
    minHeight: 560,
    autoHideMenuBar: true,
    backgroundColor: '#EEF2FA',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadURL(APP_URL)

  // Anything that tries to open a new window (OAuth popups, external links)
  // goes to the system browser instead of a second Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Keep normal in-app navigation (OAuth redirects back to our own domain)
  // inside the window; only hand off truly external domains to the browser.
  win.webContents.on('will-navigate', (event, url) => {
    const target = new URL(url)
    const isOwnOrigin = target.origin === APP_URL || target.hostname.endsWith('supabase.co')
    if (!isOwnOrigin && !target.hostname.includes('accounts.google.com') && !target.hostname.includes('github.com')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

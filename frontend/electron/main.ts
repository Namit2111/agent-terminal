import { app, BrowserWindow, ipcMain } from 'electron'
import { spawn } from 'child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  // Execute command with streaming output and timeout
  ipcMain.handle('execute-command', async (event, command: string, timeout: number = 30) => {
    return new Promise((resolve) => {
      let output = ''
      let errorOutput = ''
      let timedOut = false

      // Spawn PowerShell process
      const child = spawn('powershell.exe', ['-Command', command], {
        shell: false,
        windowsHide: true
      })

      // Set timeout
      const timeoutId = setTimeout(() => {
        timedOut = true
        child.kill('SIGTERM')
        resolve({
          success: false,
          output: output || '',
          error: `Command timed out after ${timeout} seconds`,
          timedOut: true
        })
      }, timeout * 1000)

      // Stream stdout
      child.stdout?.on('data', (data) => {
        const chunk = data.toString()
        output += chunk
        // Send incremental output to renderer
        event.sender.send('command-output', { chunk, completed: false })
      })

      // Stream stderr
      child.stderr?.on('data', (data) => {
        const chunk = data.toString()
        errorOutput += chunk
        event.sender.send('command-output', { chunk, completed: false, error: true })
      })

      // Handle completion
      child.on('close', (code) => {
        clearTimeout(timeoutId)

        if (timedOut) return // Already resolved

        // Send final completion signal
        event.sender.send('command-output', { chunk: '', completed: true })

        if (code !== 0) {
          resolve({
            success: false,
            output: output || '',
            error: errorOutput || `Command exited with code ${code}`,
            timedOut: false
          })
        } else {
          resolve({
            success: true,
            output: output || '',
            error: errorOutput || null,
            timedOut: false
          })
        }
      })

      // Handle errors
      child.on('error', (err) => {
        clearTimeout(timeoutId)
        event.sender.send('command-output', { chunk: '', completed: true })
        resolve({
          success: false,
          output: output || '',
          error: err.message,
          timedOut: false
        })
      })
    })
  })

  createWindow()
})

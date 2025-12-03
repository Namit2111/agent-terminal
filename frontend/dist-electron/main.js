import { app, BrowserWindow, ipcMain } from "electron";
import { spawn } from "child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  ipcMain.handle("execute-command", async (event, command, timeout = 30) => {
    return new Promise((resolve) => {
      var _a, _b;
      let output = "";
      let errorOutput = "";
      let timedOut = false;
      const child = spawn("powershell.exe", ["-Command", command], {
        shell: false,
        windowsHide: true
      });
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        resolve({
          success: false,
          output: output || "",
          error: `Command timed out after ${timeout} seconds`,
          timedOut: true
        });
      }, timeout * 1e3);
      (_a = child.stdout) == null ? void 0 : _a.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        event.sender.send("command-output", { chunk, completed: false });
      });
      (_b = child.stderr) == null ? void 0 : _b.on("data", (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        event.sender.send("command-output", { chunk, completed: false, error: true });
      });
      child.on("close", (code) => {
        clearTimeout(timeoutId);
        if (timedOut) return;
        event.sender.send("command-output", { chunk: "", completed: true });
        if (code !== 0) {
          resolve({
            success: false,
            output: output || "",
            error: errorOutput || `Command exited with code ${code}`,
            timedOut: false
          });
        } else {
          resolve({
            success: true,
            output: output || "",
            error: errorOutput || null,
            timedOut: false
          });
        }
      });
      child.on("error", (err) => {
        clearTimeout(timeoutId);
        event.sender.send("command-output", { chunk: "", completed: true });
        resolve({
          success: false,
          output: output || "",
          error: err.message,
          timedOut: false
        });
      });
    });
  });
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};

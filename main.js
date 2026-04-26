const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')

const PKM_PATH = 'C:\\Users\\User\\Desktop\\PKM LAUNCHER'
const SCRIPTS_PATH = path.join(__dirname, 'scripts')

if (!fs.existsSync(SCRIPTS_PATH)) fs.mkdirSync(SCRIPTS_PATH)

let loginWin, selectWin, mainWin

function createLogin() {
  loginWin = new BrowserWindow({
    width: 400, height: 500,
    frame: false, resizable: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true }
  })
  loginWin.loadFile('login.html')
}

function createSelect() {
  selectWin = new BrowserWindow({
    width: 340, height: 280,
    frame: false, resizable: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true }
  })
  selectWin.loadFile('select.html')
}

function createMain() {
  mainWin = new BrowserWindow({
    width: 920, height: 640,
    frame: false, resizable: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true }
  })
  mainWin.loadFile('index.html')
}

app.whenReady().then(createLogin)

// Login
ipcMain.on('do-login', (e, { user, pass }) => {
  if (user && pass) {
    loginWin.close()
    createSelect()
  } else {
    e.reply('login-error', 'Usuario ou senha invalidos')
  }
})

// Listar processos PKM
ipcMain.handle('list-processes', () => {
  return new Promise((resolve) => {
    exec('tasklist /FO CSV /NH', (err, stdout) => {
      if (err) { resolve([]); return }
      const procs = []
      stdout.split('\n').forEach(line => {
        const parts = line.replace(/"/g,'').split(',')
        if (parts.length >= 2) {
          const name = parts[0].trim()
          const pid = parts[1].trim()
          if (name && pid && (
            name.toLowerCase().includes('pkm') ||
            name.toLowerCase().includes('poke') ||
            name.toLowerCase().includes('tibia') ||
            name.toLowerCase().includes('otclient')
          )) {
            procs.push({ name, pid })
          }
        }
      })
      resolve(procs)
    })
  })
})

// Selecionar cliente
ipcMain.on('select-client', (e, { pid, name }) => {
  if (selectWin) selectWin.close()
  createMain()
})

// Fechar / minimizar
ipcMain.on('close-app', () => { app.quit() })
ipcMain.on('minimize-app', () => { BrowserWindow.getFocusedWindow()?.minimize() })

// Scripts
ipcMain.handle('list-scripts', () => {
  return fs.readdirSync(SCRIPTS_PATH).filter(f => f.endsWith('.lua'))
})
ipcMain.handle('read-script', (e, name) => {
  return fs.readFileSync(path.join(SCRIPTS_PATH, name), 'utf8')
})
ipcMain.handle('save-script', (e, name, content) => {
  fs.writeFileSync(path.join(SCRIPTS_PATH, name), content, 'utf8')
  return true
})
ipcMain.handle('new-script', (e, name) => {
  const file = path.join(SCRIPTS_PATH, name.endsWith('.lua') ? name : name + '.lua')
  fs.writeFileSync(file, '-- ' + name + '\n', 'utf8')
  return true
})
ipcMain.handle('delete-script', (e, name) => {
  fs.unlinkSync(path.join(SCRIPTS_PATH, name))
  return true
})
ipcMain.handle('send-to-pkm', (e, name) => {
  const src = path.join(SCRIPTS_PATH, name)
  const dst = path.join(PKM_PATH, name)
  fs.copyFileSync(src, dst)
  return true
})
ipcMain.handle('import-script', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Lua Scripts', extensions: ['lua'] }],
    properties: ['openFile', 'multiSelections']
  })
  if (canceled) return []
  filePaths.forEach(fp => {
    fs.copyFileSync(fp, path.join(SCRIPTS_PATH, path.basename(fp)))
  })
  return filePaths.map(fp => path.basename(fp))
})

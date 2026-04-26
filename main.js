const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')

const SHIBA_PATH = 'C:\\Users\\User\\Desktop\\shibinha'
const LUA_SCRIPTS = path.join(SHIBA_PATH, 'luascripts')
const LUA_HOTKEYS = path.join(SHIBA_PATH, 'luahotkeys')
const CAVEBOT_SETTINGS = path.join(SHIBA_PATH, 'cavebotsettings')
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

// Listar processos do Shiba/OTC
ipcMain.handle('list-processes', () => {
  return new Promise((resolve) => {
    exec('tasklist /FO CSV /NH', (err, stdout) => {
      if (err) { resolve([]); return }
      const procs = []
      stdout.split('\n').forEach(line => {
        const parts = line.replace(/"/g, '').split(',')
        if (parts.length >= 2) {
          const name = parts[0].trim()
          const pid = parts[1].trim()
          if (name && pid && (
            name.toLowerCase().includes('pkm') ||
            name.toLowerCase().includes('poke') ||
            name.toLowerCase().includes('tibia') ||
            name.toLowerCase().includes('otclient') ||
            name.toLowerCase().includes('amdsoftware') ||
            name.toLowerCase().includes('otc')
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

// Listar scripts Lua (luascripts do Shiba)
ipcMain.handle('list-scripts', () => {
  try { return fs.readdirSync(LUA_SCRIPTS).filter(f => f.endsWith('.lua')) }
  catch { return fs.readdirSync(SCRIPTS_PATH).filter(f => f.endsWith('.lua')) }
})

// Listar hotkeys Lua
ipcMain.handle('list-hotkeys', () => {
  try { return fs.readdirSync(LUA_HOTKEYS).filter(f => f.endsWith('.lua')) }
  catch { return [] }
})

// Listar configs de cavebot salvas
ipcMain.handle('list-configs', () => {
  try { return fs.readdirSync(CAVEBOT_SETTINGS).filter(f => f.endsWith('.xml')) }
  catch { return [] }
})

// Ler script
ipcMain.handle('read-script', (e, name, type) => {
  const folder = type === 'hotkey' ? LUA_HOTKEYS : LUA_SCRIPTS
  try { return fs.readFileSync(path.join(folder, name), 'utf8') }
  catch { return fs.readFileSync(path.join(SCRIPTS_PATH, name), 'utf8') }
})

// Salvar script
ipcMain.handle('save-script', (e, name, content, type) => {
  const folder = type === 'hotkey' ? LUA_HOTKEYS : LUA_SCRIPTS
  fs.writeFileSync(path.join(folder, name), content, 'utf8')
  return true
})

// Novo script
ipcMain.handle('new-script', (e, name, type) => {
  const folder = type === 'hotkey' ? LUA_HOTKEYS : LUA_SCRIPTS
  const file = path.join(folder, name.endsWith('.lua') ? name : name + '.lua')
  fs.writeFileSync(file, '-- ' + name + '\nauto(200)\n', 'utf8')
  return true
})

// Deletar script
ipcMain.handle('delete-script', (e, name, type) => {
  const folder = type === 'hotkey' ? LUA_HOTKEYS : LUA_SCRIPTS
  fs.unlinkSync(path.join(folder, name))
  return true
})

// Importar script externo para luascripts
ipcMain.handle('import-script', async (e, type) => {
  const folder = type === 'hotkey' ? LUA_HOTKEYS : LUA_SCRIPTS
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Lua Scripts', extensions: ['lua'] }],
    properties: ['openFile', 'multiSelections']
  })
  if (canceled) return []
  filePaths.forEach(fp => {
    fs.copyFileSync(fp, path.join(folder, path.basename(fp)))
  })
  return filePaths.map(fp => path.basename(fp))
})

// Salvar config XML (cavebot)
ipcMain.handle('save-config', (e, name, content) => {
  const file = path.join(CAVEBOT_SETTINGS, name.endsWith('.xml') ? name : name + '.xml')
  fs.writeFileSync(file, content, 'utf8')
  return true
})

// Ler config XML
ipcMain.handle('read-config', (e, name) => {
  return fs.readFileSync(path.join(CAVEBOT_SETTINGS, name), 'utf8')
})

// Abrir pasta do Shiba
ipcMain.handle('open-shiba-folder', () => {
  exec(`explorer "${SHIBA_PATH}"`)
  return true
})

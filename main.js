const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const PKM_PATH = 'C:\\Users\\User\\Desktop\\PKM LAUNCHER'
const SCRIPTS_PATH = path.join(__dirname, 'scripts')

if (!fs.existsSync(SCRIPTS_PATH)) fs.mkdirSync(SCRIPTS_PATH)

let loginWin, mainWin

function createLogin() {
  loginWin = new BrowserWindow({
    width: 400, height: 500,
    frame: false, resizable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true }
  })
  loginWin.loadFile('login.html')
}

function createMain() {
  mainWin = new BrowserWindow({
    width: 900, height: 620,
    frame: false, resizable: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true }
  })
  mainWin.loadFile('index.html')
}

app.whenReady().then(createLogin)

// Login
ipcMain.on('do-login', (e, { user, pass }) => {
  if (user && pass) {
    loginWin.close()
    createMain()
  } else {
    e.reply('login-error', 'Usuário ou senha inválidos')
  }
})

// Fechar / minimizar
ipcMain.on('close-app', () => { app.quit() })
ipcMain.on('minimize-app', (e) => {
  BrowserWindow.getFocusedWindow()?.minimize()
})

// Listar scripts
ipcMain.handle('list-scripts', () => {
  return fs.readdirSync(SCRIPTS_PATH).filter(f => f.endsWith('.lua'))
})

// Ler script
ipcMain.handle('read-script', (e, name) => {
  return fs.readFileSync(path.join(SCRIPTS_PATH, name), 'utf8')
})

// Salvar script
ipcMain.handle('save-script', (e, name, content) => {
  fs.writeFileSync(path.join(SCRIPTS_PATH, name), content, 'utf8')
  return true
})

// Novo script
ipcMain.handle('new-script', (e, name) => {
  const file = path.join(SCRIPTS_PATH, name.endsWith('.lua') ? name : name + '.lua')
  fs.writeFileSync(file, '-- ' + name + '\n', 'utf8')
  return true
})

// Deletar script
ipcMain.handle('delete-script', (e, name) => {
  fs.unlinkSync(path.join(SCRIPTS_PATH, name))
  return true
})

// Enviar pro PKM LAUNCHER
ipcMain.handle('send-to-pkm', (e, name) => {
  const src = path.join(SCRIPTS_PATH, name)
  const dst = path.join(PKM_PATH, name)
  fs.copyFileSync(src, dst)
  return true
})

// Importar .lua externo
ipcMain.handle('import-script', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Lua Scripts', extensions: ['lua'] }],
    properties: ['openFile', 'multiSelections']
  })
  if (canceled) return []
  filePaths.forEach(fp => {
    const name = path.basename(fp)
    fs.copyFileSync(fp, path.join(SCRIPTS_PATH, name))
  })
  return filePaths.map(fp => path.basename(fp))
})
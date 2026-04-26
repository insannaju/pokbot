const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  login: (user, pass) => ipcRenderer.send('do-login', { user, pass }),
  onLoginError: (cb) => ipcRenderer.on('login-error', (_, msg) => cb(msg)),
  close: () => ipcRenderer.send('close-app'),
  minimize: () => ipcRenderer.send('minimize-app'),
  listProcesses: () => ipcRenderer.invoke('list-processes'),
  selectClient: (proc) => ipcRenderer.send('select-client', proc),
  listScripts: () => ipcRenderer.invoke('list-scripts'),
  readScript: (name) => ipcRenderer.invoke('read-script', name),
  saveScript: (name, content) => ipcRenderer.invoke('save-script', name, content),
  newScript: (name) => ipcRenderer.invoke('new-script', name),
  deleteScript: (name) => ipcRenderer.invoke('delete-script', name),
  sendToPKM: (name) => ipcRenderer.invoke('send-to-pkm', name),
  importScript: () => ipcRenderer.invoke('import-script'),
})

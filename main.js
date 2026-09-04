const { app, BrowserWindow, Menu, session, dialog } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1150,
    minHeight: 720,
    show: false,
    backgroundColor: '#f4f6fb',
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    title: 'Turnuva Yönetim Sistemi',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      devTools: false
    }
  });

  // Menü çubuğunu tamamen kaldır (Windows/Linux)
  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Geliştirici araçları / yenileme kısayollarını engelle
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = (input.key || '').toLowerCase();
    if (
      key === 'f12' ||
      key === 'f5' ||
      (input.control && input.shift && (key === 'i' || key === 'j' || key === 'c')) ||
      (input.control && key === 'r')
    ) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // JSON dışa aktarımlarında kullanıcıya "Farklı Kaydet" penceresi göster
  // (böylece USB / flash belleğe doğrudan kaydedebilir)
  session.defaultSession.on('will-download', (event, item) => {
    const suggested = item.getFilename();
    const chosenPath = dialog.showSaveDialogSync(mainWindow, {
      title: 'Dışa Aktar',
      defaultPath: suggested,
      filters: [{ name: 'JSON Dosyası', extensions: ['json'] }]
    });
    if (chosenPath) {
      item.setSavePath(chosenPath);
    } else {
      item.cancel();
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

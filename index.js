import ws from 'ws';
import http from 'http';
import childProcess from 'child_process';
const {app, BrowserWindow} = require('electron');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let server;

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600});

  // and load the index.html of the app.
  win.loadURL(`file://${__dirname}/../index.html`);

  // Open the DevTools.
  win.webContents.openDevTools();

  server = http.createServer();
  server.listen(3000);

  const socketServer = new ws.Server({server});

  socketServer.on('connection', (socket) => {
    const tmux = childProcess.spawn('tmux', ['-C'], {tmux: true});

    socket.on('message', (message) => {
      console.log('received:', JSON.stringify(message));
      tmux.stdin.write(message + '\n');
    });

    socket.on('close', () => {
      tmux.kill();
    });

    tmux.stdout.on('data', (data) => {
      data = data.toString('utf8');
      console.log('tmux:', data);
      socket.send(data.toString('utf8'));
    });

    tmux.on('close', () => {
      console.log('tmux exited');
    });
  });

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;

    server.close();

    server = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

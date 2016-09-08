import ws from 'ws';
import express from 'express';
import cors from 'cors';
import http from 'http';
import childProcess from 'child_process';

const app = express();

app.use('/static', express.static('static'));
app.use(cors());

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
});

const server = http.createServer(app);
server.listen(3000);

const socketServer = new ws.Server({server});


socketServer.on('connection', (socket) => {
  const tmux = childProcess.spawn('tmux', ['-C'], {tmux: true});

  socket.on('message', (message) => {
    console.log('received:', JSON.stringify(message));
    tmux.stdin.write('send-keys ' + JSON.stringify(message) + '\n');
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



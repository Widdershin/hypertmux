import ws from 'ws';
import express from 'express';
import cors from 'cors';
import http from 'http';

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
  socket.on('message', (message) => {
    console.log('received:', message);
  });

  socket.send('hello world');
});


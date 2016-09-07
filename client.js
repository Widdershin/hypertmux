import ws from 'ws';

const socket = new WebSocket('ws://localhost:3000');

socket.onmessage = function (event) {
  console.log('received: ', event.data);

  socket.send('wow!');
};


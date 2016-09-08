import ws from 'ws';
import {ansi_to_html, escape_for_html} from 'ansi_up';
import Terminal from 'terminal.js';

const socket = new WebSocket('ws://localhost:3000');
const terminal = new Terminal({ columns: 100, rows: 30 });

socket.onmessage = function (event) {
  event.data.toString('utf-8').split('\n').forEach(line => {
    if (line.startsWith("%output")) {
      line = line.replace(/%output %\d+ /, '');
      line = line.replace(/\\(\d+)/g, (_, match) => String.fromCharCode(parseInt(match, 8)))
      terminal.write(line);

      document.querySelector('.output').innerHTML = terminal.toString('html');
    }
  });
};

document.addEventListener('keydown', (event) => {
  event.preventDefault();

  let keyToSend = event.key;

  if (keyToSend === 'Backspace') {
    keyToSend = 'BSpace';
  }

  if (keyToSend === ' ') {
    keyToSend = 'Space';
  }

  if (keyToSend === '"') {
    keyToSend = '\"'
  }

  if (keyToSend === 'Control' || keyToSend === 'Shift') {
    return;
  }

  if (keyToSend.startsWith('Arrow')) {
    keyToSend = keyToSend.replace('Arrow', '');
  }

  if (event.ctrlKey) {
    keyToSend = `C-${keyToSend}`;
  }

  socket.send(keyToSend);
});

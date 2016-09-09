import ws from 'ws';
import {ansi_to_html, escape_for_html} from 'ansi_up';
import Terminal from 'terminal.js';

const socket = new WebSocket('ws://localhost:3000');

const state = {
  windows: {},
  panes: {},
  activeWindow: null
}

function Pane (number, {rows, columns, width, height, x, y, element, pre, terminal}) {
  if (!element) {
    const output = document.querySelector('.output');
    element = document.createElement('div');
    pre = document.createElement('pre');
    element.classList.add('pane');
    element.appendChild(pre);

    output.appendChild(element);

    element.addEventListener('click', function (event) {
      socket.send(`select-pane -t %${number}`)
    });

    element.style.width = `${width}vw`;
    element.style.height = `${height}vh`;
  }

  if (!terminal) {
    terminal = new Terminal({columns, rows});
  }

  return {
    number,
    width,
    height,
    x,
    y,

    rows,
    columns,

    element,
    pre,

    terminal,

    update ({rows, columns, width, height, x, y}) {
      terminal.state.resize({columns, rows});

      element.style.width = `${width}vw`;
      element.style.height = `${height}vh`;

      return Pane(
        number,
        {
          width,
          height,
          x,
          y,
          rows,
          columns,
          element,
          terminal,
          pre
        }
      )
    },

    write (input) {
      terminal.write(input);

      pre.innerHTML = terminal.toString('html');
    },

    browse (url) {
      const iframe = document.createElement('webview');
      iframe.src = url;

      pre.style.display = 'none';

      element.appendChild(iframe);
    }
  }
}

function Window (number, name = null) {
  if (!name) {
    name = number.toString();
  }

  return {
    number,
    name
  }
}

function makeOrUpdatePane (paneNumber, {rows, columns, width, height, x, y}) {
  if (!state.panes[paneNumber]) {
    state.panes[paneNumber] = Pane(paneNumber, {rows, columns, width, height, x, y});
  } else {
    state.panes[paneNumber] = state.panes[paneNumber].update({rows, columns, width, height, x, y});
  }

  state.panes[paneNumber].write('');
}

function findWindowNumber (line) {
  return parseInt(/@(\d+)/.exec(line)[1], 10);
}

function findPaneNumber (line) {
  return parseInt(/%output %(\d+)/.exec(line)[1], 10);
}

socket.onmessage = function (event) {
  event.data.toString('utf-8').split('\n').forEach(line => {
    if (line.startsWith("%window-add")) {
      const windowNumber = findWindowNumber(line);

      state.activeWindow = windowNumber;
      state.windows[windowNumber] = Window(windowNumber);
    }

    if (line.startsWith("%layout-change")) {
      const singlePaneMatch = /@(\d+) (\w+),(\d+)x(\d+),(\d+),(\d+),(\d+)/.exec(line);

      if (singlePaneMatch) {
        const [_, windowNumber, layoutName, columns, rows, x, y, paneNumber] = singlePaneMatch;
        const width = 100;
        const height = 100;
        makeOrUpdatePane(paneNumber, {width, height, rows, columns, x, y});
        return;
      }

      const multiPaneMatch = /@(\d+) (\w+),(\d+)x(\d+),(\d+),(\d+)\{(.*)\}/.exec(line);
      const [_, windowNumber, layoutName, columns, rows, x, y, panesString] = multiPaneMatch;

      const panes = panesString.split(',');

      const paneCount = panes.length / 4;

      let panesCreated = 0;

      while (panesCreated < paneCount) {
        const [paneColumns, paneRows] = panes.shift().split('x').map(i => parseInt(i, 10));
        const x = parseInt(panes.shift(), 10);
        const y = parseInt(panes.shift(), 10);
        const paneNumber = parseInt(panes.shift(), 10);

        const paneWidth = (paneColumns / columns) * 100;
        const paneHeight = (paneRows / rows) * 100;

        makeOrUpdatePane(paneNumber, {width: paneWidth, height: paneHeight, rows, columns, x, y})

        panesCreated++;
      }
    }

    if (line.startsWith("%output")) {
      const paneNumber = findPaneNumber(line)
      line = line.replace(/%output %\d+ /, '');
      line = line.replace(/\\(\d{3})/g, (_, match) => String.fromCharCode(parseInt(match, 8)))
      line = line.replace(/\033k\w+/, '');

      const urlToOpen = /.*\033browse (.*)\033.*/.exec(line);

      const pane = state.panes[paneNumber];

      if (urlToOpen) {
        pane.browse(urlToOpen[1])
        return;
      };

      pane.write(line);
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

  if (keyToSend === "'") {
    keyToSend = '\"\'\"';
  }

  if (keyToSend === '"') {
    keyToSend = '\'\"\'';
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

  socket.send('send-keys ' + keyToSend);
});

window.addEventListener('resize', (event) => {
  const columns = Math.floor(window.innerWidth / 10); // this is a hack, (values precomputed for the font "Hack")
  const rows = Math.floor(window.innerHeight / 20);

  socket.send(`refresh-client -C ${columns},${rows}`);
});

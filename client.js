import {run} from '@cycle/xstream-run';
import {makeDOMDriver, pre} from '@cycle/dom';
import xs from 'xstream';
import Terminal from 'terminal.js';

function tmuxDriver (sink$, streamAdapter) {
  const socket = new WebSocket('ws://localhost:3000');
  const {observer, stream} = streamAdapter.makeSubject();

  sink$.addListener({
    next (message) {
      socket.send(message);
    },

    error (err) {
      throw err;
    },

    complete () {
    }
  });

  socket.onmessage = function passMessageToStream (message) {
    message.data
      .split('\n')
      .filter(message => message.length > 0)
      .forEach(observer.next);
  };

  return stream;
}

function readyOutput (output) {
  return output
    .replace(/\\(\d{3})/g, (_, match) => String.fromCharCode(parseInt(match, 8)))
    .replace(/\033k\w+/, '');
}

function outputMessageToAction (message) {
  const [_, paneNumber, ...output] = message.split(' ');

  return {
    type: 'OUTPUT',
    paneNumber: paneNumber.replace('%', ''),
    output: readyOutput(output.join(' '))
  };
}

const reducers = {
  OUTPUT (state, action) {
    let terminal = state.terminals[action.paneNumber];

    if (!terminal) {
      terminal = state.terminals[action.paneNumber] = new Terminal();
    }

    terminal.write(action.output);
    state.activeTerminal = action.paneNumber;

    return state;
  }
};



function update (state, action) {
  if (!reducers[action.type]) {
    throw new Error('write a reducer for ' + action.type);
  }

  return reducers[action.type](state, action);
}

function main ({DOM, Tmux}) {
  const outputAction$ = Tmux
    .filter(message => message.startsWith('%output'))
    .map(outputMessageToAction);
  // Given a stream of messages from tmux
  //
  // Start with a state object
  //
  // windows: {windowNumber => windowInfo}
  // terminals: {paneNumber => terminal}
  // layout

  const initialState = {
    terminals: {},
    activeTerminal: null
  };

  const action$ = xs.merge(
    outputAction$
  );

  const state$ = action$.fold(update, initialState);

  const input$ = DOM
    .select('document')
    .events('keydown')
    .map(parseInputEvent);

  return {
    DOM: state$.map(
      state => state.activeTerminal ? pre({props: {innerHTML: state.terminals[state.activeTerminal].toString('html') }}) : pre(JSON.stringify(state, null, 2))
    ),

    Tmux: input$
  };
}

function parseInputEvent (event) {
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

  return `send-keys ${keyToSend}`;
}

const drivers = {
  DOM: makeDOMDriver('.app'),
  Tmux: tmuxDriver
};

run(main, drivers);

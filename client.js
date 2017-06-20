import {run} from '@cycle/xstream-run';
import {makeDOMDriver,} from '@cycle/dom';
import xs from 'xstream';
import fromEvent from 'xstream/extra/fromEvent';
import debounce from 'xstream/extra/debounce';
import dropRepeats from 'xstream/extra/dropRepeats';

import {cake} from './cake';
import features from './src/features';
import {view} from './src/view';

function resizeDriver () {
  return fromEvent(window, 'resize');
}

function tmuxDriver (sink$, streamAdapter) {
  const socket = new WebSocket('ws://localhost:3000');
  const {observer, stream} = streamAdapter.makeSubject();

  socket.onopen = function passStreamToWebsocket () {
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
  };

  socket.onmessage = function passMessageToStream (message) {
    observer.next(message.data);
  };

  return stream;
}

function update (reducers) {
  return function update (state, action) {
    if (!reducers[action.type]) {
      throw new Error('write a reducer for ' + action.type + '\n' + JSON.stringify(action));
    }

    return reducers[action.type](state, action);
  }
}

function main (sources) {
  const {DOM, Tmux, Resize} = sources;

  const initialState = {
    activePane: null,
    terminals: {},
    layout: null,
    leaderPressed: false,
    messages: [],
    messageCount: 0,
    binds: []
  };

  const {reducers, action$} = cake(features, sources);

  const state$ = action$.fold(update(reducers), initialState);

  const focusPane$ = DOM
    .select('.pane')
    .events('click')
    .map(focusPane);

  const resize$ = Resize
    .compose(debounce(250))
    .startWith({}) // calculate initial size
    .map(updateTerminalSize);

  const messagesFromState$ = state$
    .compose(dropRepeats((a, b) => a.messageCount === b.messageCount))
    .map(state => state.messages)
    .map(xs.fromArray)
    .flatten();

  const messagesToTmux$ = xs.merge(
    resize$,
    focusPane$,
    messagesFromState$
  );

  return {
    DOM: state$.map(view),
    Tmux: messagesToTmux$
  };
}

function updateTerminalSize () {
  const columns = Math.floor(window.innerWidth / 9.6); // this is a hack, (values precomputed for the font "Hack")
  const rows = Math.floor(window.innerHeight / 18.9);

  return `refresh-client -C ${columns},${rows}`;
}

function focusPane (event) {
  const paneNumber = event.currentTarget.dataset.number;

  return `select-pane -t %${paneNumber}`;
}

const drivers = {
  DOM: makeDOMDriver('.app'),
  Tmux: tmuxDriver,
  Resize: resizeDriver
};

run(main, drivers);

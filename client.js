import {run} from '@cycle/xstream-run';
import {makeDOMDriver, pre, div, h, input, button, span} from '@cycle/dom';
import eachCons from 'each-cons';
import _ from 'lodash';
import Terminal from 'terminal.js';
import TerminalHTMLOutput from 'terminal.js/lib/output/html';
import xs from 'xstream';
import fromEvent from 'xstream/extra/fromEvent';
import debounce from 'xstream/extra/debounce';
import dropRepeats from 'xstream/extra/dropRepeats';

import parseTmuxLayout from './src/parse-layout';
import parseBinds from './src/parse-binds';

const COLORS = new TerminalHTMLOutput().colors;

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
    if (message.data.startsWith('%update-binds')) {
      observer.next(message.data);

      return;
    }

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
  const [_, paneNumber, ...output] = message.split(' '); // eslint-disable-line no-unused-vars

  return {
    type: 'OUTPUT',

    paneNumber: paneNumber.replace('%', ''),
    output: readyOutput(output.join(' '))
  };
}

function updateLayoutToAction (message) {
  const [_, ...layoutDetails] = message.split(' '); // eslint-disable-line no-unused-vars

  return {
    type: 'UPDATE_LAYOUT',

    newLayout: parseTmuxLayout(layoutDetails.join(' '))
  };
}

function updateBindsToAction (message) {
  message = message.replace('%update-binds ');

  return {
    type: 'UPDATE_BINDS',

    newBinds: parseBinds(message)
  };
}

function keyEventToAction (event) {
  const key = parseInputEvent(event);

  return {
    type: 'KEY_INPUT',

    key,

    isLeader: key === 'C-Space'
  };
}

function closeBrowserEventToAction (event) {
  const browserElement = findParent(event.target, '.browser');
  const paneNumber = browserElement.dataset.number;

  return {
    type: 'CLOSE_BROWSER',

    paneNumber
  };
}

function findParent (element, className) {
  if (!element.parentElement) {
    return null;
  }

  if (element.parentElement.classList.contains(className.replace(/^\./, ''))) {
    return element.parentElement;
  }

  return findParent(element.parentElement, className);
}

const reducers = {
  OUTPUT (state, action) {
    let terminal = state.terminals[action.paneNumber];

    if (!terminal) {
      terminal = state.terminals[action.paneNumber] = new Terminal();
    }

    const urlToBrowseRegex = /\033browse ([^\033]*)/;
    const urlToBrowse = action.output.match(urlToBrowseRegex);

    if (urlToBrowse) {
      state.terminals[action.paneNumber].browsing = urlToBrowse[1];

      return state;
    }

    terminal.write(action.output);

    return state;
  },

  UPDATE_LAYOUT (state, action) {
    state.layout = action.newLayout;

    const panes = findPanes(state.layout);

    panes.forEach(pane => {
      let terminal = state.terminals[pane.number];

      if (!terminal) {
        terminal = state.terminals[pane.number] = new Terminal();
      }

      terminal.state.resize({rows: pane.rows, columns: pane.columns});
    });

    return state;
  },

  KEY_INPUT (state, action) {
    if (action.isLeader) {
      state.leaderPressed = true;

      return state;
    }

    const bind = state.binds.find(bind => {
      const rightKey = bind.key === action.key;
      const root = bind.type === 'root';
      const leader = state.leaderPressed && bind.type === 'prefix';

      return rightKey && (root || leader);
    });

    if (bind) {
      return Object.assign({}, state, {
        messageCount: state.messageCount + 1,

        messages: [
          bind.command
        ],

        leaderPressed: false
      });
    }

    if (action.key === undefined) {
      return state;
    }

    return Object.assign({}, state, {
      messageCount: state.messageCount + 1,
      messages: [
        `send-keys ${sanitizeSendKeys(action.key)}`
      ],
      leaderPressed: false
    });
  },

  UPDATE_BINDS (state, action) {
    state.binds = action.newBinds;

    return state;
  },

  CLOSE_BROWSER (state, action) {
    state.terminals[action.paneNumber].browsing = null;

    return state;
  }
};

function findPanes (layout) {
  if (layout.type === 'pane') {
    return [layout];
  }

  return _.flatten(layout.children.map(findPanes));
}

function update (state, action) {
  if (!reducers[action.type]) {
    throw new Error('write a reducer for ' + action.type + '\n' + JSON.stringify(action));
  }

  return reducers[action.type](state, action);
}

function main ({DOM, Tmux, Resize}) {
  const outputAction$ = Tmux
    .filter(message => message.startsWith('%output'))
    .map(outputMessageToAction);

  const updateLayoutAction$ = Tmux
    .filter(message => message.startsWith('%layout-change'))
    .map(updateLayoutToAction);

  const updateBindsAction$ = Tmux
    .filter(message => message.startsWith('%update-binds'))
    .map(updateBindsToAction);

  const keydownAction$ = DOM
    .select('document')
    .events('keydown')
    .map(keyEventToAction);

  const closeBrowser$ = DOM
    .select('.browser .close')
    .events('click')
    .map(closeBrowserEventToAction);

  const initialState = {
    terminals: {},
    layout: null,
    leaderPressed: false,
    messages: [],
    messageCount: 0,
    binds: []
  };

  const action$ = xs.merge(
    outputAction$,
    updateLayoutAction$,
    updateBindsAction$,
    keydownAction$,
    closeBrowser$
  );

  const state$ = action$.fold(update, initialState);

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

function view (state) {
  if (!state.layout) {
    return pre('Connecting to tmux...');
  }

  return renderLayout(state, state.layout);
}

function renderLayout (state, layout) {
  if (layout.type === 'pane') {
    return renderPane(state, layout);
  } else if (layout.type === 'container') {
    return renderContainer(state, layout);
  }

  throw new Error('Invalid layout type: ' + JSON.stringify(layout));
}

function renderPane (state, pane) {
  const style = {
    width: `${pane.width}vw`,
    height: `${pane.height}vh`
  };

  const urlToBrowse = state.terminals[pane.number].browsing;

  if (urlToBrowse) {
    return (
      div('.browser', {attrs: {'data-number': pane.number}}, [
        div('.controls', [
          button('.close', 'Close'),
          input({attrs: {value: urlToBrowse}}),
          button('.back', 'Back'),
          button('.forward', 'Forward')
        ]),

        h('webview', {
          key: `webview-${pane.number}`,
          style,
          attrs: {
            'data-number': pane.number,
            src: state.terminals[pane.number].browsing
          }
        })
      ])
    );
  }

  return (
    pre('.pane', {
      key: `pane-${pane.number}`,
      style,
      attrs: {
        'data-number': pane.number
      }
    }, [renderTerminal(state.terminals[pane.number])])
  );
}

function renderTerminal (terminal) {
  const lines = _.range(terminal.state.rows).map(terminal.state.getLine.bind(terminal.state));

  return (
    div('.terminal', lines.map((line, index) => renderTerminalLine(terminal, line, index)))
  )
}

function renderTerminalLine (terminal, line, index) {
  const colorSegmentIndexes = Object.keys(line.attr).concat(line.str.length + 1);
  const colorSegmentIndexPairs = eachCons(colorSegmentIndexes, 2);

  const colorSegments = colorSegmentIndexPairs.map(([start, end], segmentIndex) => {
    const attr = line.attr[start];

    const style = {
      background: COLORS[attr.bg],
      color: COLORS[attr.fg]
    };

    return (
      span(
        '.line-segment',
        {style, key: '' + index + segmentIndex},
        line.str.slice(start, end)
      )
    );
  });

  return (
    div('.terminal-line', {key: index}, colorSegments)
  );
}

function divider (container) {
  let style;

  if (container.direction === 'row') {
    style = {
      width: '10px',
      height: `${container.height}vh`
    };
  } else {
    style = {
      width: `${container.width}vw`,
      height: '10px'
    };
  }

  return (
    div('.divider', {style})
  );
}

function renderContainer (state, container) {
  const style = {
    display: 'flex',
    'flex-direction': container.direction,
    width: `${container.width}vw`,
    height: `${container.height}vh`
  };

  const childrenWithDividers = _.flatten(
    container.children.map((layout, index) => {
      if (index === 0) {
        return renderLayout(state, layout);
      }

      return [
        divider(container),
        renderLayout(state, layout)
      ];
    })
  );

  return (
    div('.container', {style}, childrenWithDividers)
  );
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

function sanitizeSendKeys (keyToSend) {
  if (keyToSend === '$') {
    return '"\\$"';
  }

  if (keyToSend === ';') {
    return '"\\\\;"'
  }

  const charactersToSanitize = [
    '#',
    "'",
    '"',
    ';'
  ];

  if (!charactersToSanitize.includes(keyToSend)) {
    return keyToSend;
  }

  return JSON.stringify(keyToSend);
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

  if (keyToSend === 'Control' || keyToSend === 'Shift' || keyToSend === 'Meta') {
    return;
  }

  if (keyToSend.startsWith('Arrow')) {
    keyToSend = keyToSend.replace('Arrow', '');
  }

  if (event.ctrlKey) {
    keyToSend = `C-${keyToSend}`;
  }

  if (event.metaKey) {
    keyToSend = `M-${keyToSend}`;
  }

  return keyToSend;
}

const drivers = {
  DOM: makeDOMDriver('.app'),
  Tmux: tmuxDriver,
  Resize: resizeDriver
};

run(main, drivers);

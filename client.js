import {run} from '@cycle/xstream-run';
import {makeDOMDriver, pre, div} from '@cycle/dom';
import xs from 'xstream';
import Terminal from 'terminal.js';
import parseTmuxLayout from './src/parse-layout';
import _ from 'lodash';

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

function updateLayoutToAction (message) {
  const [_, ...layoutDetails] = message.split(' ');

  return {
    type: 'UPDATE_LAYOUT',

    newLayout: parseTmuxLayout(layoutDetails.join(' '))
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

function main ({DOM, Tmux}) {
  const outputAction$ = Tmux
    .filter(message => message.startsWith('%output'))
    .map(outputMessageToAction);

  const updateLayoutAction$ = Tmux
    .filter(message => message.startsWith('%layout-change'))
    .map(updateLayoutToAction);

  const initialState = {
    terminals: {},
    layout: null
  };

  const action$ = xs.merge(
    outputAction$,
    updateLayoutAction$
  );

  const state$ = action$.fold(update, initialState);

  const input$ = DOM
    .select('document')
    .events('keydown')
    .map(parseInputEvent);

  return {
    DOM: state$.map(view),
    Tmux: input$
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

  return (
    pre('.pane', {
      key: `pane-${pane.number}`,
      style,
      props: {
        innerHTML: state.terminals[pane.number].toString('html')
      }
    })
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

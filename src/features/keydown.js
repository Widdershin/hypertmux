function sanitizeSendKeys (keyToSend) {
  if (keyToSend === '$') {
    return '"\\$"';
  }

  if (keyToSend === ';') {
    return '"\\\\;"';
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
  //event.preventDefault();

  let keyToSend = event.key;

  if (keyToSend === 'Backspace') {
    keyToSend = 'BSpace';
  }

  if (keyToSend === ' ') {
    keyToSend = 'Space';
  }

  if (keyToSend === 'Control' || keyToSend === 'Shift' || keyToSend === 'Meta' || keyToSend === 'Alt') {
    return;
  }

  if (keyToSend.startsWith('Arrow')) {
    keyToSend = keyToSend.replace('Arrow', '');
  }

  if (event.ctrlKey && event.shiftKey && event.keyToSend === 'C') {
    return;
  }

  if (event.ctrlKey) {
    keyToSend = `C-${keyToSend}`;
  }

  if (event.metaKey) {
    keyToSend = `M-${keyToSend}`;
  }

  if (keyToSend === "~") {
    keyToSend = JSON.stringify(keyToSend);
  }

  return keyToSend;
}

export function keydown (sources) {
  const action$ = sources.DOM
    .select('document')
    .events('keydown')
    .map(keyEventToAction);

  function keyEventToAction (event) {
    const key = parseInputEvent(event);

    return {
      type: 'KEY_INPUT',

      key,

      isLeader: key === 'C-Space'
    };
  }

  const reducers = {
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
    }
  }

  return {action$, reducers};
}

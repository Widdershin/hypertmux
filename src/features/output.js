import Terminal from 'terminal.js'

function readyOutput (output) {
  return output
    .replace(/\\(\d{3})/g, (_, match) => String.fromCharCode(parseInt(match, 8)))
    .replace(/\033k\w+/, '');
}

export function output (sources) {
  const action$ = sources.Tmux
    .filter(message => message.startsWith('%output'))
    .map(outputMessageToAction);

  function outputMessageToAction (message) {
    const [_, paneNumber, ...output] = message.split(' '); // eslint-disable-line no-unused-vars

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

      const urlToBrowseRegex = /\033browse ([^\033]*)/;
      const urlToBrowse = action.output.match(urlToBrowseRegex);

      if (urlToBrowse) {
        state.terminals[action.paneNumber].browsing = urlToBrowse[1];

        return state;
      }

      terminal.write(action.output);

      return state;
    }
  }

  return {action$, reducers};
}

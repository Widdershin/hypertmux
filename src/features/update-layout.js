import parseTmuxLayout from '../parse-layout';
import Terminal from 'terminal.js';
import _ from 'lodash';

function findPanes (layout) {
  if (layout.type === 'pane') {
    return [layout];
  }

  return _.flatten(layout.children.map(findPanes));
}

export function updateLayout (sources) {
  const action$ = sources.Tmux
    .filter(message => message.startsWith('%layout-change'))
    .map(updateLayoutToAction);

  function updateLayoutToAction (message) {
    const [_, ...layoutDetails] = message.split(' '); // eslint-disable-line no-unused-vars

    return {
      type: 'UPDATE_LAYOUT',

      newLayout: parseTmuxLayout(layoutDetails.join(' '))
    };
  }

  const reducers = {
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
  }

  return {action$, reducers};
}

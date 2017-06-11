export function windowPaneChanged (sources) {
  const action$ = sources.Tmux
    .filter(message => message.startsWith('%window-pane-changed'))
    .map(windowPaneChangedAction);

  const WINDOW_PANE_CHANGED_RE = /%window-pane-changed @(\d+) %(\d+)/

  function windowPaneChangedAction (message) {
    const match = message.match(WINDOW_PANE_CHANGED_RE);

    const [_, windowNumber, paneNumber] = match;

    return {
      type: 'WINDOW_PANE_CHANGED',

      windowNumber: parseInt(windowNumber, 10),
      paneNumber: parseInt(paneNumber, 10)
    }
  }

  const reducers = {
    WINDOW_PANE_CHANGED (state, action) {
      state.activePane = action.paneNumber;

      return state;
    }
  }

  return {action$, reducers};
}

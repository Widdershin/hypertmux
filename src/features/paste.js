export function paste (sources) {
  const action$ = sources.DOM
    .select('document')
    .events('paste')
    .map(pasteEventToAction);

  function pasteEventToAction (event) {
    return {
      type: 'PASTE',

      paste: event.clipboardData.getData('text/plain')
    }
  }

  const reducers = {
    PASTE (state, action) {
      return Object.assign({}, state, {
        messageCount: state.messageCount + 1,
        messages: [
          `send-keys \"${action.paste}\"`
        ],
        leaderPressed: false
      });
    }
  }

  return {action$, reducers};
}

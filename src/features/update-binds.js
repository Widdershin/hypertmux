import parseBinds from '../parse-binds';

export function updateBinds (sources) {
  const action$ = sources.Tmux
    .filter(message => message.startsWith('%update-binds'))
    .map(updateBindsToAction);

  function updateBindsToAction (message) {
    message = message.replace('%update-binds ');

    return {
      type: 'UPDATE_BINDS',

      newBinds: parseBinds(message)
    };
  }

  const reducers = {
    UPDATE_BINDS (state, action) {
      state.binds = action.newBinds;

      return state;
    }
  }

  return {action$, reducers};
}

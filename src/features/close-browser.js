function findParent (element, className) {
  if (!element.parentElement) {
    return null;
  }

  if (element.parentElement.classList.contains(className.replace(/^\./, ''))) {
    return element.parentElement;
  }

  return findParent(element.parentElement, className);
}

export function closeBrowser (sources) {
  const action$ = sources.DOM
    .select('.browser .close')
    .events('click')
    .map(closeBrowserEventToAction);

  function closeBrowserEventToAction (event) {
    const browserElement = findParent(event.target, '.browser');
    const paneNumber = browserElement.dataset.number;

    return {
      type: 'CLOSE_BROWSER',

      paneNumber
    };
  }

  const reducers = {
    CLOSE_BROWSER (state, action) {
      state.terminals[action.paneNumber].browsing = null;

      return state;
    }
  }

  return {action$, reducers};
}

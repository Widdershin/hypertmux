import {pre, div, h, input, button, span} from '@cycle/dom';
import TerminalHTMLOutput from 'terminal.js/lib/output/html';
import _ from 'lodash';

const COLORS = new TerminalHTMLOutput().colors;

export function view (state) {
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
      class: {
        active: state.activePane === pane.number
      },
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
  );
}

function addSegment (state) {
  const previousAttr = state.currentInfo;

  if (state.currentSegment !== '') {
    const style = {
      background: COLORS[previousAttr.bg],
      color: COLORS[previousAttr.fg]
    };

    state.segments.push(
      span(
        '.line-segment',
        {style}, // todo - key
        state.currentSegment
      )
    );
  }

  state.currentSegment = '';

  return state;
}

function lineIntoSegments (terminal, line, state, character, index, cursorIndex) {
  const characterIsCursor = index === cursorIndex;

  if (characterIsCursor) {
    state = addSegment(state);

    const cursorCharacter = character.trim() === ''
      ? ' '
      : character;

    state.segments.push(
      span(
        '.line-segment.cursor',
        {key: 'cursor'},
        cursorCharacter
      )
    );
  }

  if (index in line.attr || character === '\n') {
    state = addSegment(state);

    state.currentInfo = line.attr[index];
  }

  if (!characterIsCursor) {
    state.currentSegment += character;
  }

  return state;
}

function renderTerminalLine (terminal, line, index) {
  const initialSegmentsState = {
    segments: [],
    currentSegment: '',
    currentInfo: null
  };

  const cursorIndex = terminal.state.cursor.y === index
    ? terminal.state.cursor.x
    : null;

  const {segments} = line.str.split('').concat('\n').reduce(
    (state, character, index) => lineIntoSegments(terminal, line, state, character, index, cursorIndex),
    initialSegmentsState
  );

  return (
    div('.terminal-line', {key: index}, segments)
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


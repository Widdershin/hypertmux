// 447b,80x24,0,0{40x24,0,0,328,39x24,41,0[39x12,41,0,329,39x11,41,13,330]}
// first comes the window id
// then the rest
// parse values separated by commas
//  if we reach the end of the line
//    flush the currentValue
//
// if we have 4 values
//  we have a single pane
//    dimensions,x,y,paneNumber
//
//  if we reach a { or [, and we have 3 valeus
//    we have a container
//      { = horizontal
//      [ = vertical
//      dimensions,x,y
function parseLayoutChar (state, char) {
  if (char.match(/\w/)) {
    state.currentValue += char;

    return state;
  };

  if (char === ',') {
    state.values.push(state.currentValue);
    state.currentValue = '';

    return state;
  }

  if (char === '\n') {
    if (state.values.length === 0) {
      return state;
    }

    state.values.push(state.currentValue);
    state.currentValue = '';

    const [
      layoutName,
      dimensionsString,
      xString,
      yString,
      paneNumber
    ] = state.values;

    const [columns, rows] = dimensionsString.split('x');

    state.output = {
      type: 'pane',

      columns,
      rows,
      width: 100,
      height: 100,
      number: parseInt(paneNumber, 10)
    };

    return state;
  }

  if (char === '{') {
    state.values.push(state.currentValue);
    state.currentValue = '';

    const [
      layoutName,
      dimensionsString,
      xString,
      yString,
    ] = state.values.splice(0, 4);

    const [columns, rows] = dimensionsString.split('x').map(i => parseInt(i, 10));

    state.output = {
      type: 'container',
      direction: 'row',
      columns,
      rows,
      width: 100,
      height: 100,
      children: []
    }

    return state;
  }

  if (char === '}') {
    state.values.push(state.currentValue);
    state.currentValue = '';

    const numberOfPanes = state.values.length / 4;

    let numberOfCreatedPanes = 0;

    while (numberOfCreatedPanes < numberOfPanes) {
      const paneValues = state.values.splice(0, 4);

      const [
        dimensionsString,
        xString,
        yString,
        paneNumber
      ] = paneValues;

      const [columns, rows] = dimensionsString.split('x').map(i => parseInt(i, 10));

      state.output.children.push({
        type: "pane",
        columns,
        rows,
        number: parseInt(paneNumber, 10),
        width: columns / state.output.columns * 100,
        height: rows / state.output.rows * 100
      })

      numberOfCreatedPanes++;
    }
    return state;
  }

  if (char === '[') {
    state.values.push(state.currentValue);
    state.currentValue = '';

    const [
      layoutName,
      dimensionsString,
      xString,
      yString,
    ] = state.values.splice(0, 4);

    const [columns, rows] = dimensionsString.split('x').map(i => parseInt(i, 10));

    state.output = {
      type: 'container',
      direction: 'column',
      columns,
      rows,
      width: 100,
      height: 100,
      children: []
    }

    return state;
  }

  if (char === ']') {
    state.values.push(state.currentValue);
    state.currentValue = '';

    const numberOfPanes = state.values.length / 4;

    let numberOfCreatedPanes = 0;

    while (numberOfCreatedPanes < numberOfPanes) {
      const paneValues = state.values.splice(0, 4);

      const [
        dimensionsString,
        xString,
        yString,
        paneNumber
      ] = paneValues;

      const [columns, rows] = dimensionsString.split('x').map(i => parseInt(i, 10));

      state.output.children.push({
        type: "pane",
        columns,
        rows,
        number: parseInt(paneNumber, 10),
        width: columns / state.output.columns * 100,
        height: rows / state.output.rows * 100
      })

      numberOfCreatedPanes++;
    }
    return state;
  }

  throw new Error(`Unhandled character "${char}"`);
}

// reduce each char in layout details
//   break up into sections
//   assign to stuff

export default function parseTmuxLayout (layoutString) {
  const [windowName, details] = layoutString.split(' ');

  const initialState = {
    currentValue: '',
    values: [],
    ouput: {}
  }

  const outputState = details.split('').concat('\n').reduce(parseLayoutChar, initialState);

  return outputState.output;
}

/* globals describe, it */
import assert from 'assert';;
import parseTmuxLayout from '../src/parse-layout';

describe('parseTmuxLayout', () => {
  it('parses a single layout', () => {
    const input = '@165 ace3,80x24,0,0,313';

    const output = {
      type: 'pane',
      columns: 80,
      rows: 24,
      width: 100,
      height: 100,
      number: 313
    };

    assert.deepEqual(parseTmuxLayout(input), output);
  });

  it('parses a different layout', () => {
    const input = '@165 ace3,120x15,0,0,315';

    const output = {
      type: 'pane',
      columns: 120,
      rows: 15,
      width: 100,
      height: 100,
      number: 315
    };

    assert.deepEqual(parseTmuxLayout(input), output);
  });

  /**/
  it('parses a layout with a horizontal split', () => {
    const input = '@165 2c52,80x24,0,0{40x24,0,0,313,39x24,41,0,314}';

    const output = {
      type: 'container',
      direction: 'row',
      columns: 80,
      rows: 24,
      width: 100,
      height: 100,
      children: [
        {type: 'pane', columns: 40, rows: 24, width: 50, height: 100, number: 313},
        {type: 'pane', columns: 39, rows: 24, width: 48.75, height: 100, number: 314}
      ]
    };

    assert.deepEqual(parseTmuxLayout(input), output);
  });
});


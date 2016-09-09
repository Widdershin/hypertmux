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

  it('parses a layout with a vertical split', () => {
    const input = '@168 85e2,80x24,0,0[80x12,0,0,319,80x11,0,13,320]'

    const output = {
      type: 'container',
      direction: 'column',
      columns: 80,
      rows: 24,
      width: 100,
      height: 100,
      children: [
        {type: 'pane', columns: 80, rows: 12, width: 100, height: 12 / 24 * 100, number: 319},
        {type: 'pane', columns: 80, rows: 11, width: 100, height: 11 / 24 * 100, number: 320}
      ]
    };

    assert.deepEqual(parseTmuxLayout(input), output);
  });

  /**/
  it('parses a layout with a vertical split nested in a horizontal split', () => {
    const input = '@143 447b,80x24,0,0{40x24,0,0,328,39x24,41,0[39x12,41,0,329,39x11,41,13,330]}';

    const output = {
      type: 'container',
      direction: 'row',
      columns: 80,
      rows: 24,
      width: 100,
      height: 100,
      children: [
        {
          type: 'pane',
          columns: 40,
          rows: 24,
          width: 50,
          height: 100,
          number: 328
        },
        {
          type: 'container',
          direction: 'column',
          columns: 39,
          rows: 24,
          width: 39 / 80 * 100,
          height: 100,
          children: [
            {
              type: 'pane',
              columns: 39,
              rows: 12,
              width: 39 / 80 * 100,
              height: 12 / 24 * 100,
              number: 329
            },
            {
              type: 'pane',
              columns: 39,
              rows: 11,
              width: 39 / 80 * 100,
              height: 11 / 24 * 100,
              number: 330
            }
          ]
        }
      ]
    };

    assert.deepEqual(parseTmuxLayout(input), output);
  });
});


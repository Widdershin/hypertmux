import {paste} from './paste';
import {closeBrowser} from './close-browser';
import {keydown} from './keydown';
import {windowPaneChanged} from './window-pane-changed';
import {updateLayout} from './update-layout';
import {updateBinds} from './update-binds';
import {output} from './output';

export default [
  paste,
  closeBrowser,
  keydown,
  windowPaneChanged,
  updateLayout,
  updateBinds,
  output
]

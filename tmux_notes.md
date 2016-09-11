
From the tmux man page:

Sessions, window and panes are each numbered with a unique ID; session IDs are prefixed with a
‘$’, windows with a ‘@’, and panes with a ‘%’.  These are unique and are unchanged for the life of
the session, window or pane in the tmux server.  The pane ID is passed to the child process of the
pane in the TMUX_PANE environment variable.  IDs may be displayed using the ‘session_id’,
‘window_id’, or ‘pane_id’ formats (see the FORMATS section) and the display-message,
list-sessions, list-windows or list-panes commands.

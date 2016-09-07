
As a user, I want to be able to use a tmux style application that can also split into webviews

So, sessions, windows, panes, persistence

Server:
  websockets, stdout

Client:
  display information from server
  send input to server

Easiest example: single window, single pane

The server starts a shell (bash to start) and sends the output down a websocket

The client displays said output, and any keystrokes are sent to the server to be proxied to the shell

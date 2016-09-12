
function parseBind (bind) {
  const regex = /bind-key\W+(?:-r)?(?:-T)?\W+(\w+) +(\S+) +(.*)/;

  let [_, type, key, command] = bind.match(regex);

  command = command.replace(/#{([^}]*)}/g, (_, match) => `"#{${match}}"`);

  return {
    type,
    key,
    command
  }
}

export default function parseBinds (listKeysOutput) {
  const binds = listKeysOutput.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return binds.map(parseBind);
}

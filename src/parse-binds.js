
function parseBind (bind) {
  const regex = /bind-key\W+(?:-r)?(?:-T)?\W+(\w+) +(\S+) +(.*)/;

  const [_, type, key, command] = bind.match(regex);

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

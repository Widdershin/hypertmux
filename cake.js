import xs from 'xstream';

export function cake (slices, sources) {
  const features = slices.map(slice => slice(sources));

  const reducers = Object.assign(
    {},
    ...features.map(feature => feature.reducers)
  );

  console.log(features);

  const action$ = xs.merge(...features.map(feature => feature.action$));

  return {
    action$,

    reducers
  }
}

export const createHistory = (initial) => ({
  past: [],
  present: initial,
  future: [],
  initial,
});

export const applyHistory = (history, next) => ({
  ...history,
  past: [...history.past, history.present],
  present: next,
  future: [],
});

export const undoHistory = (history) => {
  if (!history.past.length) {
    return history;
  }

  const previous = history.past[history.past.length - 1];
  const past = history.past.slice(0, -1);

  return {
    ...history,
    past,
    present: previous,
    future: [history.present, ...history.future],
  };
};

export const redoHistory = (history) => {
  if (!history.future.length) {
    return history;
  }

  const next = history.future[0];
  const future = history.future.slice(1);

  return {
    ...history,
    past: [...history.past, history.present],
    present: next,
    future,
  };
};

export const resetHistory = (history) => ({
  ...history,
  past: [],
  present: history.initial,
  future: [],
});

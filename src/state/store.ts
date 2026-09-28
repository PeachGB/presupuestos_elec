export type Listener<S> = (state: S, previous: S) => void;

export interface Store<S> {
  get(): S;
  update(transition: (state: S) => S): void;
  subscribe(listener: Listener<S>): () => void;
}

/** Store mínimo: estado inmutable + transiciones puras + suscriptores. */
export function createStore<S>(initial: S): Store<S> {
  let state = initial;
  const listeners = new Set<Listener<S>>();

  return {
    get: () => state,
    update(transition) {
      const previous = state;
      state = transition(state);
      if (state === previous) return;
      for (const listener of listeners) listener(state, previous);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const RESET: unique symbol = Symbol(
  // @ts-expect-error debug
  process.env.NODE_ENV !== 'production' ? 'RESET' : '',
);

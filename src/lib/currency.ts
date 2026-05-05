/**
 * Utilities to handle currency as cents to avoid floating point issues.
 * 1.00 -> 100
 */

export const toCents = (decimal: number): number => {
  return Math.round(decimal * 100);
};

export const toDecimal = (cents: number): number => {
  return cents / 100;
};

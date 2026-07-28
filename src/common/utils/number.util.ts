export function roundTo(value: number, decimalPlaces = 2): number {
  const multiplier = 10 ** decimalPlaces;

  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

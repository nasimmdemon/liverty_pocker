/** Format chip/currency amounts with exactly 1 decimal place */
export function formatChips(amount: number): string {
  const rounded = Math.round(amount * 10) / 10;
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

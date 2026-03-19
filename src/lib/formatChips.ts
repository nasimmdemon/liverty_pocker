/** Format chip/currency amounts with exactly 1 decimal place */
export function formatChips(amount: number): string {
  const rounded = Math.round(amount * 10) / 10;
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Format funds/balance with exactly 2 decimal places */
export function formatFunds(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

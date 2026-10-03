/** Format numbers with Western digits (1,2,3) and English grouping commas. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

export function formatMoney(value: number): string {
  return formatNumber(Math.round(value));
}

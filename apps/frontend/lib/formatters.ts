export function formatCurrency(value: number, locale: string = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 100 ? 2 : 0
  }).format(value);
}

export function formatPercent(value: number, locale: string = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1
  }).format(value);
}

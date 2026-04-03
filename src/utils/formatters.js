export const fmt = (n) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number(n) || 0);

export const fmtShort = (n) => {
  n = Number(n) || 0;
  if (n >= 1000000) return `฿${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `฿${(n / 1000).toFixed(0)}K`;
  return `฿${n}`;
};

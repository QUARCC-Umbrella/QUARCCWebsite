const missing = (value) => value === null || value === undefined || Number.isNaN(value);

export const pct = (value, digits = 2) => (missing(value) ? "—" : `${(value * 100).toFixed(digits)}%`);

export const signed = (value, digits = 2) =>
  missing(value) ? "—" : `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value * 100).toFixed(digits)}%`;

export const num = (value, digits = 2) => (missing(value) ? "—" : value.toFixed(digits));

export const tone = (value) => (missing(value) || value === 0 ? "" : value > 0 ? "is-pos" : "is-neg");

export const parsePct = (text) => {
  const value = Number.parseFloat(String(text ?? "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(value) ? value / 100 : null;
};

// NAV is stored in US$bn; both funds start at US$1bn.
export const navBn = (nav, digits = 3) => (missing(nav) ? "—" : `US$${nav.toFixed(digits)}bn`);

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function longDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}

export function shortDate(time) {
  const date = new Date(time);
  return `${months[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`;
}

export function marksStamp(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
}

// "COSTCO WHOLESALE CORP NEW" -> "Costco Wholesale Corp New"
export function titleCase(name = "") {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\bWa\b/, "WA");
}

export const displayName = (name = "") => name.replace(/^QUARCC\s+/i, "");

export function period(rows, key) {
  return rows?.find((row) => row.period.toLowerCase() === key.toLowerCase()) ?? {};
}

// The book is live from its formation date; everything before is simulated.
// Content entries carry `liveSince`; older snapshots only say it in prose.
export function liveSince(portfolio) {
  if (portfolio.liveSince) return portfolio.liveSince;
  const match = /(\d{1,2}) (\w{3}) (\d{4}) formation/.exec(portfolio.summary ?? "");
  if (!match) return null;
  const month = months.indexOf(match[2]) + 1;
  return month ? `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}` : null;
}

// "2026-10-12" -> "Oct 12" (or "Oct 12, 2025" for other years)
export function formatDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const sameYear = year === new Date().getFullYear();

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
// Today's date in the user's time zone, as "2026-10-12"
export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
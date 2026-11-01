import { addDays, formatDate } from "@/lib/weather";

export function dayLabel(index: number, dateISO: string) {
  const date = addDays(dateISO, index);
  const weekdayShort = formatDate(date, { weekday: "short" });
  const weekdayLong = formatDate(date, { weekday: "long" });
  return {
    short: index === 0 ? "Today" : index === 1 ? "Tomorrow" : weekdayShort,
    long: index === 0 ? "Today" : index === 1 ? "Tomorrow" : weekdayLong,
    weekday: weekdayLong,
    date: formatDate(date, { day: "numeric", month: "short" }),
    full: formatDate(date, { weekday: "long", day: "numeric", month: "long" }),
  };
}

export type LearningFilters = {
  search: string;
  fromDate: string;
  toDate: string;
};

function isCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function formatCalendarDate(year: number, month: number, day: number): string | null {
  if (!isCalendarDate(year, month, day)) return null;
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

/**
 * Interprets learning dates as calendar dates, without timezone conversion.
 * Accepted values are ISO YYYY-MM-DD (including timestamps that begin with it)
 * and UK DD/MM/YYYY or DD/MM/YY. Two-digit UK years mean 2000-2099.
 */
export function normaliseLearningDate(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (isoMatch) {
    return formatCalendarDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  const ukMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!ukMatch) return null;

  const year = ukMatch[3].length === 2 ? 2000 + Number(ukMatch[3]) : Number(ukMatch[3]);
  return formatCalendarDate(year, Number(ukMatch[2]), Number(ukMatch[1]));
}

export function matchesLearningFilters(
  filters: LearningFilters,
  searchableText: string,
  dateValue: string | null | undefined,
): boolean {
  const query = filters.search.trim().toLowerCase();
  if (query && !searchableText.toLowerCase().includes(query)) return false;

  if (!filters.fromDate && !filters.toDate) return true;

  const entryDate = normaliseLearningDate(dateValue);
  if (!entryDate) return false;

  const fromDate = normaliseLearningDate(filters.fromDate);
  const toDate = normaliseLearningDate(filters.toDate);
  if (filters.fromDate && (!fromDate || entryDate < fromDate)) return false;
  if (filters.toDate && (!toDate || entryDate > toDate)) return false;
  return true;
}
export function assertPositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${fieldName} must be a positive integer`);
  }
}

export function startOfLocalDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function startOfRecentDayWindow(days: number, referenceDate: Date = new Date()): Date {
  assertPositiveInteger(days, 'days');

  const startDate = startOfLocalDay(referenceDate);
  startDate.setDate(startDate.getDate() - (days - 1));

  return startDate;
}

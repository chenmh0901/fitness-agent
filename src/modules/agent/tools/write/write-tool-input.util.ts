export type ToolInputRecord = Record<string, unknown>;

export function requireInputRecord(input: unknown): ToolInputRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError('tool input must be an object');
  }

  return input as ToolInputRecord;
}

export function requireNonEmptyString(input: ToolInputRecord, field: string): string {
  const value = input[field];

  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`input.${field} must be a non-empty string`);
  }

  return value.trim();
}

export function requireLocalDate(input: ToolInputRecord, field = 'date'): Date {
  const value = requireNonEmptyString(input, field);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`input.${field} must use YYYY-MM-DD format`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    throw new TypeError(`input.${field} must be a valid date`);
  }

  return parsedDate;
}

export function requirePositiveNumber(input: ToolInputRecord, field: string): number {
  const value = input[field];

  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`input.${field} must be a positive number`);
  }

  return value;
}

export function requirePositiveInteger(input: ToolInputRecord, field: string): number {
  const value = requirePositiveNumber(input, field);

  if (!Number.isInteger(value)) {
    throw new TypeError(`input.${field} must be a positive integer`);
  }

  return value;
}

export function requireNonNegativeNumber(input: ToolInputRecord, field: string): number {
  const value = input[field];

  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`input.${field} must be a non-negative number`);
  }

  return value;
}

export function requireIntegerInRange(
  input: ToolInputRecord,
  field: string,
  minimum: number,
  maximum: number,
): number {
  const value = input[field];

  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`input.${field} must be an integer from ${minimum} to ${maximum}`);
  }

  return value;
}

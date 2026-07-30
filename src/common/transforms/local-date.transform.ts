import type { TransformFnParams } from 'class-transformer';

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function transformLocalDate({ value }: TransformFnParams): unknown {
  if (value instanceof Date || typeof value !== 'string') {
    return value;
  }

  const match = LOCAL_DATE_PATTERN.exec(value);

  if (!match) {
    return value;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return new Date(Number.NaN);
  }

  return date;
}

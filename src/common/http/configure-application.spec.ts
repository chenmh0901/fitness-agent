import { parseCorsOrigins } from './configure-application';

describe('parseCorsOrigins', () => {
  it('normalizes a comma-separated origin allowlist', () => {
    expect(parseCorsOrigins(' http://localhost:5173, https://fitness.example.com ')).toEqual([
      'http://localhost:5173',
      'https://fitness.example.com',
    ]);
  });

  it('rejects a wildcard origin', () => {
    expect(() => parseCorsOrigins('*')).toThrow(
      'APP_CORS_ORIGINS must not contain a wildcard origin',
    );
  });

  it.each(['', 'ftp://fitness.example.com', 'https://fitness.example.com/path'])(
    'rejects invalid origin configuration %p',
    (value) => {
      expect(() => parseCorsOrigins(value)).toThrow();
    },
  );
});

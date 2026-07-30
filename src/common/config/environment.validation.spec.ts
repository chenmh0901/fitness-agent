import { environmentValidationSchema } from './environment.validation';

interface ValidatedEnvironment {
  AI_PROVIDER: 'deepseek' | 'openai';
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL: string;
  OPENAI_API_KEY?: string;
}

describe('environmentValidationSchema', () => {
  const baseEnvironment = {
    DATABASE_URL: 'postgresql://fitness:fitness@localhost:5432/fitness_agent',
    OPENAI_MODEL: 'test-model',
  };

  it.each(['development', 'test'])(
    'allows OPENAI_API_KEY to be omitted in %s',
    (nodeEnvironment) => {
      const result = environmentValidationSchema.validate({
        ...baseEnvironment,
        NODE_ENV: nodeEnvironment,
      });

      expect(result.error).toBeUndefined();
      expect((result.value as ValidatedEnvironment).OPENAI_API_KEY).toBeUndefined();
      expect((result.value as ValidatedEnvironment).DEEPSEEK_API_KEY).toBeUndefined();
    },
  );

  it('treats an empty development OPENAI_API_KEY as not configured', () => {
    const result = environmentValidationSchema.validate({
      ...baseEnvironment,
      NODE_ENV: 'development',
      OPENAI_API_KEY: '   ',
    });

    expect(result.error).toBeUndefined();
    expect((result.value as ValidatedEnvironment).OPENAI_API_KEY).toBeUndefined();
  });

  it('defaults to DeepSeek and the current flash model', () => {
    const result = environmentValidationSchema.validate({
      ...baseEnvironment,
      NODE_ENV: 'development',
    });
    const environment = result.value as ValidatedEnvironment;

    expect(result.error).toBeUndefined();
    expect(environment.AI_PROVIDER).toBe('deepseek');
    expect(environment.DEEPSEEK_MODEL).toBe('deepseek-v4-flash');
  });

  it('accepts openai as the selected provider', () => {
    const result = environmentValidationSchema.validate({
      ...baseEnvironment,
      NODE_ENV: 'development',
      AI_PROVIDER: 'openai',
    });

    expect(result.error).toBeUndefined();
    expect((result.value as ValidatedEnvironment).AI_PROVIDER).toBe('openai');
  });

  it('rejects an unsupported provider', () => {
    const result = environmentValidationSchema.validate({
      ...baseEnvironment,
      NODE_ENV: 'development',
      AI_PROVIDER: 'unsupported',
    });

    expect(result.error?.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['AI_PROVIDER'],
          type: 'any.only',
        }),
      ]),
    );
  });

  it('requires OPENAI_API_KEY in production', () => {
    const result = environmentValidationSchema.validate({
      ...baseEnvironment,
      NODE_ENV: 'production',
      DEEPSEEK_API_KEY: 'production-deepseek-key',
    });

    expect(result.error).toBeDefined();
    expect(result.error?.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['OPENAI_API_KEY'],
          type: 'any.required',
        }),
      ]),
    );
  });

  it('requires DEEPSEEK_API_KEY in production', () => {
    const result = environmentValidationSchema.validate({
      ...baseEnvironment,
      NODE_ENV: 'production',
      OPENAI_API_KEY: 'production-openai-key',
    });

    expect(result.error).toBeDefined();
    expect(result.error?.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['DEEPSEEK_API_KEY'],
          type: 'any.required',
        }),
      ]),
    );
  });

  it('accepts configured production provider credentials', () => {
    const result = environmentValidationSchema.validate({
      ...baseEnvironment,
      NODE_ENV: 'production',
      DEEPSEEK_API_KEY: 'production-deepseek-key',
      OPENAI_API_KEY: 'production-openai-key',
    });

    expect(result.error).toBeUndefined();
    expect((result.value as ValidatedEnvironment).DEEPSEEK_API_KEY).toBe('production-deepseek-key');
    expect((result.value as ValidatedEnvironment).OPENAI_API_KEY).toBe('production-openai-key');
  });
});

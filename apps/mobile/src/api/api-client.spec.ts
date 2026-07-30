import { ApiClient, ApiClientError } from './api-client';

function createResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

describe('ApiClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the configured base URL and returns JSON data', async () => {
    const payload = { localDate: '2026-07-30' };
    fetchMock.mockResolvedValue(createResponse(200, payload));
    const client = new ApiClient('http://localhost:3000/api/');

    await expect(client.get('/daily/today')).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/daily/today', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
  });

  it('sends JSON requests through the same client', async () => {
    fetchMock.mockResolvedValue(createResponse(200, { answer: '已记录。' }));
    const client = new ApiClient('http://localhost:3000/api');

    await expect(client.post('/agent/chat', { message: '今天早上90.5kg' })).resolves.toEqual({
      answer: '已记录。',
    });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message: '今天早上90.5kg' }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  });

  it('maps server and network failures to safe user-facing errors', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createResponse(400, {
          code: 'BAD_REQUEST',
          message: 'Request validation failed',
        }),
      )
      .mockResolvedValueOnce(
        createResponse(500, {
          message: 'OpenAIAIProvider failed with API key secret',
        }),
      );
    const client = new ApiClient('http://localhost:3000/api');

    await expect(client.post('/agent/chat', { message: '' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: '请求内容有误，请检查后重试。',
      status: 400,
    });

    const serverError = await client.get('/daily/today').catch((error: unknown) => error);
    expect(serverError).toBeInstanceOf(ApiClientError);
    expect((serverError as ApiClientError).message).toBe('服务暂时不可用，请稍后重试。');
    expect((serverError as ApiClientError).message).not.toContain('OpenAI');

    fetchMock.mockRejectedValueOnce(new Error('network details'));
    await expect(client.get('/daily/today')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: '网络连接失败，请检查后重试。',
    });
  });
});

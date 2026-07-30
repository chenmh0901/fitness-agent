const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';

interface ApiErrorBody {
  readonly code?: string;
  readonly message?: string;
  readonly details?: string[];
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, {
      method: 'GET',
    });
  }

  post<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
    return this.request<TResponse>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...init.headers,
        },
      });
    } catch {
      throw new ApiClientError('网络连接失败，请检查后重试。', null, 'NETWORK_ERROR');
    }

    const payload = await this.readJson(response);

    if (!response.ok) {
      throw this.toApiError(response.status, payload);
    }

    return payload as T;
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      if (response.ok) {
        throw new ApiClientError('服务器返回了无法识别的数据。', response.status, 'INVALID_DATA');
      }

      return null;
    }
  }

  private toApiError(status: number, payload: unknown): ApiClientError {
    const body = this.isApiErrorBody(payload) ? payload : undefined;
    const code = body?.code ?? `HTTP_${status}`;

    if (status === 400) {
      return new ApiClientError('请求内容有误，请检查后重试。', status, code);
    }

    if (status >= 500) {
      return new ApiClientError('服务暂时不可用，请稍后重试。', status, code);
    }

    return new ApiClientError('请求失败，请稍后重试。', status, code);
  }

  private isApiErrorBody(value: unknown): value is ApiErrorBody {
    return typeof value === 'object' && value !== null;
  }
}

export const apiClient = new ApiClient();

export function getUserFacingError(error: unknown): string {
  return error instanceof ApiClientError ? error.message : '操作失败，请稍后重试。';
}

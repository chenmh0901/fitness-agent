export class ApiErrorResponseDto {
  statusCode: number;
  code: string;
  message: string;
  details?: string[];
  timestamp: string;
  path: string;
}

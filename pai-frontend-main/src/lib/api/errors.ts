export type ApiError = {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
};

export class ApiRequestError extends Error {
  status: number;
  code: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.status = error.status;
    this.code = error.code;
    this.fieldErrors = error.fieldErrors;
    this.requestId = error.requestId;
  }
}

export async function normalizeApiError(response: Response): Promise<ApiRequestError> {
  let body: Record<string, unknown> = {};
  try {
    body = await response.json();
  } catch {
    // Response body is not JSON
  }

  const apiError: ApiError = {
    status: response.status,
    code:
      (body.code as string) ||
      getDefaultCode(response.status),
    message:
      (body.message as string) ||
      (body.detail as string) ||
      getDefaultMessage(response.status),
    fieldErrors: body.field_errors as Record<string, string[]> | undefined,
    requestId: body.request_id as string | undefined,
  };

  return new ApiRequestError(apiError);
}

function getDefaultCode(status: number): string {
  switch (status) {
    case 400:
      return "INVALID_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 413:
      return "FILE_TOO_LARGE";
    case 415:
      return "UNSUPPORTED_FILE_TYPE";
    case 422:
      return "VALIDATION_ERROR";
    case 429:
      return "RATE_LIMITED";
    default:
      return "INTERNAL_ERROR";
  }
}

function getDefaultMessage(status: number): string {
  switch (status) {
    case 400:
      return "Invalid request. Please check your input.";
    case 401:
      return "Your session has expired. Please log in again.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "A conflict occurred. Please refresh and try again.";
    case 413:
      return "The file is too large. Please upload a smaller file.";
    case 415:
      return "This file type is not supported.";
    case 422:
      return "Please fix the validation errors and try again.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}
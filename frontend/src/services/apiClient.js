import axios from 'axios';
import supabase from '../lib/supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT_MS = 6000;

export class ApiError extends Error {
  constructor(message, { status = null, code = 'API_ERROR', details = null, cause = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.cause = cause;
  }
}

const getValidationMessage = (detail) => {
  if (!Array.isArray(detail)) return null;
  const messages = detail
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item.msg === 'string') {
        const location = Array.isArray(item.loc) ? item.loc.filter(Boolean).join('.') : '';
        return location ? `${location}: ${item.msg}` : item.msg;
      }
      return null;
    })
    .filter(Boolean);
  return messages.length ? messages.join('; ') : null;
};

export const normalizeApiError = (error) => {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('The server took too long to respond.', {
        code: 'TIMEOUT',
        cause: error,
      });
    }

    if (!error.response) {
      return new ApiError('Unable to reach the AquaGrow service.', {
        code: 'NETWORK_ERROR',
        cause: error,
      });
    }

    const { status, data } = error.response;
    const validationMessage = getValidationMessage(data?.detail);
    const message = validationMessage
      || (typeof data?.detail === 'string' ? data.detail : null)
      || (status >= 500 ? 'The AquaGrow service is temporarily unavailable.' : 'The request could not be completed.');

    return new ApiError(message, {
      status,
      code: status === 422 ? 'VALIDATION_ERROR' : 'HTTP_ERROR',
      details: status === 422 ? data?.detail || null : null,
      cause: error,
    });
  }

  return new ApiError('An unexpected error occurred while contacting the AquaGrow service.', {
    code: 'UNKNOWN_ERROR',
    cause: error,
  });
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error))
);

export { API_BASE_URL, API_TIMEOUT_MS };
export default apiClient;

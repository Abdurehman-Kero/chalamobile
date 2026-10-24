import { tr } from '../i18n';

export const isNetworkError = (err: any): boolean => !!err && !err.response;

/** A message a shop owner can act on, never a raw axios error. */
export function getErrorMessage(err: any, fallback = tr('Something went wrong. Please try again.')): string {
  if (!err) return fallback;
  if (err.code === 'ECONNABORTED') return tr('This is taking longer than expected. Please try again.');
  if (isNetworkError(err)) return tr("Can't connect right now. Check your internet connection and try again.");
  const status = err.response?.status;
  const message = err.response?.data?.error;
  if (message) return message;
  if (status === 401) return tr('Your session expired. Please sign in again.');
  if (status === 404) return tr('That item no longer exists.');
  if (status >= 500) return tr('Something went wrong on our side. Please try again.');
  return fallback;
}

export const isNetworkError = (err: any): boolean => !!err && !err.response;

/** A message a shop owner can act on, never a raw axios error. */
export function getErrorMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;
  if (err.code === 'ECONNABORTED') return 'The server took too long to answer. Please try again.';
  if (isNetworkError(err)) return "Can't reach the server. Check your connection and the server address in Settings.";
  const status = err.response?.status;
  const message = err.response?.data?.error;
  if (message) return message;
  if (status === 401) return 'Your session expired. Please sign in again.';
  if (status === 404) return 'That item no longer exists.';
  if (status >= 500) return 'The server had a problem. Please try again.';
  return fallback;
}

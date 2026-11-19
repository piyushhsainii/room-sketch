/** Keep generated links and same-origin checks aligned with the incoming host.
 * Next.js may reconstruct request.url with localhost for a 127.0.0.1 request.
 */
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get('host');
  if (host && /^[a-z\d.\-\[\]:]+$/i.test(host)) url.host = host;
  return url.origin;
}

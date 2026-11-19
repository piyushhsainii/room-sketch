const reference = "https://roomsketch.invalid";

export function authReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith("/") || /[\\\u0000-\u001f]/.test(value)) return "/dashboard";
  try {
    const url = new URL(value, reference);
    const decodedPath = decodeURIComponent(url.pathname);
    if (url.origin !== reference || decodedPath.startsWith("//") || decodedPath.includes("\\") ||
        /^\/(?:login|auth\/callback)(?:\/|$)/i.test(decodedPath)) {
      return "/dashboard";
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return "/dashboard";
  }
}

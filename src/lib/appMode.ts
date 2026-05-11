const PRIVATE_HOST_PARTS = ["porraprivada", "localhost", "127.0.0.1"];
const CLASSIC_HOST_PARTS = ["laporradelverano.es"];

function getHostname() {
  if (typeof window === "undefined") return "";
  return window.location.hostname.toLowerCase();
}

function getUrlHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isClassicAppUrl(url: string) {
  const hostname = getUrlHostname(url);
  return CLASSIC_HOST_PARTS.some((part) => hostname === part || hostname.endsWith(`.${part}`));
}

export function isPrivateLeaguesApp() {
  const configuredMode = import.meta.env.VITE_APP_MODE;
  if (configuredMode === "private") return true;
  if (configuredMode === "classic") return false;

  const hostname = getHostname();
  return PRIVATE_HOST_PARTS.some((part) => hostname.includes(part));
}

export function getAuthRedirectUrl(path = "/") {
  const privateUrl = import.meta.env.VITE_PRIVATE_APP_URL || import.meta.env.VITE_PUBLIC_PRIVATE_APP_URL;
  const configuredUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_APP_URL;
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const privateApp = isPrivateLeaguesApp();

  // Always prefer the current origin for the private app to keep the OAuth
  // round-trip on the same host (e.g. porraprivada.lovable.app or preview URLs).
  if (privateApp && currentOrigin) {
    return new URL(path, currentOrigin).toString();
  }

  const safeConfiguredUrl =
    privateApp && configuredUrl && isClassicAppUrl(configuredUrl) ? "" : configuredUrl;
  const baseUrl = (privateApp ? privateUrl : "") || safeConfiguredUrl || currentOrigin;

  if (!baseUrl) return path;
  return new URL(path, baseUrl).toString();
}

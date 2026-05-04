const PRIVATE_HOST_PARTS = ["porraprivada", "localhost", "127.0.0.1"];

function getHostname() {
  if (typeof window === "undefined") return "";
  return window.location.hostname.toLowerCase();
}

export function isPrivateLeaguesApp() {
  const configuredMode = import.meta.env.VITE_APP_MODE;
  if (configuredMode === "private") return true;
  if (configuredMode === "classic") return false;

  const hostname = getHostname();
  return PRIVATE_HOST_PARTS.some((part) => hostname.includes(part));
}

export function getAuthRedirectUrl(path = "/") {
  const configuredUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_APP_URL;
  const baseUrl = configuredUrl || (typeof window !== "undefined" ? window.location.origin : "");

  if (!baseUrl) return path;
  return new URL(path, baseUrl).toString();
}


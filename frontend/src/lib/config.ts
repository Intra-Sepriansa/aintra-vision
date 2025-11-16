const RAW_API = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000").trim();
function stripSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export const appConfig = { apiBase: stripSlash(RAW_API) };

export function buildApiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : "/" + path;
  return appConfig.apiBase + normalized;
}

export function buildWsUrl(path: string) {
  const base = new URL(appConfig.apiBase);
  const protocol = base.protocol === "https:" ? "wss:" : "ws:";
  const normalized = path.startsWith("/") ? path : "/" + path;
  return protocol + "//" + base.host + normalized;
}
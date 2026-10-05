import { ApiError, getGetAppConfigQueryKey, getGetMeQueryKey, useGetAppConfig, useGetMe, type AppConfig, type Me } from "@workspace/api-client-react";

export function apiCode(err: unknown): string | undefined {
  if (err instanceof ApiError) return (err.data as { code?: string } | null)?.code;
  return undefined;
}
export function apiStatus(err: unknown): number | undefined {
  return err instanceof ApiError ? err.status : undefined;
}

/** Boot guarantees `me` is in cache before routes render. */
export function useMe(): Me {
  const q = useGetMe({ query: { queryKey: getGetMeQueryKey(), staleTime: 30_000 } });
  return q.data as Me;
}
export function useConfig(): AppConfig {
  const q = useGetAppConfig({ query: { queryKey: getGetAppConfigQueryKey(), staleTime: Infinity } });
  return q.data as AppConfig;
}

export function formatPhone(p: string | null | undefined): string {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  const local = d.startsWith("998") ? d.slice(3) : d;
  if (local.length !== 9) return p;
  return `+998 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
}

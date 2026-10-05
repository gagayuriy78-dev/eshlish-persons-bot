import { useState } from "react";
import { Check, CheckCheck, Forward, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetAdminStatsQueryKey, getListAdminSupportQueryKey, useListAdminSupport, useUpdateAdminSupport, type AdminSupportUpdateStatus, type ListAdminSupportStatus } from "@workspace/api-client-react";
import { Btn, ErrorState } from "@/components/kit";
import { useI18n, type TranslationKey } from "@/i18n";
import { formatPhone } from "@/lib/api";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { LoadingBlock, Pill } from "./admin-kit";

export default function SupportInbox() {
  const { t, formatDate } = useI18n();
  const qc = useQueryClient();
  const [status, setStatus] = useState<ListAdminSupportStatus | "">("new");
  const list = useListAdminSupport(status ? { status } : {});
  const upd = useUpdateAdminSupport();
  const change = (messageId: number, s: AdminSupportUpdateStatus) => upd.mutate({ messageId, data: { status: s } }, {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getListAdminSupportQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }); },
    onError: () => toast(t("common.error"), "warn"),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {(["new", "read", "resolved", ""] as const).map((s) => (
          <button key={s || "all"} data-testid={`filter-support-${s || "all"}`} onClick={() => setStatus(s)}
            className={cn("tactile shrink-0 rounded-xl px-4 py-2 text-sm font-bold", status === s ? "btn-primary" : "btn-soft")}>
            {s ? t(`support.status.${s}` as TranslationKey) : t("common.all")}
          </button>
        ))}
      </div>
      {list.isLoading ? <LoadingBlock /> : list.isError || !list.data ? <ErrorState onRetry={() => list.refetch()} /> :
        list.data.length === 0 ? <p className="solid-card py-10 text-center text-sm text-muted-foreground">{t("admin.sup.empty")}</p> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {list.data.map((m) => (
              <article key={m.id} className="solid-card flex flex-col gap-2 p-4" data-testid={`card-support-${m.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{m.userName}</p>
                  <span className="text-xs text-muted-foreground">{m.phone ? formatPhone(m.phone) : m.telegramId}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDate(m.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{m.message}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Pill tone={m.status === "resolved" ? "mint" : m.status === "read" ? "aqua" : "peach"}>{t(`support.status.${m.status}` as TranslationKey)}</Pill>
                  {m.forwarded && <Pill tone="muted"><Forward className="size-3" />{t("admin.sup.forwarded")}</Pill>}
                  <div className="ml-auto flex gap-1.5">
                    {m.status === "new" && <Btn size="sm" variant="soft" data-testid={`button-read-${m.id}`} onClick={() => change(m.id, "read")}><Check className="size-4" />{t("admin.sup.markRead")}</Btn>}
                    {m.status !== "resolved" ? <Btn size="sm" data-testid={`button-resolve-${m.id}`} onClick={() => change(m.id, "resolved")}><CheckCheck className="size-4" />{t("admin.sup.resolve")}</Btn> :
                      <Btn size="sm" variant="soft" data-testid={`button-reopen-${m.id}`} onClick={() => change(m.id, "new")}><RotateCcw className="size-4" />{t("admin.sup.reopen")}</Btn>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
    </div>
  );
}

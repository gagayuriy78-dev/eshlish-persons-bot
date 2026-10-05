import { useState } from "react";
import { PhoneCall, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListMySupportMessagesQueryKey, useListMySupportMessages, useSendSupportMessage } from "@workspace/api-client-react";
import { Btn, EmptyState, ErrorState, Glass, Page, Skel, TopBar } from "@/components/kit";
import { useI18n, type TranslationKey } from "@/i18n";
import { formatPhone, useConfig } from "@/lib/api";
import { haptic, openPhone } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import supportArt from "@/assets/3d/support-chat.webp";

export function statusTone(s: string) {
  return s === "resolved" ? "bg-mint/40" : s === "read" ? "bg-sky/30" : "bg-peach/40";
}

export default function SupportPage() {
  const { t, formatDate } = useI18n();
  const config = useConfig();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const list = useListMySupportMessages();
  const send = useSendSupportMessage();

  const submit = () => {
    if (msg.trim().length < 2) return;
    send.mutate({ data: { message: msg.trim() } }, {
      onSuccess: () => { haptic.success(); toast(t("support.sent"), "ok"); setMsg(""); qc.invalidateQueries({ queryKey: getListMySupportMessagesQueryKey() }); },
      onError: () => toast(t("common.error"), "warn"),
    });
  };

  return (
    <Page back="/">
      <TopBar back="/" title={t("support.title")} />
      <div className="flex items-center gap-3">
        <img src={supportArt} alt="" className="float h-28 w-28 shrink-0 object-contain" />
        <p className="text-sm leading-relaxed text-muted-foreground">{t("support.text")}</p>
      </div>
      <Glass className="mt-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[11px] font-bold text-muted-foreground">ISHLISH PERSONS</p>
          <p className="font-display text-lg font-extrabold" data-testid="text-support-phone">{formatPhone(config.supportPhone)}</p>
        </div>
        <Btn variant="peach" data-testid="button-call" onClick={() => openPhone(config.supportPhone)}><PhoneCall className="size-5" />{t("support.call")}</Btn>
      </Glass>
      <Glass className="mt-3 flex flex-col gap-3">
        <textarea data-testid="input-message" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={2000} rows={4} placeholder={t("support.placeholder")}
          className="w-full resize-none rounded-2xl border border-input bg-card p-3.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <Btn disabled={msg.trim().length < 2} loading={send.isPending} data-testid="button-send" onClick={submit}><Send className="size-5" />{t("support.send")}</Btn>
      </Glass>
      <h3 className="mb-2 mt-5 text-lg font-extrabold">{t("support.history")}</h3>
      {list.isLoading ? <div className="flex flex-col gap-2"><Skel className="h-20" /><Skel className="h-20" /></div> :
        list.isError ? <ErrorState onRetry={() => list.refetch()} /> :
          !list.data?.length ? <EmptyState text={t("support.empty")} /> : (
            <div className="flex flex-col gap-2">
              {list.data.map((m) => (
                <div key={m.id} className="glass rounded-[20px] p-3.5" data-testid={`row-message-${m.id}`}>
                  <p className="whitespace-pre-wrap text-sm">{m.message}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>{formatDate(m.createdAt)}</span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-foreground", statusTone(m.status))}>{t(`support.status.${m.status}` as TranslationKey)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
    </Page>
  );
}

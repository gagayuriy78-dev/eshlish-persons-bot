import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarClock, Heart, HeartCrack, Play, RotateCcw, ShieldAlert, Timer, UserPlus, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProStatusQueryKey, useGetProStatus, useStartGame } from "@workspace/api-client-react";
import { Btn, ErrorState, Glass, Hearts, Page, Skel, TopBar } from "@/components/kit";
import { useI18n } from "@/i18n";
import { apiCode } from "@/lib/api";
import { haptic } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import proTrophy from "@/assets/3d/pro-trophy-heart.webp";

export default function ProPage() {
  const { t, formatNumber, formatDate, lang } = useI18n();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const status = useGetProStatus();
  const start = useStartGame();
  const [noChances, setNoChances] = useState(false);
  const s = status.data;
  const out = noChances || (s && !s.canPlay && !s.activeGameId);
  const nextFree = s ? `${formatDate(s.nextFreeAt)}, ${new Date(s.nextFreeAt).toLocaleTimeString(lang === "uz" ? "uz-UZ" : "en-GB", { hour: "2-digit", minute: "2-digit" })}` : "";

  const rules = [
    { icon: Heart, text: t("pro.rule1") },
    { icon: HeartCrack, text: t("pro.rule2") },
    { icon: ShieldAlert, text: t("pro.rule3") },
    { icon: CalendarClock, text: t("pro.rule4") },
  ];

  return (
    <Page back="/">
      <TopBar back="/" title={t("home.proTitle")} />
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[hsl(24_100%_90%)] via-[hsl(16_100%_89%)] to-[hsl(145_42%_88%)] p-5 pb-6">
        <img src={proTrophy} alt="" className="float absolute -right-4 -top-2 h-40 w-40 object-contain" />
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[hsl(14_50%_38%)]">{t("pro.prize")}</p>
        <p className="font-display mt-1 text-[40px] font-extrabold leading-none" data-testid="text-prize">{s ? formatNumber(s.prizeUzs) : "…"}</p>
        <p className="font-display text-lg font-bold text-[hsl(14_40%_35%)]">{t("common.sum")}</p>
        <p className="mt-3 max-w-[70%] text-[13px] leading-snug text-[hsl(14_25%_28%)]">{t("pro.text")}</p>
      </section>

      {status.isLoading ? <div className="mt-4 grid gap-3"><Skel className="h-20" /><Skel className="h-40" /></div> :
        status.isError ? <div className="mt-4"><ErrorState onRetry={() => status.refetch()} /></div> : s && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Glass className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-muted-foreground">{t("pro.hearts")}</span>
                <Hearts count={s.hearts} max={s.maxHearts} />
              </Glass>
              <Glass className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-muted-foreground">{t("pro.timerNow")}</span>
                <span className="flex items-center gap-1.5 font-display text-xl font-extrabold" data-testid="text-timer"><Timer className="size-5 text-teal" />{t("quiz.seconds", { seconds: s.timerSeconds })}</span>
              </Glass>
            </div>
            <Glass className="mt-3 flex flex-col gap-3">
              {rules.map((r, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-semibold">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary"><r.icon className="size-[18px] text-teal" /></span>{r.text}
                </div>
              ))}
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">{t("pro.timer", { seconds: s.timerSeconds })} · {t("pro.questions", { count: s.totalQuestions })}</p>
            </Glass>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              {s.freeAvailable && <span className="rounded-full bg-mint/40 px-3 py-1.5 text-secondary-foreground"><Zap className="mr-1 inline size-3.5" />{t("pro.free")}</span>}
              <span className="rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground">{t("pro.extra", { count: s.extraChances })}</span>
            </div>

            {out ? (
              <Glass className="mt-4 flex flex-col gap-3 border-peach/60" data-testid="card-no-chances">
                <p className="text-sm font-semibold">{t("pro.noChances")}</p>
                <p className="text-xs text-muted-foreground">{t("pro.nextFree", { time: nextFree })}</p>
                <Link href="/friends" data-testid="link-invite" className="tactile btn-peach flex h-12 items-center justify-center gap-2 rounded-2xl font-bold"><UserPlus className="size-5" />{t("pro.inviteCta")}</Link>
              </Glass>
            ) : s.activeGameId ? (
              <Btn size="lg" className="mt-4 w-full" data-testid="button-resume" onClick={() => navigate(`/game/${s.activeGameId}`)}><RotateCcw className="size-5" />{t("pro.resume")}</Btn>
            ) : (
              <Btn size="lg" variant="peach" className="mt-4 w-full" loading={start.isPending} data-testid="button-start-pro"
                onClick={() => start.mutate({ data: { mode: "pro" } }, {
                  onSuccess: (g) => { haptic.impact("medium"); navigate(`/game/${g.id}`); },
                  onError: (e) => {
                    if (apiCode(e) === "NO_CHANCES") { haptic.warning(); setNoChances(true); qc.invalidateQueries({ queryKey: getGetProStatusQueryKey() }); }
                    else toast(t("common.error"), "warn");
                  },
                })}>
                <Play className="size-5 fill-current" />{t("pro.start")}
              </Btn>
            )}
          </>
        )}
    </Page>
  );
}

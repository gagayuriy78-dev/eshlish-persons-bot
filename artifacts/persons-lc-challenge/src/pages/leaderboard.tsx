import { useState } from "react";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useGetLeaderboard, type GetLeaderboardPeriod, type LeaderboardEntry } from "@workspace/api-client-react";
import { Avatar, EmptyState, ErrorState, Page, Skel, TopBar } from "@/components/kit";
import { useI18n } from "@/i18n";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import podium from "@/assets/3d/leaderboard-podium.webp";

export default function LeaderboardPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState<GetLeaderboardPeriod>("weekly");
  const lb = useGetLeaderboard({ period });
  const entries = lb.data?.entries ?? [];
  const top = entries.slice(0, 3);
  const rest = entries.slice(3);
  const me = lb.data?.me;

  return (
    <Page nav>
      <TopBar title={t("lb.title")} right={<img src={podium} alt="" className="h-14 w-14 object-contain" />} />
      <div className="glass relative mb-5 grid grid-cols-2 rounded-2xl p-1">
        {(["weekly", "overall"] as const).map((p) => (
          <button key={p} data-testid={`tab-${p}`} onClick={() => { haptic.select(); setPeriod(p); }} className="relative z-10 py-2.5 text-sm font-bold">
            {period === p && <motion.div layoutId="lb-tab" className="btn-primary absolute inset-0 -z-10 rounded-xl" />}
            <span className={period === p ? "text-white" : "text-muted-foreground"}>{t(p === "weekly" ? "lb.weekly" : "lb.overall")}</span>
          </button>
        ))}
      </div>

      {lb.isLoading ? <div className="flex flex-col gap-2"><Skel className="h-44" />{[0, 1, 2, 3].map((i) => <Skel key={i} className="h-16" />)}</div> :
        lb.isError ? <ErrorState onRetry={() => lb.refetch()} /> :
          entries.length === 0 ? <EmptyState art={podium} text={t("lb.empty")} /> : (
            <>
              <div className="mb-4 grid grid-cols-3 items-end gap-2">
                {[top[1], top[0], top[2]].map((e, i) => e ? <PodiumSpot key={e.rank} e={e} place={[2, 1, 3][i]} /> : <div key={i} />)}
              </div>
              <div className="flex flex-col gap-2">
                {rest.map((e, i) => (
                  <motion.div key={`${e.rank}-${e.name}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
                    <Row e={e} />
                  </motion.div>
                ))}
              </div>
            </>
          )}

      {me && (
        <div className="fixed inset-x-0 z-30 mx-auto w-[calc(100%-24px)] max-w-[436px]" style={{ bottom: "calc(92px + max(var(--tg-safe-bottom, 0px), env(safe-area-inset-bottom)))" }}>
          <Row e={me} pinned />
        </div>
      )}
    </Page>
  );
}

function PodiumSpot({ e, place }: { e: LeaderboardEntry; place: number }) {
  const { t, formatNumber } = useI18n();
  const h = place === 1 ? "h-24" : place === 2 ? "h-16" : "h-12";
  const tone = place === 1 ? "from-[hsl(28_100%_86%)] to-[hsl(14_95%_78%)]" : place === 2 ? "from-[hsl(145_42%_84%)] to-[hsl(148_38%_72%)]" : "from-[hsl(158_60%_84%)] to-[hsl(162_50%_70%)]";
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: place * 0.08 }} className="flex flex-col items-center gap-1.5" data-testid={`podium-${place}`}>
      {place === 1 && <Crown className="size-6 fill-[hsl(36_100%_70%)] text-[hsl(30_90%_55%)]" />}
      <Avatar name={e.name} photoUrl={e.photoUrl} size={place === 1 ? 62 : 50} className={e.isMe ? "ring-teal" : ""} />
      <p className="w-full truncate text-center text-[13px] font-bold">{e.isMe ? t("lb.you") : e.name}</p>
      <p className="text-[11px] font-bold text-muted-foreground">{formatNumber(e.points)}</p>
      <div className={cn("grid w-full place-items-center rounded-t-2xl bg-gradient-to-b font-display text-2xl font-extrabold text-white", h, tone)}>{place}</div>
    </motion.div>
  );
}

function Row({ e, pinned }: { e: LeaderboardEntry; pinned?: boolean }) {
  const { t, formatNumber } = useI18n();
  return (
    <div data-testid={pinned ? "row-me" : `row-rank-${e.rank}`} className={cn("flex items-center gap-3 px-3.5 py-2.5", pinned ? "solid-card border-teal/40 bg-secondary" : "glass rounded-[20px]", e.isMe && !pinned && "border-teal/50")}>
      <span className="w-8 text-center font-display text-base font-extrabold text-muted-foreground">{e.rank}</span>
      <Avatar name={e.name} photoUrl={e.photoUrl} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{e.isMe ? `${e.name} · ${t("lb.you")}` : e.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{[e.region, e.level].filter(Boolean).join(" · ")}</p>
      </div>
      <span className="text-sm font-extrabold text-secondary-foreground">{t("lb.points", { points: formatNumber(e.points) })}</span>
    </div>
  );
}

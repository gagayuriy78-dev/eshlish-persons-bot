import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { Award, CheckCircle2, Gem, Home, RotateCcw, Trophy, XCircle } from "lucide-react";
import { getGetGameQueryKey, useGetGame, type GameState } from "@workspace/api-client-react";
import { ErrorState, Glass, Hearts, Page, Skel } from "@/components/kit";
import { useI18n } from "@/i18n";
import { useConfig, useMe } from "@/lib/api";
import { cn } from "@/lib/utils";
import proTrophy from "@/assets/3d/pro-trophy-heart.webp";
import profileBadge from "@/assets/3d/profile-badge.webp";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const gid = Number(id);
  const g = useGetGame(gid, { query: { queryKey: getGetGameQueryKey(gid), enabled: gid > 0 } });
  return (
    <Page back="/">
      {g.isLoading ? <div className="flex flex-col gap-3"><Skel className="h-56" /><Skel className="h-40" /></div> :
        g.isError || !g.data ? <ErrorState onRetry={() => g.refetch()} /> :
          g.data.mode === "pro" ? <ProResult game={g.data} /> : <BasicResult game={g.data} />}
    </Page>
  );
}

function Actions({ again }: { again: string }) {
  const { t } = useI18n();
  return (
    <div className="mt-5 grid grid-cols-2 gap-2.5">
      <Link href={again} data-testid="link-again" className="tactile btn-primary flex h-13 items-center justify-center gap-2 rounded-2xl py-3.5 font-bold"><RotateCcw className="size-5" />{t("result.again")}</Link>
      <Link href="/" data-testid="link-home" className="tactile btn-soft flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold"><Home className="size-5" />{t("result.home")}</Link>
    </div>
  );
}

function BasicResult({ game }: { game: GameState }) {
  const { t, formatDate } = useI18n();
  const me = useMe();
  const pct = Math.round(game.percentage);
  const R = 52, C = 2 * Math.PI * R;
  const name = [me.firstName, me.lastName].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center text-2xl font-extrabold">{t("result.basicTitle")}</h1>
      <Glass className="flex flex-col items-center gap-3 py-6">
        <div className="relative size-36">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" stroke="hsl(145 24% 88%)" strokeWidth="11" />
            <motion.circle cx="60" cy="60" r={R} fill="none" stroke={game.passed ? "url(#rg)" : "hsl(20 95% 72%)"} strokeWidth="11" strokeLinecap="round"
              strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct / 100) }} transition={{ duration: 1, ease: "easeOut" }} />
            <defs><linearGradient id="rg"><stop offset="0" stopColor="hsl(145 42% 50%)" /><stop offset="1" stopColor="hsl(148 38% 39%)" /></linearGradient></defs>
          </svg>
          <span className="absolute inset-0 grid place-items-center font-display text-4xl font-extrabold" data-testid="text-percentage">{pct}%</span>
        </div>
        <p className="text-sm font-bold text-muted-foreground" data-testid="text-score">{t("result.score", { correct: game.correctCount, total: game.totalQuestions })}</p>
        <div className={cn("flex items-center gap-2 rounded-2xl px-4 py-2.5 text-center text-sm font-bold", game.passed ? "bg-mint/35" : "bg-peach/35")} data-testid="status-passed">
          {game.passed ? <CheckCircle2 className="size-5 shrink-0 text-teal" /> : <XCircle className="size-5 shrink-0 text-coral" />}
          {game.passed ? t("result.passed", { level: game.level ?? "" }) : t("result.failed", { level: game.level ?? "" })}
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground"><Gem className="size-4" />{t("result.points", { points: game.pointsEarned })}</span>
          {game.achievedLevel && <span className="rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground">{t("result.achieved", { level: game.achievedLevel })}</span>}
        </div>
      </Glass>

      {game.certificateCode && (
        <motion.div initial={{ opacity: 0, y: 24, rotate: -1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.4, type: "spring", damping: 18 }}
          className="cert-pattern relative overflow-hidden rounded-[26px] border-2 border-white bg-gradient-to-br from-[hsl(140_42%_99%)] via-[hsl(145_38%_94%)] to-[hsl(24_100%_94%)] p-5 shadow-[0_24px_50px_-26px_hsl(145_35%_30%/.5)]" data-testid="card-certificate">
          <div className="absolute inset-2 rounded-[20px] border border-dashed border-[hsl(145_36%_70%)]" />
          <img src={profileBadge} alt="" className="absolute -right-3 -top-3 h-24 w-24 object-contain" />
          <div className="relative">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-secondary-foreground"><Award className="size-4" />{t("result.certificate")}</p>
            <p className="mt-1 font-display text-sm font-bold text-muted-foreground">ISHLISH PERSONS</p>
            <p className="mt-4 text-xs text-muted-foreground">{t("result.awardedTo")}</p>
            <p className="font-display text-[26px] font-extrabold leading-tight" data-testid="text-cert-name">{name}</p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground">{t("home.level")}</p>
                <p className="font-display text-4xl font-extrabold text-teal">{game.achievedLevel ?? game.level}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-muted-foreground">{t("result.issued")}</p>
                <p className="text-sm font-bold">{formatDate(game.finishedAt ?? game.startedAt)}</p>
              </div>
            </div>
            <p className="mt-3 border-t border-[hsl(145_28%_82%)] pt-2 font-mono text-[11px] font-semibold text-muted-foreground" data-testid="text-cert-code">{t("result.certificateCode", { code: game.certificateCode })}</p>
          </div>
        </motion.div>
      )}
      <Actions again="/basic" />
    </div>
  );
}

function ProResult({ game }: { game: GameState }) {
  const { t, formatNumber } = useI18n();
  const config = useConfig();
  const won = game.status === "won";
  return (
    <div className="flex flex-col gap-4 text-center">
      <motion.img src={proTrophy} alt="" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }}
        className={cn("float mx-auto h-48 w-48 object-contain", !won && "opacity-80 grayscale-[35%]")} />
      <h1 className="text-[26px] font-extrabold leading-tight" data-testid="text-pro-result">{won ? t("result.won") : t("result.eliminated")}</h1>
      <p className="text-sm text-muted-foreground">{won ? t("result.wonText") : t("result.eliminatedText", { answered: game.answered })}</p>
      {won && (
        <div className="mx-auto flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[hsl(28_100%_88%)] to-[hsl(14_95%_82%)] px-5 py-3 font-display text-2xl font-extrabold">
          <Trophy className="size-6" />{t("result.prizeAmount", { prize: formatNumber(config.prizeUzs) })}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Glass className="px-2"><p className="text-[11px] font-bold text-muted-foreground">{t("result.reached")}</p><p className="font-display text-xl font-extrabold">{game.answered}/{game.totalQuestions}</p></Glass>
        <Glass className="px-2"><p className="text-[11px] font-bold text-muted-foreground">{t("profile.points")}</p><p className="font-display text-xl font-extrabold">+{game.pointsEarned}</p></Glass>
        <Glass className="flex flex-col items-center px-2"><p className="text-[11px] font-bold text-muted-foreground">{t("pro.hearts")}</p><div className="mt-1"><Hearts count={game.hearts} max={game.maxHearts} size={18} /></div></Glass>
      </div>
      <Actions again="/pro" />
    </div>
  );
}

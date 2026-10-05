import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, Gem, Headphones, LayoutDashboard, Sparkles, Ticket, UserPlus } from "lucide-react";
import { useGetProStatus, useGetReferrals } from "@workspace/api-client-react";
import { Avatar, Glass, Hearts, Page, Progress, Skel } from "@/components/kit";
import { useI18n } from "@/i18n";
import { useConfig, useMe } from "@/lib/api";
import homeBook from "@/assets/3d/home-book.webp";
import basicBook from "@/assets/3d/basic-book.webp";
import proTrophy from "@/assets/3d/pro-trophy-heart.webp";

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function HomePage() {
  const me = useMe();
  const config = useConfig();
  const { t, formatNumber } = useI18n();
  const pro = useGetProStatus();
  const refs = useGetReferrals();
  const chances = pro.data ? (pro.data.freeAvailable ? 1 : 0) + pro.data.extraChances : 0;

  return (
    <Page nav>
      <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.05 }} className="flex flex-col gap-4">
        <motion.header variants={item} className="flex items-center gap-3">
          <Avatar name={me.firstName} photoUrl={me.photoUrl} size={46} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground">{t("app.tagline")}</p>
            <h1 className="truncate text-xl font-extrabold" data-testid="text-greeting">{t("home.greeting", { name: me.firstName })}</h1>
          </div>
          <div className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-extrabold" data-testid="text-points">
            <Gem className="size-4 text-teal" />{formatNumber(me.points)}
          </div>
        </motion.header>

        <motion.section variants={item} className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[hsl(142_40%_87%)] via-[hsl(138_46%_91%)] to-[hsl(150_42%_86%)] p-5 shadow-[0_18px_40px_-22px_hsl(145_44%_34%/.6)]">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/40" />
          <div className="relative z-10 max-w-[58%]">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-secondary-foreground"><Sparkles className="size-3.5" />A1 — C2</span>
            <h2 className="mt-2 text-[24px] font-extrabold leading-[1.1]">{t("home.heroTitle")}</h2>
            <p className="mt-2 text-[13px] leading-snug text-[hsl(200_30%_32%)]">{t("home.heroText")}</p>
          </div>
          <img src={homeBook} alt="" className="float absolute -bottom-3 -right-3 h-44 w-44 object-contain" />
        </motion.section>

        <motion.div variants={item} className="grid grid-cols-3 gap-2">
          <Stat label={t("home.level")} value={me.englishLevel ?? t("home.noLevel")} small={!me.englishLevel} testid="stat-level" />
          <Stat label={t("home.rank")} value={me.stats.rank ? `#${me.stats.rank}` : "—"} testid="stat-rank" />
          <Stat label={t("home.chances")} value={pro.data ? String(chances) : "…"} testid="stat-chances" />
        </motion.div>

        <motion.div variants={item}>
          <Link href="/basic" data-testid="card-basic" className="tactile glass relative flex items-center gap-3 overflow-hidden p-4">
            <img src={basicBook} alt="" className="h-20 w-20 shrink-0 object-contain" />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-extrabold">{t("home.basicTitle")}</h3>
              <p className="text-[13px] leading-snug text-muted-foreground">{t("home.basicText")}</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-teal" />
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/pro" data-testid="card-pro" className="tactile relative block overflow-hidden rounded-[26px] bg-gradient-to-br from-[hsl(24_100%_90%)] via-[hsl(16_100%_88%)] to-[hsl(145_42%_88%)] p-4 shadow-[0_18px_36px_-22px_hsl(14_80%_50%/.55)]">
            <img src={proTrophy} alt="" className="float absolute -right-2 -top-1 h-32 w-32 object-contain" />
            <span className="rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-[hsl(14_60%_35%)]">PRO</span>
            <h3 className="mt-2 text-xl font-extrabold">{t("home.proTitle")}</h3>
            <p className="max-w-[62%] text-[13px] text-[hsl(14_30%_30%)]">{t("home.proText")}</p>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[hsl(14_40%_40%)]">{t("pro.prize")}</p>
                <p className="font-display text-[26px] font-extrabold leading-none" data-testid="text-prize">{formatNumber(config.prizeUzs)} <span className="text-base">{t("common.sum")}</span></p>
              </div>
              {pro.isLoading ? <Skel className="h-8 w-24" /> : pro.data && (
                <div className="flex items-center gap-2 rounded-2xl bg-white/75 px-3 py-2">
                  <Hearts count={pro.data.hearts} max={pro.data.maxHearts} size={18} />
                  <span className="flex items-center gap-1 text-xs font-bold"><Ticket className="size-4 text-teal" />{chances}</span>
                </div>
              )}
            </div>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/friends" data-testid="card-invite" className="tactile glass flex flex-col gap-2.5 p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-mint/40"><UserPlus className="size-5 text-teal" /></div>
              <p className="flex-1 text-sm font-extrabold">{t("home.invite")}</p>
              <span className="text-xs font-bold text-muted-foreground">{refs.data ? t("home.inviteProgress", { count: refs.data.progress, target: refs.data.target }) : ""}</span>
            </div>
            <Progress value={refs.data ? refs.data.progress / Math.max(1, refs.data.target) : 0} />
          </Link>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-2 gap-2">
          <Link href="/support" data-testid="link-support" className="tactile glass flex items-center gap-2.5 p-3.5 text-sm font-bold">
            <Headphones className="size-5 text-sky" />{t("home.support")}
          </Link>
          {me.isAdmin && (
            <Link href="/admin" data-testid="link-admin" className="tactile glass flex items-center gap-2.5 p-3.5 text-sm font-bold">
              <LayoutDashboard className="size-5 text-coral" />{t("home.admin")}
            </Link>
          )}
        </motion.div>
      </motion.div>
    </Page>
  );
}

function Stat({ label, value, small, testid }: { label: string; value: string; small?: boolean; testid: string }) {
  return (
    <Glass className="px-3 py-3 text-center">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p data-testid={testid} className={small ? "mt-0.5 break-words text-[12px] font-bold leading-tight" : "font-display mt-0.5 text-xl font-extrabold"}>{value}</p>
    </Glass>
  );
}

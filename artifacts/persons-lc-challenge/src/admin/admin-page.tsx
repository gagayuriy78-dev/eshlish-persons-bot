import { useEffect, useState } from "react";
import { Link, Redirect } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, HelpCircle, Inbox, LayoutDashboard, Radio, Settings, Share2, Users } from "lucide-react";
import { useI18n, type TranslationKey } from "@/i18n";
import { useMe } from "@/lib/api";
import { bindTelegramBackButton, haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import Dashboard from "./dashboard";
import UsersSection from "./users";
import ProMonitor from "./pro-monitor";
import Questions from "./questions";
import Referrals from "./referrals";
import SupportInbox from "./support-inbox";
import Analytics from "./analytics";
import SettingsSection from "./settings";

const TABS = [
  { id: "dashboard", icon: LayoutDashboard, C: Dashboard },
  { id: "users", icon: Users, C: UsersSection },
  { id: "pro", icon: Radio, C: ProMonitor },
  { id: "questions", icon: HelpCircle, C: Questions },
  { id: "referrals", icon: Share2, C: Referrals },
  { id: "support", icon: Inbox, C: SupportInbox },
  { id: "analytics", icon: BarChart3, C: Analytics },
  { id: "settings", icon: Settings, C: SettingsSection },
] as const;

export default function AdminPage() {
  const me = useMe();
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("dashboard");
  useEffect(() => bindTelegramBackButton(() => navigate("/")), [navigate]);
  if (!me.isAdmin) return <Redirect to="/" />;
  const Active = TABS.find((x) => x.id === tab)!.C;

  return (
    <div className="pt-safe pb-safe mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col gap-4 px-3 md:flex-row md:px-6">
      <aside className="md:sticky md:top-4 md:h-[calc(100dvh-32px)] md:w-60 md:shrink-0">
        <div className="mb-3 flex items-center gap-2">
          <Link href="/" data-testid="link-exit-admin" className="tactile btn-soft grid size-10 place-items-center rounded-xl" aria-label={t("admin.exit")}><ArrowLeft className="size-5" /></Link>
          <div>
            <p className="font-display text-lg font-extrabold leading-none">{t("admin.title")}</p>
            <p className="text-[11px] text-muted-foreground">{t("app.name")}</p>
          </div>
        </div>
        <nav className="no-scrollbar glass -mx-3 flex gap-1 overflow-x-auto rounded-none p-1.5 md:mx-0 md:flex-col md:rounded-[24px]">
          {TABS.map((x) => (
            <button key={x.id} data-testid={`tab-admin-${x.id}`} onClick={() => { haptic.select(); setTab(x.id); }}
              className={cn("relative flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold", tab === x.id ? "text-secondary-foreground" : "text-muted-foreground")}>
              {tab === x.id && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-2xl bg-secondary" />}
              <x.icon className="relative size-[18px]" /><span className="relative">{t(`admin.tab.${x.id}` as TranslationKey)}</span>
            </button>
          ))}
        </nav>
      </aside>
      <motion.main key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="min-w-0 flex-1">
        <h1 className="mb-4 text-2xl font-extrabold">{t(`admin.tab.${tab}` as TranslationKey)}</h1>
        <Active />
      </motion.main>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { motion } from "framer-motion";
import { KeyRound, Send, WifiOff, RefreshCw, Server } from "lucide-react";
import { ApiError, getGetAppConfigQueryKey, getGetMeQueryKey, useGetAppConfig, useStartSession } from "@workspace/api-client-react";
import { I18nProvider, useI18n } from "@/i18n";
import { getLaunchReferral, initTelegram, isDevPreview, isInTelegram } from "@/lib/telegram";
import { apiCode, apiStatus, useMe } from "@/lib/api";
import { Toaster, toast } from "@/lib/toast";
import { Btn, Skel } from "@/components/kit";
import homeBook from "@/assets/3d/home-book.webp";
import supportChat from "@/assets/3d/support-chat.webp";
import Onboarding from "@/pages/onboarding";
import HomePage from "@/pages/home";
import BasicPage from "@/pages/basic";
import ProPage from "@/pages/pro";
import GamePage from "@/pages/game";
import ResultPage from "@/pages/result";
import LeaderboardPage from "@/pages/leaderboard";
import FriendsPage from "@/pages/friends";
import ProfilePage from "@/pages/profile";
import SupportPage from "@/pages/support";
import AdminPage from "@/admin/admin-page";
import NotFound from "@/pages/not-found";

// Read referral params before any routing can touch the URL.
initTelegram();
const LAUNCH_REF = getLaunchReferral();

function globalError(err: unknown) {
  if (!(err instanceof ApiError)) return;
  const code = apiCode(err);
  if (err.status === 401 || code === "AUTH_INVALID" || code === "AUTH_EXPIRED" || code === "AUTH_REQUIRED") {
    window.dispatchEvent(new CustomEvent("plc:auth", { detail: { code: code ?? "AUTH_INVALID" } }));
  }
  else if (code === "ONBOARDING_REQUIRED") window.dispatchEvent(new Event("plc:onboarding"));
  else if (err.status === 429) window.dispatchEvent(new Event("plc:ratelimit"));
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: globalError }),
  mutationCache: new MutationCache({ onError: globalError }),
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2 },
    mutations: { retry: false },
  },
});

function Centered({ art, icon, title, text, children }: { art?: string; icon?: React.ReactNode; title: string; text: string; children?: React.ReactNode }) {
  return (
    <main className="screen pt-safe pb-safe flex flex-col items-center justify-center px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass flex w-full flex-col items-center gap-3 px-6 py-8">
        {art ? <img src={art} alt="" className="float -mt-20 h-40 w-40 object-contain" /> : <div className="grid size-16 place-items-center rounded-3xl bg-secondary">{icon}</div>}
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p data-testid="text-centered-message" className="text-sm leading-relaxed text-muted-foreground">{text}</p>
        {children}
      </motion.div>
    </main>
  );
}

function Loading() {
  const { t } = useI18n();
  return (
    <main className="screen pt-safe flex flex-col items-center justify-center gap-6 px-6">
      <motion.img src={homeBook} alt="" className="h-44 w-44 object-contain" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }} />
      <div className="text-center">
        <p className="font-display text-2xl font-extrabold">{t("app.name")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("boot.connecting")}</p>
      </div>
      <div className="w-40"><Skel className="h-2" /></div>
    </main>
  );
}

function AppRoutes() {
  const me = useMe();
  const [loc] = useLocation();
  if (!me.onboardingComplete && loc !== "/onboarding") return <Redirect to="/onboarding" />;
  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/" component={HomePage} />
      <Route path="/basic" component={BasicPage} />
      <Route path="/pro" component={ProPage} />
      <Route path="/game/:id" component={GamePage} />
      <Route path="/result/:id" component={ResultPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/friends" component={FriendsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Boot() {
  const { t, setLang } = useI18n();
  const qc = useQueryClient();
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const blocked = !isInTelegram() && !isDevPreview();
  const config = useGetAppConfig({ query: { queryKey: getGetAppConfigQueryKey(), staleTime: Infinity } });
  const session = useStartSession({
    mutation: { onSuccess: (me) => { qc.setQueryData(getGetMeQueryKey(), me); setLang(me.language); } },
  });
  const mutateRef = useRef(session.mutate);
  mutateRef.current = session.mutate;
  const started = useRef(false);

  useEffect(() => {
    if (blocked || started.current) return;
    started.current = true;
    mutateRef.current({ data: LAUNCH_REF });
  }, [blocked]);

  useEffect(() => {
    const onAuth = (event: Event) => {
      const code = (event as CustomEvent<{ code?: string }>).detail?.code;
      setAuthErrorCode(code ?? "AUTH_INVALID");
    };
    const onOnb = () => qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
    const onRate = () => toast(t("common.rateLimited"), "warn");
    window.addEventListener("plc:auth", onAuth);
    window.addEventListener("plc:onboarding", onOnb);
    window.addEventListener("plc:ratelimit", onRate);
    return () => {
      window.removeEventListener("plc:auth", onAuth);
      window.removeEventListener("plc:onboarding", onOnb);
      window.removeEventListener("plc:ratelimit", onRate);
    };
  }, [qc, t]);

  if (blocked) {
    const bot = config.data?.botUsername;
    return (
      <Centered art={homeBook} title={t("boot.browserTitle")} text={t("boot.browserText")}>
        <Btn size="lg" className="mt-2 w-full" disabled={!bot} data-testid="button-open-bot" onClick={() => bot && (window.location.href = `https://t.me/${bot}`)}>
          <Send className="size-5" />{t("boot.openBot")}
        </Btn>
      </Centered>
    );
  }
  const authCode = authErrorCode ?? (apiStatus(session.error) === 401 ? apiCode(session.error) ?? "AUTH_INVALID" : null);
  if (authCode) {
    const titleKey = authCode === "AUTH_EXPIRED"
      ? "boot.authTitle"
      : authCode === "AUTH_REQUIRED"
        ? "boot.authRequiredTitle"
        : "boot.authInvalidTitle";
    const textKey = authCode === "AUTH_EXPIRED"
      ? "boot.authText"
      : authCode === "AUTH_REQUIRED"
        ? "boot.authRequiredText"
        : "boot.authInvalidText";
    return <Centered icon={<KeyRound className="size-8 text-teal" />} title={t(titleKey)} text={t(textKey)} />;
  }
  if (session.isError || config.isError) {
    const errors = [session.error, config.error];
    const hasServerError = errors.some((error) => (apiStatus(error) ?? 0) >= 500);
    const hasHttpError = errors.some((error) => apiStatus(error) !== undefined);
    return (
      <Centered
        art={supportChat}
        title={t(hasServerError ? "boot.serverErrorTitle" : hasHttpError ? "boot.responseErrorTitle" : "boot.errorTitle")}
        text={t(hasServerError ? "boot.serverErrorText" : hasHttpError ? "boot.responseErrorText" : "boot.errorText")}
      >
        {hasHttpError
          ? <Server data-testid="icon-error-server" className="size-5 text-muted-foreground" />
          : <WifiOff data-testid="icon-error-network" className="size-5 text-muted-foreground" />}
        <Btn size="lg" className="w-full" disabled={session.isPending || config.isFetching} data-testid="button-boot-retry" onClick={() => { if (config.isError) config.refetch(); if (session.isError) mutateRef.current({ data: LAUNCH_REF }); }}>
          <RefreshCw className="size-5" />{t("boot.retry")}
        </Btn>
      </Centered>
    );
  }
  if (!session.data || !config.data) return <Loading />;
  return <AppRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <div className="blobs" />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Boot />
        </WouterRouter>
        <Toaster />
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;

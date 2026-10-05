import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Heart, Home, Loader2, RefreshCw, Trophy, UserRound, Users, CloudOff } from "lucide-react";
import { bindTelegramBackButton, haptic, isInTelegram } from "@/lib/telegram";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function Page({ children, back, onBack, nav = false, className }: { children: ReactNode; back?: string; onBack?: () => void; nav?: boolean; className?: string }) {
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!back && !onBack) return;
    return bindTelegramBackButton(() => (onBack ? onBack() : navigate(back!)));
  }, [back, onBack, navigate]);
  return (
    <>
      <motion.main initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
        className={cn("screen pt-safe px-4", nav ? "pb-nav" : "pb-safe", className)}>
        {children}
      </motion.main>
      {nav && <BottomNav />}
    </>
  );
}

export function TopBar({ title, back, onBack, right }: { title?: string; back?: string; onBack?: () => void; right?: ReactNode }) {
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const showBack = (back || onBack) && !isInTelegram();
  return (
    <div className="mb-4 flex min-h-11 items-center gap-3">
      {showBack && (
        <button data-testid="button-back" aria-label={t("common.back")} onClick={() => { haptic.tap(); onBack ? onBack() : navigate(back!); }}
          className="tactile btn-soft grid size-11 shrink-0 place-items-center rounded-2xl">
          <ArrowLeft className="size-5" />
        </button>
      )}
      {title && <h1 className="min-w-0 flex-1 truncate text-[22px] font-extrabold">{title}</h1>}
      {right}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "peach" | "soft" | "ghost"; loading?: boolean; size?: "md" | "lg" | "sm" };
export function Btn({ variant = "primary", loading, size = "md", className, children, disabled, onClick, ...rest }: BtnProps) {
  return (
    <button {...rest} disabled={disabled || loading}
      onClick={(e) => { haptic.tap(); onClick?.(e); }}
      className={cn("tactile inline-flex items-center justify-center gap-2 font-bold disabled:opacity-55 disabled:pointer-events-none",
        size === "lg" ? "h-14 rounded-[20px] px-6 text-base" : size === "sm" ? "h-9 rounded-xl px-3 text-[13px]" : "h-12 rounded-2xl px-5 text-[15px]",
        variant === "primary" && "btn-primary", variant === "peach" && "btn-peach", variant === "soft" && "btn-soft",
        variant === "ghost" && "text-secondary-foreground hover:bg-secondary", className)}>
      {loading ? <Loader2 className="size-5 animate-spin" /> : children}
    </button>
  );
}

export function Glass({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cn("glass p-4", className)}>{children}</div>;
}

export function Skel({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-2xl", className)} />;
}

export function ErrorState({ onRetry, text }: { onRetry?: () => void; text?: string }) {
  const { t } = useI18n();
  return (
    <Glass className="flex flex-col items-center gap-3 py-8 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-peach/30"><CloudOff className="size-7 text-coral" /></div>
      <p className="max-w-[240px] text-sm text-muted-foreground">{text ?? t("common.error")}</p>
      {onRetry && <Btn variant="soft" size="sm" data-testid="button-retry" onClick={onRetry}><RefreshCw className="size-4" />{t("common.retry")}</Btn>}
    </Glass>
  );
}

export function EmptyState({ art, text }: { art?: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      {art && <img src={art} alt="" className="float h-24 w-24 object-contain opacity-90" />}
      <p className="max-w-[240px] text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

const avatarTones = ["from-aqua to-sky", "from-mint to-aqua", "from-peach to-coral", "from-sky to-mint"];
export function Avatar({ name, photoUrl, size = 44, className }: { name: string; photoUrl?: string | null; size?: number; className?: string }) {
  const initials = name.split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "?";
  const tone = avatarTones[(name.charCodeAt(0) || 0) % avatarTones.length];
  return (
    <div style={{ width: size, height: size }} className={cn("relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br ring-2 ring-white", tone, className)}>
      {photoUrl ? <img src={photoUrl} alt="" className="size-full object-cover" /> :
        <span className="grid size-full place-items-center font-display font-bold text-white" style={{ fontSize: size * 0.38 }}>{initials}</span>}
    </div>
  );
}

export function Hearts({ count, max, size = 22 }: { count: number; max: number; size?: number }) {
  return (
    <div className="flex items-center gap-1" data-testid="hearts">
      {Array.from({ length: max }).map((_, i) => {
        const alive = i < count;
        return (
          <motion.span key={i} initial={false} animate={alive ? { scale: 1, opacity: 1, rotate: 0 } : { scale: [1.5, 0.85], opacity: 0.4, rotate: [0, -14, 0] }} transition={{ duration: 0.45 }}>
            <Heart style={{ width: size, height: size }} className={alive ? "fill-coral text-coral" : "text-muted-foreground/50"} />
          </motion.span>
        );
      })}
    </div>
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(200_40%_20%/.35)] p-3 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="solid-card pb-safe max-h-[88dvh] w-full max-w-md overflow-y-auto p-5">
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-muted", className)}>
      <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-aqua to-mint" initial={{ scaleX: 0 }} animate={{ scaleX: Math.min(1, Math.max(0, value)) }} transition={{ duration: 0.6, ease: "easeOut" }} />
    </div>
  );
}

function BottomNav() {
  const [loc] = useLocation();
  const { t } = useI18n();
  const items = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/leaderboard", icon: Trophy, label: t("nav.leaderboard") },
    { href: "/friends", icon: Users, label: t("nav.friends") },
    { href: "/profile", icon: UserRound, label: t("nav.profile") },
  ];
  return (
    <nav className="nav-safe fixed inset-x-0 z-40 mx-auto w-[calc(100%-24px)] max-w-[436px]">
      <div className="glass grid grid-cols-4 gap-1 rounded-[26px] p-1.5">
        {items.map((it) => {
          const active = loc === it.href;
          return (
            <Link key={it.href} href={it.href} data-testid={`nav-${it.href.replace("/", "") || "home"}`} onClick={() => haptic.select()}
              className="relative flex flex-col items-center gap-0.5 rounded-[20px] py-2 text-[11px] font-bold">
              {active && <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-secondary to-[hsl(145_36%_88%)]" transition={{ type: "spring", damping: 30, stiffness: 400 }} />}
              <it.icon className={cn("relative size-[22px]", active ? "text-teal" : "text-muted-foreground")} strokeWidth={active ? 2.4 : 2} />
              <span className={cn("relative", active ? "text-secondary-foreground" : "text-muted-foreground")}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

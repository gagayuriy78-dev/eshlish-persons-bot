import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export const CHART_COLORS = ["hsl(145 42% 42%)", "hsl(158 55% 55%)", "hsl(20 92% 70%)", "hsl(205 80% 64%)", "hsl(4 76% 66%)", "hsl(172 50% 42%)", "hsl(36 95% 66%)", "hsl(196 60% 50%)"];

export function Panel({ title, right, children, className }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("solid-card p-4", className)}>
      {(title || right) && <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-base font-extrabold">{title}</h3>{right}</div>}
      {children}
    </section>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead><tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">{head.map((h) => <th key={h} className="whitespace-nowrap px-2 py-2 font-bold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {empty && <p className="py-8 text-center text-sm text-muted-foreground">{t("common.empty")}</p>}
    </div>
  );
}
export const Td = ({ children, className }: { children: ReactNode; className?: string }) => <td className={cn("whitespace-nowrap px-2 py-2.5", className)}>{children}</td>;

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-3 flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{t("common.total", { count: total })}</span>
      <div className="flex items-center gap-2">
        <button data-testid="button-prev-page" aria-label={t("common.prev")} disabled={page <= 1} onClick={() => onPage(page - 1)} className="tactile btn-soft grid size-9 place-items-center rounded-xl disabled:opacity-40"><ChevronLeft className="size-4" /></button>
        <span className="font-semibold">{t("common.page", { page, pages })}</span>
        <button data-testid="button-next-page" aria-label={t("common.next")} disabled={page >= pages} onClick={() => onPage(page + 1)} className="tactile btn-soft grid size-9 place-items-center rounded-xl disabled:opacity-40"><ChevronRight className="size-4" /></button>
      </div>
    </div>
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={cn("h-10 rounded-xl border border-input bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring", className)}>{children}</select>;
}
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn("h-10 rounded-xl border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring", className)} />;
}

export function Pill({ children, tone = "aqua" }: { children: ReactNode; tone?: "aqua" | "mint" | "peach" | "coral" | "muted" }) {
  const map = { aqua: "bg-secondary text-secondary-foreground", mint: "bg-mint/40", peach: "bg-peach/40", coral: "bg-coral/20 text-[hsl(4_60%_40%)]", muted: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", map[tone])}>{children}</span>;
}

export function Kpi({ label, value, icon, accent }: { label: string; value: string | number; icon: ReactNode; accent?: boolean }) {
  return (
    <div className={cn("solid-card flex items-center gap-3 p-3.5", accent && "bg-gradient-to-br from-[hsl(24_100%_94%)] to-[hsl(140_36%_99%)]")}>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-teal">{icon}</div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-extrabold">{value}</p>
      </div>
    </div>
  );
}

export function LoadingBlock() {
  return <div className="grid gap-3"><div className="shimmer h-24 rounded-2xl" /><div className="shimmer h-64 rounded-2xl" /></div>;
}

import { useState } from "react";
import { Link } from "wouter";
import { Check, ChevronRight, Headphones, MapPin, Pencil, Phone, CalendarDays, Languages } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, useUpdateMe, type UpdateMeInputRegion } from "@workspace/api-client-react";
import { Avatar, Glass, Modal, Page, TopBar } from "@/components/kit";
import { useI18n, type Language } from "@/i18n";
import { formatPhone, useConfig, useMe } from "@/lib/api";
import { haptic } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import badge from "@/assets/3d/profile-badge.webp";

export default function ProfilePage() {
  const me = useMe();
  const config = useConfig();
  const { t, lang, setLang, formatDate, formatNumber } = useI18n();
  const qc = useQueryClient();
  const update = useUpdateMe({ mutation: { onSuccess: (m) => qc.setQueryData(getGetMeQueryKey(), m), onError: () => toast(t("common.error"), "warn") } });
  const [regionOpen, setRegionOpen] = useState(false);
  const name = [me.firstName, me.lastName].filter(Boolean).join(" ");

  const switchLang = (l: Language) => {
    if (l === lang) return;
    haptic.select();
    setLang(l);
    update.mutate({ data: { language: l } });
  };

  const stats = [
    { label: t("profile.basicTests"), value: me.stats.basicTests },
    { label: t("profile.proAttempts"), value: me.stats.proAttempts },
    { label: t("profile.bestBasic"), value: `${Math.round(me.stats.bestBasicPercentage)}%` },
    { label: t("profile.bestPro"), value: `${Math.round(me.stats.bestProPercentage)}%` },
    { label: t("profile.referrals"), value: me.stats.referrals },
    { label: t("profile.rank"), value: me.stats.rank ? `#${me.stats.rank}` : "—" },
  ];

  return (
    <Page nav>
      <TopBar title={t("profile.title")} />
      <Glass className="relative flex items-center gap-4 overflow-hidden p-5">
        <img src={badge} alt="" className="absolute -right-5 -top-4 h-28 w-28 object-contain opacity-90" />
        <Avatar name={name} photoUrl={me.photoUrl} size={68} />
        <div className="relative min-w-0 flex-1">
          <h2 className="truncate text-xl font-extrabold" data-testid="text-name">{name}</h2>
          {me.username && <p className="text-sm text-muted-foreground">@{me.username}</p>}
          <div className="mt-2 flex gap-2 text-xs font-bold">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground" data-testid="text-level">{me.englishLevel ?? t("home.noLevel")}</span>
            <span className="rounded-full bg-peach/40 px-2.5 py-1">{t("home.points", { points: formatNumber(me.points) })}</span>
          </div>
        </div>
      </Glass>

      <div className="mt-3 flex flex-col divide-y divide-border overflow-hidden rounded-[24px] glass p-0">
        <InfoRow icon={Phone} label={t("profile.phone")} value={me.phoneNumber ? formatPhone(me.phoneNumber) : t("profile.noPhone")} testid="text-phone" />
        <button data-testid="button-change-region" onClick={() => setRegionOpen(true)} className="tactile w-full text-left">
          <InfoRow icon={MapPin} label={t("profile.region")} value={me.region ?? "—"} action={<Pencil className="size-4 text-teal" />} testid="text-region" />
        </button>
        <InfoRow icon={CalendarDays} label={t("profile.registered")} value={formatDate(me.registrationDate)} testid="text-registered" />
        <div className="flex items-center gap-3 px-4 py-3">
          <Languages className="size-5 text-teal" />
          <span className="flex-1 text-sm font-semibold">{t("profile.language")}</span>
          <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
            {(["uz", "en"] as const).map((l) => (
              <button key={l} data-testid={`button-lang-${l}`} onClick={() => switchLang(l)}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", lang === l ? "btn-primary" : "text-muted-foreground")}>{t(l === "uz" ? "profile.uz" : "profile.en")}</button>
            ))}
          </div>
        </div>
      </div>

      <h3 className="mb-2 mt-5 text-lg font-extrabold">{t("profile.stats")}</h3>
      <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3">
        {stats.map((s, i) => (
          <Glass key={i} className="px-3 py-3">
            <p className="text-[11px] font-semibold leading-tight text-muted-foreground">{s.label}</p>
            <p className="mt-1 font-display text-xl font-extrabold" data-testid={`stat-${i}`}>{s.value}</p>
          </Glass>
        ))}
      </div>

      <Link href="/support" data-testid="link-support" className="tactile glass mt-4 flex items-center gap-3 p-4 font-bold">
        <Headphones className="size-5 text-sky" /><span className="flex-1">{t("profile.support")}</span><ChevronRight className="size-5 text-muted-foreground" />
      </Link>

      <Modal open={regionOpen} onClose={() => setRegionOpen(false)}>
        <h3 className="mb-3 text-xl font-extrabold">{t("profile.changeRegion")}</h3>
        <div className="grid grid-cols-2 gap-2">
          {config.regions.map((r) => (
            <button key={r} data-testid={`button-region-${r}`} disabled={update.isPending}
              onClick={() => update.mutate({ data: { region: r as UpdateMeInputRegion } }, { onSuccess: () => { haptic.success(); setRegionOpen(false); } })}
              className={cn("tactile flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-[13px] font-bold", me.region === r ? "border-teal bg-secondary" : "border-border")}>
              {me.region === r ? <Check className="size-4 text-teal" /> : <MapPin className="size-4 text-muted-foreground" />}{r}
            </button>
          ))}
        </div>
      </Modal>
    </Page>
  );
}

function InfoRow({ icon: Icon, label, value, action, testid }: { icon: typeof Phone; label: string; value: string; action?: React.ReactNode; testid: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="size-5 text-teal" />
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <span className="text-sm text-muted-foreground" data-testid={testid}>{value}</span>
      {action}
    </div>
  );
}

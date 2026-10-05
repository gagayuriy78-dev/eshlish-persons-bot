import { useEffect, useState } from "react";
import { BadgeCheck, CircleAlert, RotateCcw, Search } from "lucide-react";
import { useListAdminUsers, type ListAdminUsersMode, type ListAdminUsersParams } from "@workspace/api-client-react";
import { Avatar, ErrorState } from "@/components/kit";
import { useI18n } from "@/i18n";
import { formatPhone, useConfig } from "@/lib/api";
import { Input, LoadingBlock, Pager, Panel, Pill, Select, Table, Td } from "./admin-kit";

export default function UsersSection() {
  const { t, formatDate, formatNumber } = useI18n();
  const config = useConfig();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [level, setLevel] = useState("");
  const [mode, setMode] = useState("");
  const [hasReferrals, setHasReferrals] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => { const h = window.setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 350); return () => window.clearTimeout(h); }, [qInput]);

  const params: ListAdminUsersParams = { page, pageSize };
  if (q) params.q = q;
  if (region) params.region = region;
  if (level) params.level = level;
  if (mode) params.mode = mode as ListAdminUsersMode;
  if (hasReferrals) params.hasReferrals = true;
  if (from) params.from = from;
  if (to) params.to = to;
  const list = useListAdminUsers(params);
  const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };
  const reset = () => { setQInput(""); setRegion(""); setLevel(""); setMode(""); setHasReferrals(false); setFrom(""); setTo(""); setPage(1); };

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input data-testid="input-user-search" placeholder={t("common.search")} value={qInput} onChange={(e) => setQInput(e.target.value)} className="w-full pl-9" />
        </div>
        <Select data-testid="select-region" value={region} onChange={(e) => set(setRegion)(e.target.value)}>
          <option value="">{t("admin.users.region")}: {t("common.all")}</option>
          {config.regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
        <Select data-testid="select-level" value={level} onChange={(e) => set(setLevel)(e.target.value)}>
          <option value="">{t("admin.users.level")}: {t("common.all")}</option>
          {config.levels.map((l) => <option key={l} value={l}>{l}</option>)}
        </Select>
        <Select data-testid="select-mode" value={mode} onChange={(e) => set(setMode)(e.target.value)}>
          <option value="">{t("admin.users.mode")}: {t("common.all")}</option>
          <option value="basic">{t("admin.users.modeBasic")}</option>
          <option value="pro">{t("admin.users.modePro")}</option>
          <option value="none">{t("admin.users.modeNone")}</option>
        </Select>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-input bg-card px-3 text-sm font-semibold">
          <input data-testid="checkbox-has-referrals" type="checkbox" checked={hasReferrals} onChange={(e) => set(setHasReferrals)(e.target.checked)} className="accent-[hsl(184_72%_38%)]" />
          {t("admin.users.hasReferrals")}
        </label>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">{t("admin.users.from")}<Input data-testid="input-from" type="date" value={from} onChange={(e) => set(setFrom)(e.target.value)} /></label>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">{t("admin.users.to")}<Input data-testid="input-to" type="date" value={to} onChange={(e) => set(setTo)(e.target.value)} /></label>
        <button data-testid="button-reset-filters" onClick={reset} className="tactile btn-soft flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold"><RotateCcw className="size-4" />{t("admin.users.reset")}</button>
      </div>
      {list.isLoading ? <LoadingBlock /> : list.isError || !list.data ? <ErrorState onRetry={() => list.refetch()} /> : (
        <>
          <Table empty={list.data.items.length === 0} head={[t("admin.users.name"), t("admin.users.phone"), t("admin.users.region"), t("admin.users.level"), t("admin.users.points"), t("admin.users.games"), t("admin.users.referrals"), t("admin.users.registered"), t("admin.users.lastActive")]}>
            {list.data.items.map((u) => (
              <tr key={u.telegramId} data-testid={`row-user-${u.telegramId}`}>
                <Td><div className="flex items-center gap-2"><Avatar name={u.firstName} size={30} /><div><p className="font-bold">{[u.firstName, u.lastName].filter(Boolean).join(" ")}</p><p className="text-[11px] text-muted-foreground">{u.username ? `@${u.username}` : u.telegramId}</p></div></div></Td>
                <Td>{u.phoneNumber ? <span className="flex items-center gap-1.5">{formatPhone(u.phoneNumber)}{u.phoneVerified ? <BadgeCheck className="size-4 text-teal" aria-label={t("admin.users.verified")} /> : <CircleAlert className="size-4 text-coral" aria-label={t("admin.users.unverified")} />}</span> : "—"}</Td>
                <Td>{u.region ?? "—"}</Td>
                <Td>{u.englishLevel ? <Pill>{u.englishLevel}</Pill> : "—"}</Td>
                <Td className="font-bold">{formatNumber(u.points)}</Td>
                <Td>{u.basicTests} / <span className="text-[hsl(14_60%_45%)]">{u.proAttempts}</span></Td>
                <Td>{u.referralCount}</Td>
                <Td>{formatDate(u.registrationDate)}</Td>
                <Td>{formatDate(u.lastActive)}</Td>
              </tr>
            ))}
          </Table>
          <Pager page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} />
        </>
      )}
    </Panel>
  );
}

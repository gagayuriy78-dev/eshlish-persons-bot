import { Lock } from "lucide-react";
import { useGetAdminSettings } from "@workspace/api-client-react";
import { ErrorState } from "@/components/kit";
import { useI18n } from "@/i18n";
import { formatPhone } from "@/lib/api";
import { LoadingBlock, Panel, Pill, Table, Td } from "./admin-kit";

const ACTION_KEYS = {
  "question.create": "admin.action.question.create",
  "question.update": "admin.action.question.update",
  "question.delete": "admin.action.question.delete",
  "support.status": "admin.action.support.status",
} as const;

export default function SettingsSection() {
  const { t, formatNumber, formatDate } = useI18n();
  const actionLabel = (a: string) => (a in ACTION_KEYS ? t(ACTION_KEYS[a as keyof typeof ACTION_KEYS]) : a);
  const s = useGetAdminSettings();
  if (s.isLoading) return <LoadingBlock />;
  if (s.isError || !s.data) return <ErrorState onRetry={() => s.refetch()} />;
  const d = s.data;
  const rows: [string, string][] = [
    [t("admin.set.prize"), `${formatNumber(d.prizeUzs)} ${t("common.sum")}`],
    [t("admin.set.dailyFree"), String(d.dailyFreeProGames)],
    [t("admin.set.hearts"), String(d.maxHearts)],
    [t("admin.set.basicCount"), String(d.basicQuestionCount)],
    [t("admin.set.proCount"), String(d.proQuestionCount)],
    [t("admin.set.extraRefs"), String(d.extraChanceReferrals)],
    [t("admin.set.refReward"), String(d.referralRewardPoints)],
    [t("admin.set.timer"), t("quiz.seconds", { seconds: d.currentTimerSeconds })],
    [t("admin.set.activeNow"), String(d.activeGamesNow)],
    [t("admin.set.supportPhone"), formatPhone(d.supportPhone)],
    [t("admin.set.bot"), d.botUsername ? `@${d.botUsername}` : "—"],
  ];
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Lock className="size-3.5" />{t("admin.set.readOnly")}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <dl className="divide-y divide-border">
            {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-2.5 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="font-bold">{v}</dd></div>)}
          </dl>
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title={t("admin.set.adminIds")}>
            <div className="flex flex-wrap gap-2">{d.adminIds.map((id) => <Pill key={id}>{id}</Pill>)}</div>
          </Panel>
          <Panel title={t("admin.set.timerRules")}>
            <ul className="flex flex-col gap-1.5 text-sm">
              {d.timerRules.map((r, i) => <li key={i} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">{t("admin.set.timerRule", { games: r.minActiveGames, seconds: r.seconds })}{r.seconds === d.currentTimerSeconds && <Pill tone="mint">{t("admin.set.current")}</Pill>}</li>)}
            </ul>
          </Panel>
        </div>
      </div>
      <Panel title={t("admin.set.actions")}>
        <Table empty={d.recentActions.length === 0} head={["#", t("admin.set.admin"), t("admin.set.action"), t("admin.set.target"), t("admin.ref.date")]}>
          {d.recentActions.map((a) => (
            <tr key={a.id}><Td className="text-muted-foreground">{a.id}</Td><Td>{a.adminId}</Td><Td className="font-bold">{actionLabel(a.action)}</Td><Td>{[a.targetType, a.targetId].filter(Boolean).join(" #") || "—"}</Td><Td>{formatDate(a.createdAt)}</Td></tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}

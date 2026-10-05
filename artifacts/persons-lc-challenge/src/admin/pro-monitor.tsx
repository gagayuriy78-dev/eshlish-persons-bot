import { RefreshCw } from "lucide-react";
import { getGetAdminProMonitorQueryKey, useGetAdminProMonitor, type AdminProGame } from "@workspace/api-client-react";
import { ErrorState, Hearts } from "@/components/kit";
import { useI18n } from "@/i18n";
import { LoadingBlock, Panel, Pill, Table, Td } from "./admin-kit";

export default function ProMonitor() {
  const { t } = useI18n();
  const m = useGetAdminProMonitor({ query: { queryKey: getGetAdminProMonitorQueryKey(), refetchInterval: 10_000 } });
  if (m.isLoading) return <LoadingBlock />;
  if (m.isError || !m.data) return <ErrorState onRetry={() => m.refetch()} />;
  const d = m.data;
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><RefreshCw className={m.isFetching ? "size-3.5 animate-spin" : "size-3.5"} />{t("admin.pro.autoRefresh")}</p>
      <GameTable title={t("admin.pro.active")} rows={d.active} tone="aqua" />
      <GameTable title={t("admin.pro.winners")} rows={d.winners} tone="peach" />
      <GameTable title={t("admin.pro.leaders")} rows={d.leaders} tone="mint" />
      <GameTable title={t("admin.pro.eliminated")} rows={d.eliminated} tone="coral" />
    </div>
  );
}

function GameTable({ title, rows, tone }: { title: string; rows: AdminProGame[]; tone: "aqua" | "peach" | "mint" | "coral" }) {
  const { t, formatDate } = useI18n();
  const time = (s: string) => `${formatDate(s)} ${new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return (
    <Panel title={title} right={<Pill tone={tone}>{rows.length}</Pill>}>
      <Table empty={rows.length === 0} head={[t("admin.users.name"), t("admin.pro.question"), t("admin.pro.correct"), t("admin.pro.hearts"), t("admin.users.points"), t("admin.pro.started"), t("admin.pro.lastActivity")]}>
        {rows.map((g) => (
          <tr key={g.gameId} data-testid={`row-pro-${g.gameId}`}>
            <Td><p className="font-bold">{g.name}</p><p className="text-[11px] text-muted-foreground">{g.username ? `@${g.username}` : g.telegramId}</p></Td>
            <Td>{g.currentQuestion}/{g.total}</Td>
            <Td>{g.correctCount}</Td>
            <Td><Hearts count={g.hearts} max={Math.max(2, g.hearts)} size={16} /></Td>
            <Td className="font-bold">{g.pointsEarned}</Td>
            <Td>{time(g.startedAt)}</Td>
            <Td>{time(g.finishedAt ?? g.lastActivityAt)}</Td>
          </tr>
        ))}
      </Table>
    </Panel>
  );
}

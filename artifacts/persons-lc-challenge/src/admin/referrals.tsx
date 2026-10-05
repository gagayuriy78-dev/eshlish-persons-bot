import { useState } from "react";
import { Crown } from "lucide-react";
import { useListAdminReferrals } from "@workspace/api-client-react";
import { Avatar, ErrorState } from "@/components/kit";
import { useI18n } from "@/i18n";
import { LoadingBlock, Pager, Panel, Pill, Table, Td } from "./admin-kit";

export default function Referrals() {
  const { t, formatDate } = useI18n();
  const [page, setPage] = useState(1);
  const r = useListAdminReferrals({ page, pageSize: 20 });
  if (r.isLoading) return <LoadingBlock />;
  if (r.isError || !r.data) return <ErrorState onRetry={() => r.refetch()} />;
  const d = r.data;
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Panel title={t("admin.ref.top")}>
        {d.topInviters.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t("common.empty")}</p> : (
          <ol className="flex flex-col gap-2">
            {d.topInviters.map((x, i) => (
              <li key={x.telegramId} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2" data-testid={`row-top-inviter-${x.telegramId}`}>
                <span className="w-5 font-display font-extrabold text-muted-foreground">{i + 1}</span>
                <Avatar name={x.name} size={32} />
                <span className="flex-1 truncate text-sm font-bold">{x.name}</span>
                {i === 0 && <Crown className="size-4 text-[hsl(30_90%_55%)]" />}
                <Pill>{x.count}</Pill>
              </li>
            ))}
          </ol>
        )}
      </Panel>
      <Panel>
        <Table empty={d.items.length === 0} head={[t("admin.ref.inviter"), t("admin.ref.invitee"), t("admin.users.region"), t("admin.ref.reward"), t("admin.ref.date")]}>
          {d.items.map((x) => (
            <tr key={x.id} data-testid={`row-referral-${x.id}`}>
              <Td className="font-bold">{x.inviterName}</Td>
              <Td>{x.inviteeName}</Td>
              <Td>{x.inviteeRegion ?? "—"}</Td>
              <Td><Pill tone="mint">+{x.rewardPoints}</Pill></Td>
              <Td>{formatDate(x.createdAt)}</Td>
            </tr>
          ))}
        </Table>
        <Pager page={d.page} pageSize={d.pageSize} total={d.total} onPage={setPage} />
      </Panel>
    </div>
  );
}

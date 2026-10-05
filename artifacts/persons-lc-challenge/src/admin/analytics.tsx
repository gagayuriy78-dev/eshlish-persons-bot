import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGetAdminStats } from "@workspace/api-client-react";
import { ErrorState } from "@/components/kit";
import { useI18n } from "@/i18n";
import { CHART_COLORS, LoadingBlock, Panel, Pill, Table, Td } from "./admin-kit";
import { shortDate } from "./dashboard";

export default function Analytics() {
  const { t } = useI18n();
  const s = useGetAdminStats();
  if (s.isLoading) return <LoadingBlock />;
  if (s.isError || !s.data) return <ErrorState onRetry={() => s.refetch()} />;
  const d = s.data;
  const totals = d.gamesByDay.reduce((a, x) => ({ basic: a.basic + x.basic, pro: a.pro + x.pro }), { basic: 0, pro: 0 });
  const split = [{ label: t("admin.chart.basic"), count: totals.basic }, { label: t("admin.chart.pro"), count: totals.pro }];
  const funnel = [
    { label: t("admin.kpi.totalUsers"), count: d.totalUsers },
    { label: t("admin.kpi.phoneLeads"), count: d.phoneLeads },
    { label: t("admin.kpi.basicUsers"), count: d.basicUsers },
    { label: t("admin.kpi.proUsers"), count: d.proUsers },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t("admin.chart.games")} className="lg:col-span-2">
          <div className="h-56"><ResponsiveContainer>
            <LineChart data={d.gamesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 24% 90%)" /><XAxis dataKey="date" tickFormatter={shortDate} fontSize={11} /><YAxis allowDecimals={false} fontSize={11} width={30} /><Tooltip /><Legend />
              <Line type="monotone" dataKey="basic" name={t("admin.chart.basic")} stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="pro" name={t("admin.chart.pro")} stroke={CHART_COLORS[2]} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer></div>
        </Panel>
        <Panel title={t("admin.an.gamesSplit")}>
          <div className="h-56"><ResponsiveContainer>
            <PieChart><Tooltip /><Legend />
              <Pie data={split} dataKey="count" nameKey="label" innerRadius={45} outerRadius={78}>{split.map((_, i) => <Cell key={i} fill={CHART_COLORS[i === 0 ? 0 : 2]} />)}</Pie>
            </PieChart>
          </ResponsiveContainer></div>
        </Panel>
      </div>
      <Panel title={t("admin.an.funnel")}>
        <div className="h-52"><ResponsiveContainer>
          <BarChart data={funnel}><XAxis dataKey="label" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} width={34} /><Tooltip />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>{funnel.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer></div>
      </Panel>
      <Panel title={t("admin.chart.hardest")}>
        <Table empty={d.hardestQuestions.length === 0} head={["#", t("admin.q.text"), t("admin.q.level"), t("admin.an.served"), t("admin.an.failRate")]}>
          {d.hardestQuestions.map((q) => {
            const pct = q.failRate <= 1 ? q.failRate * 100 : q.failRate;
            return (
              <tr key={q.id} data-testid={`row-hardest-${q.id}`}>
                <Td className="text-muted-foreground">{q.id}</Td>
                <Td className="max-w-[360px] whitespace-normal">{q.text}</Td>
                <Td><Pill>{q.level}</Pill></Td>
                <Td>{q.served}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-peach to-coral" style={{ width: `${Math.min(100, pct)}%` }} /></div>
                    <span className="font-bold">{pct.toFixed(1)}%</span>
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </div>
  );
}

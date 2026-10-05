import { Activity, Crown, HelpCircle, Inbox, Phone, Radio, Share2, UserPlus, Users, BookOpen } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGetAdminStats } from "@workspace/api-client-react";
import { ErrorState } from "@/components/kit";
import { useI18n } from "@/i18n";
import { CHART_COLORS, Kpi, LoadingBlock, Panel } from "./admin-kit";

export const shortDate = (d: string) => d.slice(5);

export default function Dashboard() {
  const { t, formatNumber } = useI18n();
  const s = useGetAdminStats();
  if (s.isLoading) return <LoadingBlock />;
  if (s.isError || !s.data) return <ErrorState onRetry={() => s.refetch()} />;
  const d = s.data;
  const levels = d.levelDistribution.map((x) => ({ ...x, label: x.label === "none" ? t("home.noLevel") : x.label }));
  const kpis = [
    { k: "admin.kpi.totalUsers", v: d.totalUsers, i: <Users className="size-5" /> },
    { k: "admin.kpi.newToday", v: d.newToday, i: <UserPlus className="size-5" /> },
    { k: "admin.kpi.activeUsers", v: d.activeUsers, i: <Activity className="size-5" /> },
    { k: "admin.kpi.proUsers", v: d.proUsers, i: <Crown className="size-5" />, a: true },
    { k: "admin.kpi.basicUsers", v: d.basicUsers, i: <BookOpen className="size-5" /> },
    { k: "admin.kpi.phoneLeads", v: d.phoneLeads, i: <Phone className="size-5" /> },
    { k: "admin.kpi.referrals", v: d.referrals, i: <Share2 className="size-5" /> },
    { k: "admin.kpi.activeProGames", v: d.activeProGames, i: <Radio className="size-5" />, a: true },
    { k: "admin.kpi.openSupport", v: d.openSupport, i: <Inbox className="size-5" /> },
    { k: "admin.kpi.questions", v: d.questions, i: <HelpCircle className="size-5" /> },
  ] as const;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map((x) => <Kpi key={x.k} label={t(x.k)} value={formatNumber(x.v)} icon={x.i} accent={"a" in x} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("admin.chart.signups")}>
          <div className="h-56"><ResponsiveContainer>
            <AreaChart data={d.signupsByDay}>
              <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={CHART_COLORS[0]} stopOpacity={0.45} /><stop offset="1" stopColor={CHART_COLORS[0]} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 24% 90%)" /><XAxis dataKey="date" tickFormatter={shortDate} fontSize={11} /><YAxis allowDecimals={false} fontSize={11} width={30} /><Tooltip />
              <Area isAnimationActive={false} type="monotone" dataKey="count" stroke={CHART_COLORS[0]} strokeWidth={2.5} fill="url(#sg)" />
            </AreaChart>
          </ResponsiveContainer></div>
        </Panel>
        <Panel title={t("admin.chart.games")}>
          <div className="h-56"><ResponsiveContainer>
            <BarChart data={d.gamesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 24% 90%)" /><XAxis dataKey="date" tickFormatter={shortDate} fontSize={11} /><YAxis allowDecimals={false} fontSize={11} width={30} /><Tooltip /><Legend />
              <Bar isAnimationActive={false} dataKey="basic" name={t("admin.chart.basic")} stackId="g" fill={CHART_COLORS[0]} radius={[0, 0, 0, 0]} />
              <Bar isAnimationActive={false} dataKey="pro" name={t("admin.chart.pro")} stackId="g" fill={CHART_COLORS[2]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div>
        </Panel>
        <Panel title={t("admin.chart.levels")}>
          <div className="h-56"><ResponsiveContainer>
            <PieChart><Tooltip /><Legend />
              <Pie isAnimationActive={false} data={levels} dataKey="count" nameKey="label" innerRadius={45} outerRadius={80} paddingAngle={levels.length > 1 ? 2 : 0}>
                {levels.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer></div>
        </Panel>
        <Panel title={t("admin.chart.regions")}>
          <div className="h-56"><ResponsiveContainer>
            <BarChart data={d.regionDistribution} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="label" width={110} fontSize={11} /><Tooltip />
              <Bar isAnimationActive={false} dataKey="count" fill={CHART_COLORS[1]} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer></div>
        </Panel>
      </div>
    </div>
  );
}

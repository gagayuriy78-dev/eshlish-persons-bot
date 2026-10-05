import { Copy, Send, Ticket } from "lucide-react";
import { useGetReferrals } from "@workspace/api-client-react";
import { Avatar, Btn, EmptyState, ErrorState, Glass, Page, Progress, Skel, TopBar } from "@/components/kit";
import { useI18n } from "@/i18n";
import { haptic, shareLink } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import friendsArt from "@/assets/3d/friends-connected.webp";

export default function FriendsPage() {
  const { t, formatDate } = useI18n();
  const r = useGetReferrals();
  const d = r.data;

  const copy = async () => {
    if (!d?.link) return;
    try {
      await navigator.clipboard.writeText(d.link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = d.link; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    haptic.success();
    toast(t("friends.copied"), "ok");
  };

  return (
    <Page nav>
      <TopBar title={t("nav.friends")} />
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[hsl(145_42%_88%)] via-[hsl(140_48%_92%)] to-[hsl(152_42%_87%)] p-5">
        <img src={friendsArt} alt="" className="float absolute -right-4 -top-2 h-36 w-36 object-contain" />
        <h2 className="max-w-[60%] text-[22px] font-extrabold leading-tight">{t("friends.title")}</h2>
        <p className="mt-2 max-w-[68%] text-[13px] leading-snug text-[hsl(200_30%_30%)]">{t("friends.text")}</p>
      </section>

      {r.isLoading ? <div className="mt-4 flex flex-col gap-3"><Skel className="h-28" /><Skel className="h-40" /></div> :
        r.isError || !d ? <div className="mt-4"><ErrorState onRetry={() => r.refetch()} /></div> : (
          <div className="mt-4 flex flex-col gap-3">
            <Glass className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold">{t("friends.progress")}</span>
                <span className="font-display text-2xl font-extrabold text-teal" data-testid="text-progress">{d.progress}/{d.target}</span>
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${d.target}, 1fr)` }}>
                {Array.from({ length: d.target }).map((_, i) => <Progress key={i} value={i < d.progress ? 1 : 0} />)}
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="flex items-center gap-1 rounded-full bg-mint/40 px-3 py-1.5"><Ticket className="size-3.5" />{t("friends.earned", { count: d.extraChancesEarned })}</span>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground">{t("pro.extra", { count: d.extraChances })}</span>
              </div>
            </Glass>

            {d.link && (
              <Glass className="flex flex-col gap-3">
                <div className="truncate rounded-xl bg-muted px-3 py-2.5 font-mono text-xs text-muted-foreground" data-testid="text-link">{d.link}</div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Btn data-testid="button-share" onClick={() => shareLink(d.link!, t("friends.shareText"))}><Send className="size-5" />{t("friends.share")}</Btn>
                  <Btn variant="soft" data-testid="button-copy" onClick={copy}><Copy className="size-5" />{t("friends.copy")}</Btn>
                </div>
              </Glass>
            )}

            <h3 className="mt-2 text-lg font-extrabold">{t("friends.list")} <span className="text-muted-foreground">· {d.count}</span></h3>
            {d.referrals.length === 0 ? <EmptyState text={t("friends.empty")} /> : (
              <div className="flex flex-col gap-2">
                {d.referrals.map((f, i) => (
                  <div key={i} className="glass flex items-center gap-3 rounded-[20px] px-3.5 py-2.5" data-testid={`row-friend-${i}`}>
                    <Avatar name={f.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{f.name}</p>
                      <p className="text-[11px] text-muted-foreground">{f.region ?? ""}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground">{formatDate(f.joinedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </Page>
  );
}

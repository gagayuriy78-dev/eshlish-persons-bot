import { Link } from "wouter";
import { Page } from "@/components/kit";
import { useI18n } from "@/i18n";
import supportChat from "@/assets/3d/support-chat.webp";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <Page back="/">
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
        <img src={supportChat} alt="" className="float h-40 w-40 object-contain" />
        <h1 className="text-5xl font-extrabold text-teal">404</h1>
        <p className="text-muted-foreground">{t("common.notFound")}</p>
        <Link href="/" data-testid="link-home" className="tactile btn-primary rounded-2xl px-6 py-3 font-bold">{t("result.home")}</Link>
      </div>
    </Page>
  );
}

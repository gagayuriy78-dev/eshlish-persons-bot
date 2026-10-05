import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, Play } from "lucide-react";
import { useStartGame, type StartGameInputLevel } from "@workspace/api-client-react";
import { Btn, Page, TopBar } from "@/components/kit";
import { useI18n, type TranslationKey } from "@/i18n";
import { useConfig, useMe } from "@/lib/api";
import { haptic } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import basicBook from "@/assets/3d/basic-book.webp";

const tones = ["from-[hsl(145_45%_86%)]", "from-[hsl(150_42%_86%)]", "from-[hsl(156_40%_86%)]", "from-[hsl(140_38%_88%)]", "from-[hsl(152_36%_90%)]", "from-[hsl(20_100%_89%)]"];

export default function BasicPage() {
  const { t } = useI18n();
  const config = useConfig();
  const me = useMe();
  const [, navigate] = useLocation();
  const [level, setLevel] = useState<string>(me.englishLevel ?? "A1");
  const start = useStartGame();

  return (
    <Page back="/">
      <TopBar back="/" title={t("home.basicTitle")} />
      <div className="relative mb-4 flex items-center gap-3">
        <img src={basicBook} alt="" className="float h-28 w-28 shrink-0 object-contain" />
        <div>
          <h2 className="text-[22px] font-extrabold leading-tight">{t("basic.title")}</h2>
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{t("basic.text")}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {config.levels.map((l, i) => {
          const sel = level === l;
          return (
            <motion.button key={l} data-testid={`button-level-${l}`} whileTap={{ scale: 0.97 }} onClick={() => { haptic.select(); setLevel(l); }}
              className={cn("relative overflow-hidden rounded-[22px] border-2 bg-gradient-to-br to-white/90 p-4 text-left transition-colors", tones[i],
                sel ? "border-teal shadow-[0_12px_26px_-14px_hsl(188_80%_34%/.7)]" : "border-white/80")}>
              <span className="font-display text-[32px] font-extrabold leading-none">{l}</span>
              <p className="mt-1 text-[12px] font-semibold text-muted-foreground">{t(`level.${l}` as TranslationKey)}</p>
              {sel && <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-teal text-white"><Check className="size-4" /></span>}
            </motion.button>
          );
        })}
      </div>
      <Btn size="lg" className="mt-5 w-full" loading={start.isPending} data-testid="button-start-basic"
        onClick={() => start.mutate({ data: { mode: "basic", level: level as StartGameInputLevel } }, {
          onSuccess: (g) => navigate(`/game/${g.id}`),
          onError: () => toast(t("common.error"), "warn"),
        })}>
        <Play className="size-5 fill-current" />{t("basic.start")} · {level}
      </Btn>
    </Page>
  );
}

import { useState } from "react";
import { Redirect } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MapPin, Phone, ShieldCheck } from "lucide-react";
import { getGetMeQueryKey, useSubmitPhone, useSubmitRegion, type Me, type RegionInputRegion } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Btn, Glass, Page } from "@/components/kit";
import { useI18n } from "@/i18n";
import { useConfig, useMe } from "@/lib/api";
import { canRequestContact, haptic, requestContact } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import phoneArt from "@/assets/3d/onboarding-phone.webp";
import mapArt from "@/assets/3d/onboarding-map.webp";

export default function Onboarding() {
  const me = useMe();
  const { t } = useI18n();
  if (me.onboardingComplete) return <Redirect to="/" />;
  const step = me.phoneNumber ? 2 : 1;
  return (
    <Page>
      <div className="mb-5 flex items-center justify-between">
        <span className="font-display text-lg font-extrabold">{t("app.name")}</span>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground" data-testid="text-step">{t("onb.step", { current: step, total: 2 })}</span>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-2">
        {[1, 2].map((s) => <div key={s} className={cn("h-1.5 rounded-full", s <= step ? "bg-gradient-to-r from-aqua to-mint" : "bg-muted")} />)}
      </div>
      <AnimatePresence mode="wait">
        {step === 1 ? <PhoneStep key="p" /> : <RegionStep key="r" />}
      </AnimatePresence>
    </Page>
  );
}

function useSetMe() {
  const qc = useQueryClient();
  return (me: Me) => qc.setQueryData(getGetMeQueryKey(), me);
}

function PhoneStep() {
  const { t } = useI18n();
  const setMe = useSetMe();
  const submit = useSubmitPhone();
  const [declined, setDeclined] = useState(false);
  const [manual, setManual] = useState(!canRequestContact());
  const [digits, setDigits] = useState("");
  const [invalid, setInvalid] = useState(false);

  const onSuccess = (me: Me) => { haptic.success(); setMe(me); };
  const onError = () => toast(t("common.error"), "warn");

  const share = async () => {
    setDeclined(false);
    try {
      const contactResponse = await requestContact();
      if (!contactResponse) { haptic.warning(); setDeclined(true); return; }
      submit.mutate({ data: { contactResponse } }, { onSuccess, onError });
    } catch {
      setManual(true);
    }
  };
  const sendManual = () => {
    const d = digits.replace(/\D/g, "");
    if (d.length !== 9) { setInvalid(true); haptic.error(); return; }
    setInvalid(false);
    submit.mutate({ data: { phoneNumber: `+998${d}` } }, { onSuccess, onError });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex flex-col gap-5">
      <img src={phoneArt} alt="" className="float mx-auto h-48 w-48 object-contain" />
      <div className="text-center">
        <h1 className="text-[28px] font-extrabold leading-tight">{t("onb.phoneTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("onb.phoneText")}</p>
      </div>
      {!manual ? (
        <Btn size="lg" loading={submit.isPending} onClick={share} data-testid="button-share-phone"><Phone className="size-5" />{t("onb.phoneButton")}</Btn>
      ) : (
        <Glass className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{t("onb.phoneManualHint")}</p>
          <label className="text-sm font-bold">{t("onb.phoneManualLabel")}</label>
          <div className="flex h-14 items-center gap-2 rounded-2xl border border-input bg-card px-4 focus-within:ring-2 focus-within:ring-ring">
            <span className="font-bold text-muted-foreground">+998</span>
            <input data-testid="input-phone" inputMode="tel" autoFocus value={digits} maxLength={12} placeholder="90 123 45 67"
              onChange={(e) => setDigits(e.target.value.replace(/[^\d ]/g, ""))} className="h-full flex-1 bg-transparent text-lg font-semibold outline-none" />
          </div>
          {invalid && <p className="text-xs font-semibold text-coral">{t("onb.phoneInvalid")}</p>}
          <Btn loading={submit.isPending} onClick={sendManual} data-testid="button-submit-phone">{t("onb.phoneManualSubmit")}</Btn>
        </Glass>
      )}
      {declined && <p className="text-center text-sm font-semibold text-coral" data-testid="text-declined">{t("onb.phoneDeclined")}</p>}
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-teal" />{t("onb.phonePrivacy")}</p>
    </motion.div>
  );
}

function RegionStep() {
  const { t } = useI18n();
  const config = useConfig();
  const setMe = useSetMe();
  const submit = useSubmitRegion();
  const [region, setRegion] = useState<string | null>(null);
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <img src={mapArt} alt="" className="float h-24 w-24 shrink-0 object-contain" />
        <div>
          <h1 className="text-[24px] font-extrabold leading-tight">{t("onb.regionTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("onb.regionText")}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {config.regions.map((r) => {
          const sel = region === r;
          return (
            <button key={r} data-testid={`button-region-${r}`} onClick={() => { haptic.select(); setRegion(r); }}
              className={cn("tactile flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-[13px] font-bold",
                sel ? "border-teal bg-secondary text-secondary-foreground" : "border-border bg-card/80")}>
              {sel ? <Check className="size-4 shrink-0 text-teal" /> : <MapPin className="size-4 shrink-0 text-muted-foreground" />}{r}
            </button>
          );
        })}
      </div>
      <Btn size="lg" disabled={!region} loading={submit.isPending} data-testid="button-submit-region"
        onClick={() => region && submit.mutate({ data: { region: region as RegionInputRegion } }, {
          onSuccess: (me) => { haptic.success(); toast(t("onb.done"), "ok"); setMe(me); },
          onError: () => toast(t("common.error"), "warn"),
        })}>{t("onb.regionSubmit")}</Btn>
    </motion.div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock, HeartCrack, X, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGameQueryKey, getGetGameQuestionQueryKey, getGetMeQueryKey, getGetProStatusQueryKey,
  useAbandonGame, useAnswerGameQuestion, useGetGame, useGetGameQuestion, type AnswerResult,
} from "@workspace/api-client-react";
import { Btn, ErrorState, Hearts, Modal, Page, Skel } from "@/components/kit";
import { useI18n } from "@/i18n";
import { apiCode, apiStatus } from "@/lib/api";
import { haptic, setClosingConfirmation } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { t } = useI18n();

  const gameQ = useGetGame(id, { query: { queryKey: getGetGameQueryKey(id), enabled: id > 0 } });
  const game = gameQ.data;
  const active = game?.status === "active";
  const qQ = useGetGameQuestion(id, { query: { queryKey: getGetGameQuestionQueryKey(id), enabled: active, staleTime: Infinity, gcTime: 0, retry: false } });
  const q = qQ.data;

  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [locked, setLocked] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const offsetRef = useRef(0);
  const lockedRef = useRef(false);
  const timedOutRef = useRef<number | null>(null);
  lockedRef.current = locked;

  useEffect(() => { setClosingConfirmation(true); return () => setClosingConfirmation(false); }, []);
  useEffect(() => {
    if (game && game.status !== "active" && !feedback) navigate(`/result/${id}`, { replace: true });
  }, [game, feedback, id, navigate]);
  useEffect(() => {
    if (apiCode(qQ.error) === "GAME_FINISHED" || apiStatus(qQ.error) === 409) qc.invalidateQueries({ queryKey: getGetGameQueryKey(id) });
  }, [qQ.error, qc, id]);

  // New question: compute server clock offset, reset UI.
  useEffect(() => {
    if (!q) return;
    offsetRef.current = Date.parse(q.serverTime) - qQ.dataUpdatedAt;
    setPicked(null); setFeedback(null); setLocked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.questionId]);

  const answer = useAnswerGameQuestion();
  const mutateRef = useRef(answer.mutate);
  mutateRef.current = answer.mutate;

  const submit = useCallback((optionIndex?: number) => {
    if (!q || lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    if (optionIndex !== undefined) { setPicked(optionIndex); haptic.tap(); }
    mutateRef.current({ gameId: id, data: optionIndex === undefined ? { questionId: q.questionId } : { questionId: q.questionId, optionIndex } }, {
      onSuccess: (res) => {
        setFeedback(res);
        if (res.result === "correct") haptic.success(); else haptic.error();
        if (res.heartLost) haptic.impact("heavy");
        window.setTimeout(() => {
          qc.setQueryData(getGetGameQueryKey(id), res.game);
          if (res.game.status !== "active") {
            qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
            qc.invalidateQueries({ queryKey: getGetProStatusQueryKey() });
            navigate(`/result/${id}`, { replace: true });
          } else {
            qc.invalidateQueries({ queryKey: getGetGameQuestionQueryKey(id) });
          }
        }, 1000);
      },
      onError: (e) => {
        const code = apiCode(e);
        lockedRef.current = false;
        setLocked(false); setPicked(null);
        if (code === "GAME_FINISHED" || code === "ALREADY_ANSWERED" || apiStatus(e) === 409) {
          qc.invalidateQueries({ queryKey: getGetGameQueryKey(id) });
          qc.invalidateQueries({ queryKey: getGetGameQuestionQueryKey(id) });
        } else if (apiStatus(e) !== 429) toast(t("common.error"), "warn");
      },
    });
  }, [q, id, qc, navigate, t]);

  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (!q) return;
    const expires = Date.parse(q.expiresAt);
    const tick = () => {
      if (lockedRef.current) return;
      const r = Math.max(0, (expires - (Date.now() + offsetRef.current)) / 1000);
      setRemaining(r);
      if (r <= 0 && timedOutRef.current !== q.questionId) {
        timedOutRef.current = q.questionId;
        submitRef.current(undefined);
      }
    };
    tick();
    const h = window.setInterval(tick, 100);
    return () => window.clearInterval(h);
  }, [q]);

  const abandon = useAbandonGame();
  const leave = () => abandon.mutate({ gameId: id }, {
    onSettled: () => {
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      qc.invalidateQueries({ queryKey: getGetProStatusQueryKey() });
      navigate(game?.mode === "pro" ? "/pro" : "/basic", { replace: true });
    },
  });
  const openExit = useCallback(() => { haptic.warning(); setConfirmExit(true); }, []);

  const isPro = game?.mode === "pro";
  const hearts = feedback?.hearts ?? q?.hearts ?? game?.hearts ?? 0;
  const allowed = q?.allowedSeconds ?? 12;
  const frac = Math.min(1, remaining / allowed);
  const urgent = remaining <= 3 && !locked;

  return (
    <Page onBack={openExit}>
      <div className="mb-4 flex items-center gap-3">
        <button data-testid="button-exit" aria-label={t("quiz.exit")} onClick={openExit} className="tactile btn-soft grid size-11 place-items-center rounded-2xl"><X className="size-5" /></button>
        <div className="flex-1">
          <p className="text-xs font-bold text-muted-foreground" data-testid="text-progress">{q ? t("quiz.question", { current: q.position, total: q.total }) : " "}</p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-aqua to-mint" animate={{ scaleX: q ? (q.position - 1) / q.total : 0 }} />
          </div>
        </div>
        {isPro && game && <Hearts count={hearts} max={game.maxHearts} />}
      </div>

      {(gameQ.isError || qQ.isError) && !q ? <ErrorState onRetry={() => { gameQ.refetch(); qQ.refetch(); }} /> :
        !q ? (
          <div className="flex flex-col gap-3"><Skel className="mx-auto size-24 rounded-full" /><Skel className="h-36" />{LETTERS.map((l) => <Skel key={l} className="h-16" />)}</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={q.questionId} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="flex flex-col gap-4">
              <div className="flex justify-center">
                <TimerRing frac={frac} seconds={Math.ceil(remaining)} urgent={urgent} label={t("quiz.seconds", { seconds: Math.ceil(remaining) })} />
              </div>
              <div className="glass relative px-5 py-6">
                <p className="text-center font-display text-[21px] font-bold leading-snug" data-testid="text-question">{q.question}</p>
              </div>
              <div className="grid gap-2.5">
                {q.options.map((opt, i) => {
                  const chosen = picked === i;
                  const state = chosen && feedback ? (feedback.result === "correct" ? "ok" : "bad") : chosen ? "pending" : "idle";
                  return (
                    <motion.button key={i} data-testid={`button-option-${i}`} disabled={locked} onClick={() => submit(i)}
                      animate={state === "bad" ? { x: [0, -8, 8, -5, 5, 0] } : state === "ok" ? { scale: [1, 1.03, 1] } : {}} transition={{ duration: 0.4 }}
                      className={cn("tactile flex min-h-[60px] w-full items-center gap-3 rounded-[20px] border-2 px-3.5 py-3 text-left text-[15px] font-semibold transition-colors",
                        state === "idle" && "border-white bg-card/90 shadow-[0_8px_20px_-14px_hsl(192_60%_35%/.5)]",
                        state === "pending" && "border-teal bg-secondary",
                        state === "ok" && "border-[hsl(158_55%_48%)] bg-[hsl(158_60%_90%)]",
                        state === "bad" && "border-coral bg-[hsl(4_90%_93%)]",
                        locked && state === "idle" && "opacity-60")}>
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl font-display text-sm font-extrabold",
                        state === "ok" ? "bg-[hsl(158_55%_48%)] text-white" : state === "bad" ? "bg-coral text-white" : state === "pending" ? "bg-teal text-white" : "bg-secondary text-secondary-foreground")}>
                        {state === "ok" ? <CheckCircle2 className="size-5" /> : state === "bad" ? <XCircle className="size-5" /> : LETTERS[i]}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="nav-safe fixed inset-x-0 z-30 mx-auto w-[calc(100%-32px)] max-w-[420px]" data-testid="status-feedback">
            <div className={cn("solid-card flex items-center gap-3 px-4 py-3.5 font-bold",
              feedback.result === "correct" ? "bg-[hsl(158_60%_92%)]" : "bg-[hsl(14_100%_94%)]")}>
              {feedback.result === "correct" ? <CheckCircle2 className="size-6 text-[hsl(158_55%_40%)]" /> : feedback.result === "timeout" ? <Clock className="size-6 text-coral" /> : <XCircle className="size-6 text-coral" />}
              <span className="flex-1">{t(feedback.result === "correct" ? "quiz.correct" : feedback.result === "timeout" ? "quiz.timeout" : "quiz.wrong")}</span>
              {feedback.heartLost && <span className="flex items-center gap-1 text-xs text-coral"><HeartCrack className="size-4" />{t("quiz.heartLost")}</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={confirmExit} onClose={() => setConfirmExit(false)}>
        <h3 className="text-xl font-extrabold">{t("quiz.exit")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t(isPro ? "quiz.exitConfirmPro" : "quiz.exitConfirm")}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Btn variant="soft" data-testid="button-stay" onClick={() => setConfirmExit(false)}>{t("quiz.stay")}</Btn>
          <Btn variant="peach" data-testid="button-leave" loading={abandon.isPending} onClick={leave}>{t("quiz.leave")}</Btn>
        </div>
      </Modal>
    </Page>
  );
}

function TimerRing({ frac, seconds, urgent, label }: { frac: number; seconds: number; urgent: boolean; label: string }) {
  const R = 40, C = 2 * Math.PI * R;
  return (
    <motion.div className="relative size-24" animate={urgent ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={{ repeat: urgent ? Infinity : 0, duration: 0.8 }} data-testid="timer" aria-label={label}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="hsl(140 36% 99% / .88)" stroke="hsl(145 24% 88%)" strokeWidth="9" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={urgent ? "hsl(4 80% 65%)" : "url(#tg)"} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)} style={{ transition: "stroke-dashoffset .1s linear" }} />
        <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="hsl(145 42% 50%)" /><stop offset="1" stopColor="hsl(148 38% 39%)" /></linearGradient></defs>
      </svg>
      <span className={cn("absolute inset-0 grid place-items-center font-display text-3xl font-extrabold", urgent && "text-coral")}>{seconds}</span>
    </motion.div>
  );
}

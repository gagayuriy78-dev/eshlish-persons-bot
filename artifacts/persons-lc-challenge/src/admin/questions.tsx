import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAdminStatsQueryKey, getListAdminQuestionsQueryKey, useCreateAdminQuestion, useDeleteAdminQuestion, useListAdminQuestions, useUpdateAdminQuestion,
  type AdminQuestion, type AdminQuestionInput, type AdminQuestionInputCorrectOption, type AdminQuestionInputDifficulty, type AdminQuestionInputLevel, type ListAdminQuestionsParams,
} from "@workspace/api-client-react";
import { Btn, ErrorState, Modal } from "@/components/kit";
import { useI18n, type TranslationKey } from "@/i18n";
import { useConfig } from "@/lib/api";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Input, LoadingBlock, Pager, Panel, Pill, Select, Table, Td } from "./admin-kit";

const LETTERS = ["A", "B", "C", "D"] as const;
const empty: AdminQuestionInput = { level: "A1", difficulty: "easy", category: "grammar", text: "", options: ["", "", "", ""], correctOption: "A", isActive: true };

export default function Questions() {
  const { t } = useI18n();
  const config = useConfig();
  const qc = useQueryClient();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminQuestion | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminQuestion | null>(null);
  useEffect(() => { const h = window.setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 350); return () => window.clearTimeout(h); }, [qInput]);

  const params: ListAdminQuestionsParams = { page, pageSize: 20 };
  if (q) params.q = q;
  if (level) params.level = level;
  const list = useListAdminQuestions(params);
  const del = useDeleteAdminQuestion();
  const refresh = () => { qc.invalidateQueries({ queryKey: getListAdminQuestionsQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }); };

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input data-testid="input-question-search" placeholder={t("common.search")} value={qInput} onChange={(e) => setQInput(e.target.value)} className="w-full pl-9" />
        </div>
        <Select data-testid="select-question-level" value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}>
          <option value="">{t("admin.q.level")}: {t("common.all")}</option>
          {config.levels.map((l) => <option key={l} value={l}>{l}</option>)}
        </Select>
        <Btn size="sm" className="ml-auto h-10" data-testid="button-new-question" onClick={() => setEditing("new")}><Plus className="size-4" />{t("admin.q.new")}</Btn>
      </div>
      {list.isLoading ? <LoadingBlock /> : list.isError || !list.data ? <ErrorState onRetry={() => list.refetch()} /> : (
        <>
          <Table empty={list.data.items.length === 0} head={["#", t("admin.q.text"), t("admin.q.level"), t("admin.q.difficulty"), t("admin.q.category"), t("admin.q.correct"), t("admin.q.served"), t("admin.q.failed"), ""]}>
            {list.data.items.map((x) => (
              <tr key={x.id} data-testid={`row-question-${x.id}`} className={cn(!x.isActive && "opacity-55")}>
                <Td className="text-muted-foreground">{x.id}</Td>
                <Td className="max-w-[320px] truncate whitespace-normal"><span className="line-clamp-2">{x.text}</span></Td>
                <Td><Pill>{x.level}</Pill></Td>
                <Td><Pill tone={x.difficulty === "hard" ? "coral" : x.difficulty === "medium" ? "peach" : "mint"}>{t(`admin.q.${x.difficulty}` as TranslationKey)}</Pill></Td>
                <Td>{x.category}</Td>
                <Td className="font-bold">{x.correctOption}</Td>
                <Td>{x.timesServed}</Td>
                <Td>{x.timesFailed}{x.timesServed > 0 && <span className="text-muted-foreground"> ({Math.round((x.timesFailed / x.timesServed) * 100)}%)</span>}</Td>
                <Td>
                  <div className="flex gap-1">
                    <button data-testid={`button-edit-question-${x.id}`} aria-label={t("common.edit")} onClick={() => setEditing(x)} className="tactile btn-soft grid size-8 place-items-center rounded-lg"><Pencil className="size-4" /></button>
                    <button data-testid={`button-delete-question-${x.id}`} aria-label={t("common.delete")} onClick={() => setDeleting(x)} className="tactile btn-soft grid size-8 place-items-center rounded-lg text-coral"><Trash2 className="size-4" /></button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
          <Pager page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} />
        </>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)}>
        {editing !== null && <QuestionForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} onDone={() => { setEditing(null); refresh(); }} />}
      </Modal>
      <Modal open={deleting !== null} onClose={() => setDeleting(null)}>
        <h3 className="text-lg font-extrabold">{t("common.delete")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("admin.q.deleteConfirm")}</p>
        <p className="mt-2 line-clamp-3 rounded-xl bg-muted p-3 text-sm">{deleting?.text}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Btn variant="soft" onClick={() => setDeleting(null)}>{t("common.cancel")}</Btn>
          <Btn variant="peach" data-testid="button-confirm-delete" loading={del.isPending} onClick={() => deleting && del.mutate({ questionId: deleting.id }, {
            onSuccess: () => { toast(t("admin.q.deleted"), "ok"); setDeleting(null); refresh(); },
            onError: () => toast(t("common.error"), "warn"),
          })}>{t("common.delete")}</Btn>
        </div>
      </Modal>
    </Panel>
  );
}

function QuestionForm({ initial, onDone }: { initial: AdminQuestion | null; onDone: () => void }) {
  const { t } = useI18n();
  const config = useConfig();
  const [f, setF] = useState<AdminQuestionInput>(() => initial ? {
    level: initial.level as AdminQuestionInputLevel, difficulty: initial.difficulty as AdminQuestionInputDifficulty, category: initial.category,
    text: initial.text, options: [...initial.options], correctOption: initial.correctOption as AdminQuestionInputCorrectOption, isActive: initial.isActive,
  } : { ...empty, options: ["", "", "", ""] });
  const create = useCreateAdminQuestion();
  const update = useUpdateAdminQuestion();
  const valid = f.text.trim().length >= 3 && f.category.trim().length >= 1 && f.options.every((o) => o.trim().length > 0);

  const save = () => {
    if (!valid) { toast(t("admin.q.invalid"), "warn"); return; }
    const data = { ...f, text: f.text.trim(), category: f.category.trim(), options: f.options.map((o) => o.trim()) };
    const opts = { onSuccess: () => { toast(t("admin.q.saved"), "ok"); onDone(); }, onError: () => toast(t("common.error"), "warn") };
    if (initial) update.mutate({ questionId: initial.id, data }, opts); else create.mutate({ data }, opts);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-extrabold">{initial ? t("admin.q.edit") : t("admin.q.new")}</h3>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">{t("admin.q.level")}
          <Select data-testid="select-form-level" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value as AdminQuestionInputLevel })}>{config.levels.map((l) => <option key={l}>{l}</option>)}</Select></label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">{t("admin.q.difficulty")}
          <Select data-testid="select-form-difficulty" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value as AdminQuestionInputDifficulty })}>
            {(["easy", "medium", "hard"] as const).map((d) => <option key={d} value={d}>{t(`admin.q.${d}`)}</option>)}
          </Select></label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">{t("admin.q.category")}
          <Input data-testid="input-form-category" maxLength={40} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">{t("admin.q.text")}
        <textarea data-testid="input-form-text" rows={3} maxLength={500} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} className="rounded-xl border border-input bg-card p-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring" /></label>
      <p className="text-xs font-bold text-muted-foreground">{t("admin.q.correctHint")}</p>
      {LETTERS.map((L, i) => (
        <div key={L} className="flex items-center gap-2">
          <button type="button" data-testid={`button-correct-${L}`} onClick={() => setF({ ...f, correctOption: L })}
            className={cn("tactile grid size-10 shrink-0 place-items-center rounded-xl font-display font-extrabold", f.correctOption === L ? "btn-primary" : "btn-soft")}>{L}</button>
          <Input data-testid={`input-option-${L}`} maxLength={200} placeholder={t("admin.q.option", { letter: L })} value={f.options[i]} className="flex-1"
            onChange={(e) => { const o = [...f.options]; o[i] = e.target.value; setF({ ...f, options: o }); }} />
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm font-bold">
        <input data-testid="checkbox-active" type="checkbox" checked={f.isActive ?? true} onChange={(e) => setF({ ...f, isActive: e.target.checked })} className="size-4 accent-[hsl(184_72%_38%)]" />
        {t("admin.q.active")}
      </label>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <Btn variant="soft" onClick={onDone}>{t("common.cancel")}</Btn>
        <Btn data-testid="button-save-question" loading={create.isPending || update.isPending} onClick={save}>{t("common.save")}</Btn>
      </div>
    </div>
  );
}

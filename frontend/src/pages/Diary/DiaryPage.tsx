import { FormEvent, useEffect, useMemo, useState } from "react";
import { NotebookPen, Plus, Stethoscope, Trash2 } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Modal } from "../../components/Modal";
import { useDiaryStore } from "../../store/diaryStore";
import type { DiaryEntry, SymptomEntry } from "../../types/diary";
import { formatDate, formatDateTime } from "../../utils/date";

const symptomOptions = [
  "Đau đầu",
  "Mệt mỏi",
  "Khó thở",
  "Đau ngực",
  "Chóng mặt",
  "Buồn nôn",
  "Sốt",
  "Ho",
];

type EntryMode = "diary" | "symptoms";

function groupEntriesByDay(entries: DiaryEntry[]) {
  return entries.reduce<Array<{ dayKey: string; label: string; entries: DiaryEntry[] }>>(
    (groups, entry) => {
      const dayKey = entry.createdAt.slice(0, 10);
      const existing = groups.find((group) => group.dayKey === dayKey);
      if (existing) {
        existing.entries.push(entry);
        return groups;
      }
      groups.push({
        dayKey,
        label: formatDate(entry.createdAt),
        entries: [entry],
      });
      return groups;
    },
    [],
  );
}

export function DiaryPage() {
  const diaries = useDiaryStore((state) => state.items);
  const loadMine = useDiaryStore((state) => state.loadMine);
  const createDiary = useDiaryStore((state) => state.createDiary);
  const deleteDiary = useDiaryStore((state) => state.deleteDiary);
  const error = useDiaryStore((state) => state.error);
  const [mode, setMode] = useState<EntryMode>("diary");
  const [content, setContent] = useState("");
  const [selectedOption, setSelectedOption] = useState(symptomOptions[0]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [severity, setSeverity] = useState(3);
  const [entryDate, setEntryDate] = useState(() => {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0, 16);
  });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const groupedEntries = useMemo(() => groupEntriesByDay(diaries), [diaries]);

  useEffect(() => {
    void loadMine().catch(() => undefined);
  }, [loadMine]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedContent = content.trim();
    
    let symptoms: SymptomEntry[] = [];
    if (mode === "symptoms") {
      const name = selectedOption === "other" ? customSymptom.trim() : selectedOption;
      if (name) {
        symptoms = [{ name: name.slice(0, 20), severity }];
      }
    }

    if (!trimmedContent && symptoms.length === 0) return;

    void createDiary({
      content: trimmedContent,
      symptoms,
      createdAt: entryDate ? new Date(entryDate).toISOString() : undefined,
    })
      .then(() => {
        setContent("");
        const tzoffset = new Date().getTimezoneOffset() * 60000;
        setEntryDate(new Date(Date.now() - tzoffset).toISOString().slice(0, 16));
        if (mode === "symptoms") {
          setCustomSymptom("");
          setSeverity(3);
        }
      })
      .catch(() => undefined);
  }

  return (
    <AppShell role="user" title="Nhật ký triệu chứng">
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Card padding="lg">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-card bg-muted p-1">
            {[
              { value: "diary", label: "Viết nhật ký", Icon: NotebookPen },
              { value: "symptoms", label: "Chọn triệu chứng", Icon: Stethoscope },
            ].map(({ value, label, Icon }) => (
              <button
                className={`inline-flex items-center justify-center gap-2 rounded-input px-3 py-2 text-sm font-medium transition ${
                  mode === value ? "bg-card text-primary shadow-sm" : "text-mutedForeground hover:text-secondary"
                }`}
                key={value}
                onClick={() => setMode(value as EntryMode)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {error ? <p className="mb-3 text-sm text-emergency">{error}</p> : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-secondary font-medium">Ngày ghi nhận</span>
              <input
                className="h-10 w-full rounded-input border border-border/50 bg-white px-3 text-sm text-secondary outline-none transition-all duration-200 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                onChange={(event) => setEntryDate(event.target.value)}
                required
                type="datetime-local"
                value={entryDate}
              />
            </label>

            {mode === "diary" ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-secondary font-medium">Nội dung nhật ký</span>
                <textarea
                  className="min-h-40 w-full resize-none rounded-input border border-border/50 bg-white px-3 py-2.5 text-sm text-secondary outline-none transition-all duration-200 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Hôm nay bạn cảm thấy thế nào?"
                  value={content}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-secondary font-medium font-medium">Chọn triệu chứng</span>
                    <div className="relative">
                      <select
                        className="h-10 w-full appearance-none rounded-input border border-border/50 bg-white pl-3 pr-10 text-sm text-secondary outline-none transition-all duration-200 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                        onChange={(event) => {
                          const val = event.target.value;
                          setSelectedOption(val);
                          if (val !== "other") {
                            setCustomSymptom("");
                          }
                        }}
                        value={selectedOption}
                      >
                        {symptomOptions.map((symptom) => (
                          <option key={symptom} value={symptom}>
                            {symptom}
                          </option>
                        ))}
                        <option value="other">Tùy chọn khác...</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center pr-1 text-mutedForeground">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7 10l5 5 5-5H7z" fillRule="evenodd" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </label>

                  {selectedOption === "other" && (
                    <label className="block animate-slideDown">
                      <span className="mb-1.5 block text-sm font-medium text-secondary font-medium">Tên triệu chứng khác</span>
                      <input
                        className="h-10 w-full rounded-input border border-border/50 bg-white px-3 text-sm text-secondary outline-none transition-all duration-200 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                        maxLength={20}
                        onChange={(event) => setCustomSymptom(event.target.value.replace(/[<>]/g, "").slice(0, 20))}
                        placeholder="Tùy chọn"
                        value={customSymptom}
                      />
                    </label>
                  )}

                  <div className="rounded-card border border-border p-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-secondary">Mức độ nghiêm trọng</span>
                      <Badge tone={severity > 6 ? "emergency" : "pending"}>
                        {severity}/10
                      </Badge>
                    </div>
                    <input
                      className="mt-3 w-full accent-primary"
                      max={10}
                      min={1}
                      onChange={(event) => setSeverity(Number(event.target.value))}
                      type="range"
                      value={severity}
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-mutedForeground font-medium">
                      <span>Nhẹ</span>
                      <span>Trung bình</span>
                      <span>Nghiêm trọng</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button
              disabled={
                mode === "diary"
                  ? !content.trim()
                  : selectedOption === "other"
                  ? !customSymptom.trim()
                  : !selectedOption
              }
              leftIcon={<Plus className="h-4 w-4" />}
              type="submit"
            >
              {mode === "diary" ? "Thêm nhật ký" : "Lưu triệu chứng"}
            </Button>
          </form>
        </Card>

        <section className="space-y-3">
          {diaries.length === 0 ? (
            <EmptyState
              description="Khi bạn thêm nhật ký hoặc triệu chứng, bản ghi sẽ xuất hiện ở đây."
              title="Chưa có nhật ký"
            />
          ) : (
            groupedEntries.map((group) => (
              <Card key={group.dayKey}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-secondary">{group.label}</h2>
                  <Badge tone="info">{group.entries.length} mục</Badge>
                </div>
                <div className="space-y-3">
                  {group.entries.map((entry) => {
                    const isSymptomOnly = !entry.content && entry.symptoms.length > 0;
                    
                    if (isSymptomOnly) {
                      const primarySymptom = entry.symptoms[0];
                      const isHighSeverity = primarySymptom.severity > 6;
                      const toneClass = isHighSeverity 
                        ? "bg-red-50/80 border-red-200/80 text-red-950 shadow-soft-sm" 
                        : "bg-amber-50/80 border-amber-200/80 text-amber-950 shadow-soft-sm";
                        
                      return (
                        <div className={`rounded-2xl border p-4 transition-all duration-300 ${toneClass}`} key={entry.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Ghi nhận triệu chứng</p>
                              <h3 className="mt-1 text-base font-bold tracking-tight">
                                {primarySymptom.name}
                              </h3>
                              <p className="mt-1 text-sm font-semibold opacity-90">
                                Mức độ: <span className="font-bold">{primarySymptom.severity}/10</span>
                              </p>
                              <p className="mt-2 text-xs opacity-60 font-medium">{formatDateTime(entry.createdAt)}</p>
                            </div>
                            <Button
                              aria-label="Xóa triệu chứng"
                              onClick={() => setDeleteTarget(entry.id)}
                              size="icon"
                              variant="ghost"
                              className="text-current hover:bg-black/5 active:scale-[0.95] transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="rounded-2xl border border-border bg-white p-4 shadow-soft-sm" key={entry.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-mutedForeground font-medium">{formatDateTime(entry.createdAt)}</p>
                            {entry.content ? <p className="mt-2 text-sm text-secondary leading-relaxed font-medium">{entry.content}</p> : null}
                          </div>
                          <Button
                            aria-label="Xóa nhật ký"
                            onClick={() => setDeleteTarget(entry.id)}
                            size="icon"
                            variant="ghost"
                            className="hover:bg-slate-50 text-mutedForeground hover:text-emergency"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {entry.symptoms.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                            {entry.symptoms.map((symptom) => (
                              <Badge
                                key={`${entry.id}-${symptom.name}`}
                                tone={symptom.severity > 6 ? "emergency" : "pending"}
                              >
                                {symptom.name}: {symptom.severity}/10
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))
          )}
        </section>
      </div>

      <Modal
        confirmLabel="Xóa nhật ký"
        confirmVariant="danger"
        description="Nhật ký đã xóa sẽ không còn hiển thị."
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void deleteDiary(deleteTarget).catch(() => undefined);
          setDeleteTarget(null);
        }}
        open={Boolean(deleteTarget)}
        title="Xóa nhật ký?"
      />
    </AppShell>
  );
}

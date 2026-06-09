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
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomEntry[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const groupedEntries = useMemo(() => groupEntriesByDay(diaries), [diaries]);

  useEffect(() => {
    void loadMine().catch(() => undefined);
  }, [loadMine]);

  function addSymptom(name: string) {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return;
    setSelectedSymptoms((current) => {
      if (current.some((item) => item.name.toLowerCase() === trimmed.toLowerCase())) {
        return current;
      }
      return [...current, { name: trimmed, severity: 3 }];
    });
  }

  function updateSymptomSeverity(name: string, severity: number) {
    setSelectedSymptoms((current) =>
      current.map((item) => (item.name === name ? { ...item, severity } : item)),
    );
  }

  function removeSymptom(name: string) {
    setSelectedSymptoms((current) => current.filter((item) => item.name !== name));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedContent = content.trim();
    const symptoms = mode === "symptoms" ? selectedSymptoms : [];
    if (!trimmedContent && symptoms.length === 0) return;

    void createDiary({
      content: trimmedContent,
      symptoms,
    })
      .then(() => {
        setContent("");
        if (mode === "symptoms") {
          setSelectedSymptoms([]);
          setCustomSymptom("");
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
            {mode === "diary" ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-secondary">Nội dung nhật ký</span>
                <textarea
                  className="min-h-40 w-full resize-none rounded-input border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Hôm nay bạn cảm thấy thế nào?"
                  value={content}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-secondary">Triệu chứng có sẵn</span>
                    <select
                      className="h-10 w-full rounded-input border border-border bg-inputBackground px-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      onChange={(event) => setSelectedOption(event.target.value)}
                      value={selectedOption}
                    >
                      {symptomOptions.map((symptom) => (
                        <option key={symptom} value={symptom}>
                          {symptom}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-end">
                    <Button onClick={() => addSymptom(selectedOption)} type="button" variant="outline">
                      Thêm
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-secondary">Triệu chứng khác</span>
                    <input
                      className="h-10 w-full rounded-input border border-border bg-inputBackground px-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      maxLength={20}
                      onChange={(event) => setCustomSymptom(event.target.value.replace(/[<>]/g, "").slice(0, 20))}
                      placeholder="Tối đa 20 ký tự"
                      value={customSymptom}
                    />
                  </label>
                  <div className="flex items-end">
                    <Button onClick={() => addSymptom(customSymptom)} type="button" variant="outline">
                      Thêm
                    </Button>
                  </div>
                </div>

                {selectedSymptoms.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSymptoms.map((symptom) => (
                      <div className="rounded-card border border-border p-3" key={symptom.name}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-secondary">{symptom.name}</span>
                          <button
                            className="rounded-input p-1.5 text-mutedForeground hover:bg-dangerBg hover:text-emergency"
                            onClick={() => removeSymptom(symptom.name)}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <label className="mt-2 block">
                          <span className="text-xs text-mutedForeground">Mức độ: {symptom.severity}/10</span>
                          <input
                            className="mt-1 w-full accent-primary"
                            max={10}
                            min={1}
                            onChange={(event) => updateSymptomSeverity(symptom.name, Number(event.target.value))}
                            type="range"
                            value={symptom.severity}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-card border border-dashed border-border p-4 text-sm text-mutedForeground">
                    Chọn một triệu chứng hoặc nhập triệu chứng riêng để bắt đầu.
                  </p>
                )}
              </div>
            )}

            <Button
              disabled={mode === "diary" ? !content.trim() : selectedSymptoms.length === 0}
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
                  {group.entries.map((entry) => (
                    <div className="rounded-card border border-border p-3" key={entry.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-mutedForeground">{formatDateTime(entry.createdAt)}</p>
                          {entry.content ? <p className="mt-2 text-sm text-secondary">{entry.content}</p> : null}
                        </div>
                        <Button
                          aria-label="Xóa nhật ký"
                          onClick={() => setDeleteTarget(entry.id)}
                          size="icon"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4 text-emergency" />
                        </Button>
                      </div>
                      {entry.symptoms.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
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
                  ))}
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

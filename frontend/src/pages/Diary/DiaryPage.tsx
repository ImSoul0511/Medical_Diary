import { FormEvent, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Modal } from "../../components/Modal";
import { useMedicalStore } from "../../store/medicalStore";
import { formatDateTime } from "../../utils/date";

const symptomOptions = ["Đau đầu", "Mệt mỏi", "Khó thở", "Đau ngực", "Chóng mặt"];

export function DiaryPage() {
  const diaries = useMedicalStore((state) => state.diaries);
  const addDiaryLocal = useMedicalStore((state) => state.addDiaryLocal);
  const deleteDiaryLocal = useMedicalStore((state) => state.deleteDiaryLocal);
  const [content, setContent] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(["Đau đầu"]);
  const [severity, setSeverity] = useState(3);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    addDiaryLocal(
      content,
      selectedSymptoms.map((name) => ({ name, severity })),
    );
    setContent("");
  }

  return (
    <AppShell
      description="Ghi lại triệu chứng và cảm nhận hằng ngày bằng local state."
      role="user"
      title="Nhật ký triệu chứng"
    >
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-secondary">Thêm nhật ký</h2>
          <p className="mt-1 text-sm text-mutedForeground">Nội dung chỉ lưu trong Zustand store.</p>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-secondary">Ghi chú</span>
              <textarea
                className="min-h-32 w-full resize-none rounded-input border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setContent(event.target.value)}
                placeholder="Hôm nay bạn cảm thấy thế nào?"
                value={content}
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-medium text-secondary">Triệu chứng</p>
              <div className="flex flex-wrap gap-2">
                {symptomOptions.map((symptom) => {
                  const active = selectedSymptoms.includes(symptom);
                  return (
                    <button
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        active
                          ? "border-primary bg-infoBg text-primary"
                          : "border-border bg-card text-mutedForeground"
                      }`}
                      key={symptom}
                      onClick={() =>
                        setSelectedSymptoms((current) =>
                          current.includes(symptom)
                            ? current.filter((item) => item !== symptom)
                            : [...current, symptom],
                        )
                      }
                      type="button"
                    >
                      {symptom}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-secondary">
                Mức độ: {severity}/10
              </span>
              <input
                className="w-full accent-primary"
                max={10}
                min={1}
                onChange={(event) => setSeverity(Number(event.target.value))}
                type="range"
                value={severity}
              />
            </label>

            <Button leftIcon={<Plus className="h-4 w-4" />} type="submit">
              Thêm nhật ký
            </Button>
          </form>
        </Card>

        <section className="space-y-3">
          {diaries.length === 0 ? (
            <EmptyState
              description="Khi bạn thêm nhật ký, bản ghi sẽ xuất hiện ở đây."
              title="Chưa có nhật ký"
            />
          ) : (
            diaries.map((entry) => (
              <Card key={entry.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-mutedForeground">{formatDateTime(entry.createdAt)}</p>
                    <p className="mt-2 text-sm text-secondary">{entry.content}</p>
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
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.symptoms.map((symptom) => (
                    <Badge key={`${entry.id}-${symptom.name}`} tone={symptom.severity > 6 ? "emergency" : "pending"}>
                      {symptom.name}: {symptom.severity}/10
                    </Badge>
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
        description="Thao tác này chỉ xóa bản ghi trong local state."
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteDiaryLocal(deleteTarget);
          setDeleteTarget(null);
        }}
        open={Boolean(deleteTarget)}
        title="Xóa nhật ký?"
      />
    </AppShell>
  );
}

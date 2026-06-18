import { FormEvent, useState } from "react";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormInput } from "../../components/FormInput";
import { usePrescriptionStore } from "../../store/prescriptionStore";
import { useUiStore } from "../../store/uiStore";

type MedicineRow = {
  id: string;
  medicationName: string;
  dosage: string;
  scheduledTimes: string[];
  durationDays: number | "";
};

function parseTimeString(val: string): string | null {
  if (!val) return null;
  const cleaned = val.replace(/[^0-9:]/g, "");
  if (!cleaned) return null;

  let hh = "";
  let mm = "00";
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");
    hh = parts[0];
    mm = parts[1] || "00";
  } else {
    if (cleaned.length === 1 || cleaned.length === 2) {
      hh = cleaned;
    } else if (cleaned.length === 3) {
      hh = cleaned.substring(0, 1);
      mm = cleaned.substring(1);
    } else if (cleaned.length === 4) {
      hh = cleaned.substring(0, 2);
      mm = cleaned.substring(2);
    } else {
      return null;
    }
  }

  const h = parseInt(hh, 10);
  const m = parseInt(mm, 10);
  if (isNaN(h) || h < 0 || h > 23) return null;
  if (isNaN(m) || m < 0 || m > 59) return null;

  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function DoctorPrescription() {
  const { patientId = "" } = useParams();
  const navigate = useNavigate();
  const showToast = useUiStore((state) => state.showToast);
  const createPrescription = usePrescriptionStore((state) => state.createPrescription);
  const addPrescriptionItem = usePrescriptionStore((state) => state.addPrescriptionItem);
  const error = usePrescriptionStore((state) => state.error);
  const isCreating = usePrescriptionStore((state) => state.isCreatingPrescription);
  const [notes, setNotes] = useState("Theo dõi điều trị và tái khám đúng lịch.");
  const [rows, setRows] = useState<MedicineRow[]>([
    {
      id: "medicine-1",
      medicationName: "",
      dosage: "",
      scheduledTimes: ["08:00"],
      durationDays: 3,
    },
  ]);

  function updateRow(id: string, payload: Partial<MedicineRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...payload } : row)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientId) return;

    void createPrescription({ patientId, notes })
      .then(async (prescription) => {
        for (const row of rows) {
          if (!row.medicationName.trim()) continue;
          await addPrescriptionItem(prescription.id, {
            medicationName: row.medicationName,
            dosage: row.dosage,
            durationDays: row.durationDays || 3,
            scheduledTimes: row.scheduledTimes.filter(Boolean),
            startDate: new Date().toISOString().slice(0, 10),
            customLogs: [],
          });
        }
        showToast("Đã gửi đơn thuốc.");
        navigate(patientId ? `/bac-si/benh-nhan/${patientId}` : "/bac-si/quan-ly-benh-nhan");
      })
      .catch(() => undefined);
  }

  return (
    <AppShell role="doctor" title="Tạo đơn thuốc">
      <div className="mb-4">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          to={patientId ? `/bac-si/benh-nhan/${patientId}` : "/bac-si/quan-ly-benh-nhan"}
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại chi tiết bệnh nhân
        </Link>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card padding="lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge tone={patientId ? "info" : "pending"}>{patientId ? "Sẵn sàng" : "Thiếu bệnh nhân"}</Badge>
              <h2 className="mt-3 text-lg font-semibold text-secondary">Ghi chú đơn thuốc</h2>
            </div>
            <Button disabled={isCreating || !patientId} leftIcon={<Save className="h-4 w-4" />} type="submit" variant="success">
              Lưu đơn thuốc
            </Button>
          </div>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-medium text-secondary">Ghi chú</span>
            <textarea
              className="min-h-24 w-full rounded-input border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>
          {error ? <p className="mt-3 text-sm text-emergency">{error}</p> : null}
        </Card>

        <Card padding="lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-secondary">Danh sách thuốc</h2>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() =>
                setRows((current) => [
                  ...current,
                  {
                    id: `medicine-${Date.now()}`,
                    medicationName: "",
                    dosage: "",
                    scheduledTimes: ["08:00"],
                    durationDays: 3,
                  },
                ])
              }
              size="sm"
              variant="outline"
            >
              Thêm thuốc
            </Button>
          </div>
          <div className="space-y-4">
            {rows.map((row) => (
              <div className="grid gap-3 rounded-card border border-border p-4 lg:grid-cols-[1.2fr_0.8fr_1.5fr_0.6fr_auto]" key={row.id}>
                <FormInput label="Tên thuốc" onChange={(event) => updateRow(row.id, { medicationName: event.target.value })} value={row.medicationName} />
                <FormInput label="Liều dùng" placeholder="VD: 1 viên" onChange={(event) => updateRow(row.id, { dosage: event.target.value })} value={row.dosage} />
                
                <div className="flex flex-col gap-1.5">
                  <span className="block text-sm font-medium text-secondary">Giờ uống</span>
                  <div className="flex flex-wrap gap-1.5 items-center min-h-[44px] w-full rounded-input border border-border/50 bg-white px-3 py-1.5 text-sm text-secondary outline-none transition-all duration-200 shadow-soft-sm focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
                    {row.scheduledTimes.map((time, idx) => (
                      <Badge
                        key={idx}
                        tone="info"
                        className="flex items-center gap-1 px-2.5 py-1 text-xs cursor-default rounded-md bg-teal-50 text-accent font-mono border border-accent/25 hover:bg-teal-100 transition-colors"
                      >
                        <span>{time}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newTimes = row.scheduledTimes.filter((_, i) => i !== idx);
                            updateRow(row.id, { scheduledTimes: newTimes });
                          }}
                          className="text-accent/60 hover:text-accent font-bold text-xs ml-0.5"
                        >
                          &times;
                        </button>
                      </Badge>
                    ))}
                    
                    <input
                      type="text"
                      placeholder="Giờ (VD: 1430)"
                      className="w-24 text-xs border border-border/80 rounded px-2 py-1 outline-none focus:border-accent font-mono text-center placeholder:font-sans placeholder:text-[10px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = parseTimeString(e.currentTarget.value);
                          if (val) {
                            if (!row.scheduledTimes.includes(val)) {
                              const newTimes = [...row.scheduledTimes, val].sort();
                              updateRow(row.id, { scheduledTimes: newTimes });
                            }
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseTimeString(e.target.value);
                        if (val) {
                          if (!row.scheduledTimes.includes(val)) {
                            const newTimes = [...row.scheduledTimes, val].sort();
                            updateRow(row.id, { scheduledTimes: newTimes });
                          }
                          e.target.value = "";
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {["08:00", "12:00", "16:00", "20:00"].map((preset) => {
                      const isSelected = row.scheduledTimes.includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            let newTimes;
                            if (isSelected) {
                              newTimes = row.scheduledTimes.filter((t) => t !== preset);
                            } else {
                              newTimes = [...row.scheduledTimes, preset].sort();
                            }
                            updateRow(row.id, { scheduledTimes: newTimes });
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                            isSelected
                              ? "bg-accent text-white border border-accent"
                              : "bg-muted text-mutedForeground border border-border/60 hover:bg-muted/70"
                          }`}
                        >
                          {preset === "08:00" && "Sáng (08:00)"}
                          {preset === "12:00" && "Trưa (12:00)"}
                          {preset === "16:00" && "Chiều (16:00)"}
                          {preset === "20:00" && "Tối (20:00)"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <FormInput
                  label="Số ngày"
                  onChange={(event) => {
                    const val = event.target.value;
                    updateRow(row.id, { durationDays: val === "" ? "" : Number(val) });
                  }}
                  type="number"
                  value={row.durationDays}
                />
                <div className="flex items-end">
                  <Button
                    aria-label="Xóa thuốc"
                    onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-emergency" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </form>
    </AppShell>
  );
}

import { FormEvent, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
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
  scheduledTimes: string;
  durationDays: number;
};

export function DoctorPrescription() {
  const { patientId = "" } = useParams();
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
      scheduledTimes: "08:00",
      durationDays: 7,
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
            durationDays: row.durationDays,
            scheduledTimes: row.scheduledTimes
              .split(",")
              .map((time) => time.trim())
              .filter(Boolean),
            startDate: new Date().toISOString().slice(0, 10),
            customLogs: [],
          });
        }
        showToast("Đã gửi đơn thuốc.");
      })
      .catch(() => undefined);
  }

  return (
    <AppShell role="doctor" title="Tạo đơn thuốc">
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
                    scheduledTimes: "08:00",
                    durationDays: 7,
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
              <div className="grid gap-3 rounded-card border border-border p-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.6fr_auto]" key={row.id}>
                <FormInput label="Tên thuốc" onChange={(event) => updateRow(row.id, { medicationName: event.target.value })} value={row.medicationName} />
                <FormInput label="Liều dùng" onChange={(event) => updateRow(row.id, { dosage: event.target.value })} value={row.dosage} />
                <FormInput label="Giờ uống" helperText="Có thể nhập nhiều giờ, cách nhau bằng dấu phẩy." onChange={(event) => updateRow(row.id, { scheduledTimes: event.target.value })} value={row.scheduledTimes} />
                <FormInput label="Số ngày" onChange={(event) => updateRow(row.id, { durationDays: Number(event.target.value) })} type="number" value={row.durationDays} />
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

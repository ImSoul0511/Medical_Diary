import { FormEvent, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormInput } from "../../components/FormInput";
import { useUiStore } from "../../store/uiStore";

type MedicineRow = {
  id: string;
  name: string;
  dosage: string;
  schedule: string;
  durationDays: number;
};

export function DoctorPrescription() {
  const showToast = useUiStore((state) => state.showToast);
  const [diagnosis, setDiagnosis] = useState("Theo dõi huyết áp và đường huyết định kỳ.");
  const [rows, setRows] = useState<MedicineRow[]>([
    {
      id: "medicine-1",
      name: "Amlodipine 5mg",
      dosage: "1 viên",
      schedule: "Sáng",
      durationDays: 30,
    },
  ]);

  function updateRow(id: string, payload: Partial<MedicineRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...payload } : row)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showToast("Đơn thuốc mock đã được lưu cục bộ. Chưa gọi API.");
  }

  return (
    <AppShell
      description="Prescription builder UI, chưa gửi đơn thuốc tới backend."
      role="doctor"
      title="Tạo đơn thuốc"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card padding="lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge tone="pending">Ready for manual API later</Badge>
              <h2 className="mt-3 text-lg font-semibold text-secondary">Chẩn đoán và ghi chú</h2>
              <p className="mt-1 text-sm text-mutedForeground">
                Submit hiện tại chỉ tạo toast local.
              </p>
            </div>
            <Button leftIcon={<Save className="h-4 w-4" />} type="submit" variant="success">
              Lưu mock
            </Button>
          </div>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-medium text-secondary">Chẩn đoán</span>
            <textarea
              className="min-h-24 w-full rounded-input border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              onChange={(event) => setDiagnosis(event.target.value)}
              value={diagnosis}
            />
          </label>
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
                    name: "",
                    dosage: "",
                    schedule: "Sáng",
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
                <FormInput label="Tên thuốc" onChange={(event) => updateRow(row.id, { name: event.target.value })} value={row.name} />
                <FormInput label="Liều dùng" onChange={(event) => updateRow(row.id, { dosage: event.target.value })} value={row.dosage} />
                <FormInput label="Lịch uống" onChange={(event) => updateRow(row.id, { schedule: event.target.value })} value={row.schedule} />
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

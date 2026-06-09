import { FormEvent, useEffect, useState } from "react";
import { Download, FileText, Pill, Save } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { FormInput } from "../../components/FormInput";
import { FormSelect } from "../../components/FormSelect";
import { useMedicalRecordStore } from "../../store/medicalRecordStore";
import { usePrescriptionStore } from "../../store/prescriptionStore";
import { useUiStore } from "../../store/uiStore";
import { useUserStore } from "../../store/userStore";
import type { MedicalRecord } from "../../types/medicalRecord";
import type { Prescription } from "../../types/prescriptions";
import { formatDate } from "../../utils/date";

const bloodTypeOptions = [
  { value: "", label: "Không biết" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

const exportFields = [
  { key: "full_name", label: "Họ và tên" },
  { key: "gender", label: "Giới tính" },
  { key: "date_of_birth", label: "Ngày sinh" },
  { key: "blood_type", label: "Nhóm máu" },
  { key: "allergies", label: "Dị ứng" },
] as const;

export function ProfilePage() {
  const profile = useUserStore((state) => state.profile);
  const loadMe = useUserStore((state) => state.loadMe);
  const updateProfile = useUserStore((state) => state.updateProfile);
  const exportData = useUserStore((state) => state.exportData);
  const medicalRecords = useMedicalRecordStore((state) => state.myRecords);
  const loadRecords = useMedicalRecordStore((state) => state.loadMine);
  const prescriptions = usePrescriptionStore((state) => state.prescriptions);
  const loadPrescriptions = usePrescriptionStore((state) => state.loadPrescriptions);
  const showToast = useUiStore((state) => state.showToast);

  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>([
    "full_name",
    "date_of_birth",
    "blood_type",
    "allergies",
  ]);

  useEffect(() => {
    void loadMe().catch(() => undefined);
    void loadRecords().catch(() => undefined);
    void loadPrescriptions().catch(() => undefined);
  }, [loadMe, loadPrescriptions, loadRecords]);

  useEffect(() => {
    if (!profile) return;
    setBloodType(profile.bloodType ?? "");
    setAllergies(profile.allergies ?? "");
    setEmergencyContact(profile.emergencyContact ?? "");
  }, [profile]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    void updateProfile({
      fullName: profile.fullName,
      gender: profile.gender ?? "male",
      dateOfBirth: profile.dateOfBirth ?? "",
      phoneNumber: profile.phoneNumber ?? "",
      cccd: profile.cccd ?? "",
      bloodType,
      allergies,
      emergencyContact,
    })
      .then(() => showToast("Đã lưu hồ sơ y tế."))
      .catch(() => undefined);
  }

  function toggleExportField(field: string) {
    setSelectedExportFields((current) =>
      current.includes(field) ? current.filter((item) => item !== field) : [...current, field],
    );
  }

  function handleExport() {
    const scope = selectedExportFields.length > 0 ? selectedExportFields.join(",") : "blood_type,allergies";
    void exportData("pdf", scope)
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `medical_export_${profile?.id ?? "data"}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast("Đã tải xuống file PDF thành công.");
      })
      .catch(() => showToast("Lỗi khi tải xuống dữ liệu."));
  }

  const recordColumns: DataTableColumn<MedicalRecord>[] = [
    { key: "diagnosis", header: "Hồ sơ", render: (row) => <span className="font-medium text-secondary">{row.diagnosis}</span> },
    { key: "doctor", header: "Bác sĩ", render: (row) => row.doctorName ?? "Không rõ" },
    { key: "hospital", header: "Cơ sở", render: (row) => row.doctorHospital ?? "Không rõ" },
    { key: "date", header: "Ngày", render: (row) => formatDate(row.createdAt) },
  ];

  const prescriptionColumns: DataTableColumn<Prescription>[] = [
    {
      key: "items",
      header: "Đơn thuốc",
      render: (row) => (
        <span className="font-medium text-secondary">
          {row.items.map((item) => item.medicationName).join(", ") || row.notes || "Đơn thuốc"}
        </span>
      ),
    },
    { key: "doctor", header: "Bác sĩ", render: (row) => row.doctorName ?? "Không rõ" },
    { key: "count", header: "Số thuốc", render: (row) => <Badge tone="info">{row.items.length} loại</Badge> },
    { key: "date", header: "Ngày", render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <AppShell role="user" title="Hồ sơ bệnh án">
      <div className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-secondary">Thông tin y tế có thể cập nhật</h2>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <FormSelect label="Nhóm máu" options={bloodTypeOptions} value={bloodType} onChange={setBloodType} />
              <FormInput label="Dị ứng" onChange={(event) => setAllergies(event.target.value)} value={allergies} />
              <FormInput label="SĐT người thân" onChange={(event) => setEmergencyContact(event.target.value.replace(/\D/g, ""))} value={emergencyContact} />
              <Button leftIcon={<Save className="h-4 w-4" />} type="submit">
                Lưu thông tin y tế
              </Button>
            </form>
          </Card>

          <Card padding="lg">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-secondary">Tổng quan hồ sơ</h2>
                <p className="text-sm text-mutedForeground">Chọn trường muốn xuất PDF. SĐT người thân không nằm trong khu vực xuất này.</p>
              </div>
              <Button leftIcon={<Download className="h-4 w-4" />} onClick={handleExport} variant="outline">
                Export PDF
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {exportFields.map((field) => (
                <label className="flex items-center gap-3 rounded-card border border-border p-3" key={field.key}>
                  <input
                    checked={selectedExportFields.includes(field.key)}
                    className="h-4 w-4 accent-primary"
                    onChange={() => toggleExportField(field.key)}
                    type="checkbox"
                  />
                  <span className="text-sm font-medium text-secondary">{field.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-card bg-dangerBg p-4">
                <p className="text-xs text-red-700">Dị ứng</p>
                <p className="mt-1 font-semibold text-red-900">{profile?.allergies ?? "Chưa cập nhật"}</p>
              </div>
              <div className="rounded-card bg-infoBg p-4">
                <p className="text-xs text-blue-700">Nhóm máu</p>
                <p className="mt-1 font-semibold text-blue-900">{profile?.bloodType ?? "Chưa cập nhật"}</p>
              </div>
              <div className="rounded-card bg-muted p-4">
                <p className="text-xs text-mutedForeground">SĐT người thân</p>
                <p className="mt-1 font-semibold text-secondary">{profile?.emergencyContact ?? "Chưa cập nhật"}</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-secondary">Hồ sơ bệnh án</h2>
          </div>
          <DataTable columns={recordColumns} getRowKey={(row) => row.id} rows={medicalRecords} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold text-secondary">Đơn thuốc</h2>
          </div>
          <DataTable columns={prescriptionColumns} getRowKey={(row) => row.id} rows={prescriptions} />
        </section>
      </div>
    </AppShell>
  );
}

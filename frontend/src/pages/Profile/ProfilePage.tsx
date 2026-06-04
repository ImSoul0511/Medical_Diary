import { FormEvent, useEffect, useState } from "react";
import { Download, FileText, Pill, Save, UserRound } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { FormInput } from "../../components/FormInput";
import { useMedicalRecordStore } from "../../store/medicalRecordStore";
import { usePrescriptionStore } from "../../store/prescriptionStore";
import { useUiStore } from "../../store/uiStore";
import { useUserStore } from "../../store/userStore";
import type { MedicalRecord } from "../../types/medicalRecord";
import type { Prescription } from "../../types/prescriptions";
import { formatDate } from "../../utils/date";

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
  const [fullName, setFullName] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  useEffect(() => {
    void loadMe().catch(() => undefined);
    void loadRecords().catch(() => undefined);
    void loadPrescriptions().catch(() => undefined);
  }, [loadMe, loadPrescriptions, loadRecords]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setBloodType(profile.bloodType ?? "");
    setAllergies(profile.allergies ?? "");
    setEmergencyContact(profile.emergencyContact ?? "");
  }, [profile]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void updateProfile({
      fullName,
      gender: profile?.gender ?? "",
      dateOfBirth: profile?.dateOfBirth ?? "",
      bloodType,
      allergies,
      emergencyContact,
    })
      .then(() => showToast("Đã lưu hồ sơ."))
      .catch(() => undefined);
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
    <AppShell
      description="Thông tin cá nhân, hồ sơ bệnh án và đơn thuốc."
      role="user"
      title="Hồ sơ bệnh án"
    >
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <Card padding="lg">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-card bg-infoBg p-3 text-primary">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary">Thông tin cá nhân</h2>
                <p className="text-sm text-mutedForeground">Cập nhật hồ sơ qua user store.</p>
              </div>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <FormInput label="Họ và tên" onChange={(event) => setFullName(event.target.value)} value={fullName} />
              <FormInput label="Nhóm máu" onChange={(event) => setBloodType(event.target.value)} value={bloodType} />
              <FormInput label="Dị ứng" onChange={(event) => setAllergies(event.target.value)} value={allergies} />
              <FormInput label="Liên hệ khẩn cấp" onChange={(event) => setEmergencyContact(event.target.value)} value={emergencyContact} />
              <Button leftIcon={<Save className="h-4 w-4" />} type="submit">
                Lưu hồ sơ
              </Button>
            </form>
          </Card>

          <Card padding="lg">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-secondary">Tổng quan hồ sơ</h2>
                <p className="text-sm text-mutedForeground">Các trường khớp backend profile hiện tại.</p>
              </div>
              <Button
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => {
                  void exportData("pdf").then(() => showToast("Đã tạo file export.")).catch(() => undefined);
                }}
                variant="outline"
              >
                Export
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-card bg-muted p-4">
                <p className="text-xs text-mutedForeground">Giới tính</p>
                <p className="mt-1 font-semibold text-secondary">{profile?.gender ?? "Chưa cập nhật"}</p>
              </div>
              <div className="rounded-card bg-muted p-4">
                <p className="text-xs text-mutedForeground">Ngày sinh</p>
                <p className="mt-1 font-semibold text-secondary">{profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : "Chưa cập nhật"}</p>
              </div>
              <div className="rounded-card bg-dangerBg p-4">
                <p className="text-xs text-red-700">Dị ứng</p>
                <p className="mt-1 font-semibold text-red-900">{profile?.allergies ?? "Chưa cập nhật"}</p>
              </div>
              <div className="rounded-card bg-infoBg p-4">
                <p className="text-xs text-blue-700">Nhóm máu</p>
                <p className="mt-1 font-semibold text-blue-900">{profile?.bloodType ?? "Chưa cập nhật"}</p>
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

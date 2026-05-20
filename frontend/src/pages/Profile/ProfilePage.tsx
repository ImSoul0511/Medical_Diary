import { FormEvent, useState } from "react";
import { Download, FileText, Pill, Save, UserRound } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { FormInput } from "../../components/FormInput";
import { useMedicalStore } from "../../store/medicalStore";
import { useUiStore } from "../../store/uiStore";
import { useUserStore } from "../../store/userStore";
import type { MedicalRecord, Prescription } from "../../types/medical";
import { formatDate } from "../../utils/date";

export function ProfilePage() {
  const profile = useUserStore((state) => state.profile);
  const updateProfileLocal = useUserStore((state) => state.updateProfileLocal);
  const medicalRecords = useMedicalStore((state) => state.medicalRecords);
  const prescriptions = useMedicalStore((state) => state.prescriptions);
  const showToast = useUiStore((state) => state.showToast);
  const [fullName, setFullName] = useState(profile.fullName);
  const [bloodType, setBloodType] = useState(profile.bloodType);
  const [allergies, setAllergies] = useState(profile.allergies);
  const [emergencyContact, setEmergencyContact] = useState(profile.emergencyContact);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateProfileLocal({ fullName, bloodType, allergies, emergencyContact });
    showToast("Đã lưu hồ sơ trong local state.");
  }

  const recordColumns: DataTableColumn<MedicalRecord>[] = [
    { key: "title", header: "Hồ sơ", render: (row) => <span className="font-medium text-secondary">{row.title}</span> },
    { key: "doctor", header: "Bác sĩ", render: (row) => row.doctorName },
    { key: "hospital", header: "Cơ sở", render: (row) => row.hospital },
    { key: "date", header: "Ngày", render: (row) => formatDate(row.createdAt) },
  ];

  const prescriptionColumns: DataTableColumn<Prescription>[] = [
    { key: "title", header: "Đơn thuốc", render: (row) => <span className="font-medium text-secondary">{row.title}</span> },
    { key: "doctor", header: "Bác sĩ", render: (row) => row.doctorName },
    { key: "items", header: "Số thuốc", render: (row) => <Badge tone="info">{row.items.length} loại</Badge> },
    { key: "date", header: "Ngày", render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <AppShell
      description="Thông tin cá nhân, hồ sơ bệnh án và đơn thuốc mock."
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
                <p className="text-sm text-mutedForeground">Lưu nội bộ để review UI.</p>
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
                <p className="text-sm text-mutedForeground">Các chỉ số hiển thị theo local profile.</p>
              </div>
              <Button
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => showToast("Export sẽ được bạn nối API thủ công sau.")}
                variant="outline"
              >
                Export mock
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-card bg-muted p-4">
                <p className="text-xs text-mutedForeground">Số điện thoại</p>
                <p className="mt-1 font-semibold text-secondary">{profile.phoneNumber}</p>
              </div>
              <div className="rounded-card bg-muted p-4">
                <p className="text-xs text-mutedForeground">Địa chỉ</p>
                <p className="mt-1 font-semibold text-secondary">{profile.address}</p>
              </div>
              <div className="rounded-card bg-dangerBg p-4">
                <p className="text-xs text-red-700">Dị ứng</p>
                <p className="mt-1 font-semibold text-red-900">{profile.allergies}</p>
              </div>
              <div className="rounded-card bg-infoBg p-4">
                <p className="text-xs text-blue-700">Nhóm máu</p>
                <p className="mt-1 font-semibold text-blue-900">{profile.bloodType}</p>
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

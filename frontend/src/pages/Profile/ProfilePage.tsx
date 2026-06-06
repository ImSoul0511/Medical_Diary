import { FormEvent, useEffect, useState } from "react";
import { Download, FileText, Pill, Save, UserRound } from "lucide-react";
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
import type { Gender } from "../../types/users";
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
  const [gender, setGender] = useState<Gender | "">("male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cccd, setCccd] = useState("");

  useEffect(() => {
    void loadMe().catch(() => undefined);
    void loadRecords().catch(() => undefined);
    void loadPrescriptions().catch(() => undefined);
  }, [loadMe, loadPrescriptions, loadRecords]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setGender(profile.gender ?? "male");
    setDateOfBirth(profile.dateOfBirth ?? "");
    setBloodType(profile.bloodType ?? "");
    setAllergies(profile.allergies ?? "");
    setEmergencyContact(profile.emergencyContact ?? "");
    setPhoneNumber(profile.phoneNumber ?? "");
    setCccd(profile.cccd ?? "");
  }, [profile]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void updateProfile({
      fullName,
      gender,
      dateOfBirth,
      bloodType,
      allergies,
      emergencyContact,
      phoneNumber,
      cccd,
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
    <AppShell role="user" title="Hồ sơ bệnh án">
      <div className="space-y-6">
        <section className="flex flex-col gap-6">
          <Card padding="lg">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-card bg-infoBg p-3 text-primary">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary">Thông tin cá nhân</h2>
              </div>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput label="Họ và tên" onChange={(event) => setFullName(event.target.value)} value={fullName} />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-secondary">Giới tính</span>
                  <select
                    className="h-10 w-full rounded-input border border-border bg-inputBackground px-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={gender}
                    onChange={(event) => setGender(event.target.value as Gender)}
                  >
                    <option value="male">male</option>
                    <option value="female">female</option>
                  </select>
                </label>
                <FormInput label="Ngày sinh" onChange={(event) => setDateOfBirth(event.target.value)} value={dateOfBirth} type="date" />
                <FormSelect label="Nhóm máu" options={bloodTypeOptions} value={bloodType} onChange={setBloodType} />
                <FormInput label="Dị ứng" onChange={(event) => setAllergies(event.target.value)} value={allergies} />
                <FormInput label="SĐT người thân" onChange={(event) => setEmergencyContact(event.target.value)} value={emergencyContact} />
                <FormInput label="Số điện thoại" onChange={(event) => setPhoneNumber(event.target.value)} value={phoneNumber} />
                <FormInput label="CCCD" onChange={(event) => setCccd(event.target.value)} value={cccd} />
              </div>
              <Button leftIcon={<Save className="h-4 w-4" />} type="submit">
                Lưu hồ sơ
              </Button>
            </form>
          </Card>

          <Card padding="lg">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-secondary">Tổng quan hồ sơ</h2>
              </div>
              <Button
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => {
                  void exportData("pdf")
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
                }}
                variant="outline"
              >
                Export
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="rounded-card bg-muted p-4">
                <p className="text-xs text-mutedForeground">Số điện thoại</p>
                <p className="mt-1 font-semibold text-secondary">{profile?.phoneNumber ?? "Chưa cập nhật"}</p>
              </div>
              <div className="rounded-card bg-muted p-4">
                <p className="text-xs text-mutedForeground">CCCD</p>
                <p className="mt-1 font-semibold text-secondary">{profile?.cccd ?? "Chưa cập nhật"}</p>
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

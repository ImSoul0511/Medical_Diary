import { FormEvent, useEffect, useState } from "react";
import { Download, FileText, Pill, Save, Trash2, Upload, ExternalLink } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { FormInput } from "../../components/FormInput";
import { FormSelect } from "../../components/FormSelect";
import { Modal } from "../../components/Modal";
import { useMedicalRecordStore } from "../../store/medicalRecordStore";
import { usePrescriptionStore } from "../../store/prescriptionStore";
import { useUiStore } from "../../store/uiStore";
import { useUserStore } from "../../store/userStore";
import type { MedicalRecord, PatientDocument } from "../../types/medicalRecord";
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
  const myDocuments = useMedicalRecordStore((state) => state.myDocuments);
  const loadDocuments = useMedicalRecordStore((state) => state.loadMyDocuments);
  const uploadDocument = useMedicalRecordStore((state) => state.uploadDocument);
  const deleteDocument = useMedicalRecordStore((state) => state.deleteDocument);
  const isUploading = useMedicalRecordStore((state) => state.isUploadingDocument);

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

  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);

  // States for profile editing and confirmation modal
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmPasswordModalOpen, setIsConfirmPasswordModalOpen] = useState(false);
  const [profileUpdatePassword, setProfileUpdatePassword] = useState("");
  const [confirmPasswordLoading, setConfirmPasswordLoading] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  useEffect(() => {
    void loadMe().catch(() => undefined);
    void loadRecords().catch(() => undefined);
    void loadDocuments().catch(() => undefined);
    void loadPrescriptions().catch(() => undefined);
  }, [loadMe, loadPrescriptions, loadRecords, loadDocuments]);

  useEffect(() => {
    if (!profile) return;
    setBloodType(profile.bloodType ?? "");
    setAllergies(profile.allergies ?? "");
    setEmergencyContact(profile.emergencyContact ?? "");
  }, [profile]);

  function closeConfirmPasswordModal() {
    setIsConfirmPasswordModalOpen(false);
    setProfileUpdatePassword("");
    setConfirmPasswordError("");
  }

  async function handleConfirmProfileUpdate() {
    if (profileUpdatePassword.length < 8) {
      setConfirmPasswordError("Mật khẩu tối thiểu 8 ký tự.");
      return;
    }
    setConfirmPasswordError("");
    setConfirmPasswordLoading(true);
    try {
      if (!profile) return;
      await updateProfile({
        password: profileUpdatePassword,
        fullName: profile.fullName,
        gender: profile.gender ?? "male",
        dateOfBirth: profile.dateOfBirth ?? "",
        phoneNumber: profile.phoneNumber ?? "",
        cccd: profile.cccd ?? "",
        bloodType,
        allergies,
        emergencyContact,
      });
      showToast("Đã lưu hồ sơ y tế.");
      setIsEditing(false);
      closeConfirmPasswordModal();
    } catch (err: any) {
      setConfirmPasswordError(err?.message ?? "Xác nhận mật khẩu thất bại. Vui lòng thử lại.");
    } finally {
      setConfirmPasswordLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsConfirmPasswordModalOpen(true);
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

  function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  function handleDeleteDocument(id: string) {
    setDeleteDocumentId(id);
  }

  function confirmDeleteDocument() {
    if (!deleteDocumentId) return;
    const id = deleteDocumentId;
    setDeleteDocumentId(null);
    void deleteDocument(id)
      .then(() => showToast("Đã xóa tài liệu thành công."))
      .catch(() => undefined);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      setFileToUpload(event.target.files[0]);
    }
  }

  function handleUpload() {
    if (!fileToUpload) return;
    void uploadDocument(fileToUpload)
      .then(() => {
        showToast("Đã tải tài liệu lên thành công.");
        setFileToUpload(null);
        const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      })
      .catch((err: any) => {
        showToast(err?.message ?? "Tải tài liệu lên thất bại.");
      });
  }

  const documentColumns: DataTableColumn<PatientDocument>[] = [
    {
      key: "fileName",
      header: "Tên tài liệu",
      render: (row) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium text-secondary break-all">{row.fileName}</span>
        </div>
      ),
    },
    {
      key: "fileSize",
      header: "Dung lượng",
      render: (row) => formatBytes(row.fileSize),
    },
    {
      key: "createdAt",
      header: "Ngày tải lên",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          {row.downloadUrl ? (
            <a
              href={row.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-input border border-border px-2.5 text-xs font-medium text-secondary hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Xem / Tải về
            </a>
          ) : null}
          <Button
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => handleDeleteDocument(row.id)}
            size="sm"
            variant="danger"
            className="h-8 px-2.5 text-xs"
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  const recordColumns: DataTableColumn<MedicalRecord>[] = [
    {
      key: "diagnosis",
      header: "Hồ sơ / Chẩn đoán",
      render: (row) => (
        <div className="space-y-1 py-1">
          <p className="font-semibold text-secondary">{row.diagnosis}</p>
          {row.notes ? <p className="text-xs text-mutedForeground">{row.notes}</p> : null}
          {row.attachments && row.attachments.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {row.attachments.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-secondary transition-colors"
                >
                  <ExternalLink className="h-3 w-3 text-mutedForeground" />
                  Đính kèm {idx + 1}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ),
    },
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
            <h2 className="text-lg font-semibold text-secondary">Thông tin y tế khẩn cấp</h2>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <FormSelect
                disabled={!isEditing}
                label="Nhóm máu"
                options={bloodTypeOptions}
                value={bloodType}
                onChange={setBloodType}
              />
              <FormInput
                disabled={!isEditing}
                label="Dị ứng"
                onChange={(event) => setAllergies(event.target.value)}
                value={allergies}
              />
              <FormInput
                disabled={!isEditing}
                label="SĐT người thân"
                onChange={(event) => setEmergencyContact(event.target.value.replace(/\D/g, ""))}
                value={emergencyContact}
              />
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button key="confirm-btn" leftIcon={<Save className="h-4 w-4" />} type="submit">
                      Xác nhận
                    </Button>
                    <Button
                      key="cancel-btn"
                      onClick={() => {
                        setIsEditing(false);
                        if (profile) {
                          setBloodType(profile.bloodType ?? "");
                          setAllergies(profile.allergies ?? "");
                          setEmergencyContact(profile.emergencyContact ?? "");
                        }
                      }}
                      type="button"
                      variant="outline"
                    >
                      Hủy
                    </Button>
                  </>
                ) : (
                  <Button
                    key="edit-btn"
                    onClick={() => setIsEditing(true)}
                    type="button"
                  >
                    Cập nhật thông tin
                  </Button>
                )}
              </div>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-secondary">Tài liệu y tế cá nhân (Tự tải lên)</h2>
            </div>
          </div>
          <Card padding="md" className="border border-dashed border-border/80 bg-muted/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-secondary">Tải lên tài liệu của bạn (PDF, Hình ảnh,...)</p>
                <p className="text-xs text-mutedForeground">Dành cho các kết quả xét nghiệm, chẩn đoán hình ảnh cá nhân tự lưu trữ.</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="file-upload-input"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,image/*,.doc,.docx"
                />
                <label
                  htmlFor="file-upload-input"
                  className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-input border border-border bg-white px-4 text-sm font-medium text-secondary hover:bg-muted transition-colors shadow-soft-sm"
                >
                  <Upload className="h-4 w-4 text-mutedForeground" />
                  {fileToUpload ? fileToUpload.name : "Chọn tệp tin"}
                </label>
                {fileToUpload && (
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    leftIcon={<Save className="h-4 w-4" />}
                    size="sm"
                  >
                    {isUploading ? "Đang tải lên..." : "Tải lên"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
          <DataTable
            columns={documentColumns}
            getRowKey={(row) => row.id}
            rows={myDocuments}
            emptyTitle="Không có tài liệu cá nhân"
            emptyDescription="Bạn chưa tải lên tài liệu y tế cá nhân nào."
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold text-secondary">Đơn thuốc</h2>
          </div>
          <DataTable columns={prescriptionColumns} getRowKey={(row) => row.id} rows={prescriptions} />
        </section>
      </div>

      <Modal
        confirmDisabled={profileUpdatePassword.length < 8 || confirmPasswordLoading}
        confirmLabel={confirmPasswordLoading ? "Đang lưu..." : "Xác nhận"}
        confirmVariant="primary"
        description="Vui lòng nhập mật khẩu của bạn để xác nhận cập nhật thông tin y tế."
        onClose={closeConfirmPasswordModal}
        onConfirm={handleConfirmProfileUpdate}
        open={isConfirmPasswordModalOpen}
        title="Xác nhận mật khẩu"
      >
        <div className="space-y-4">
          <FormInput
            label="Mật khẩu"
            onChange={(event) => setProfileUpdatePassword(event.target.value)}
            required
            type="password"
            value={profileUpdatePassword}
            helperText="Mật khẩu tối thiểu 8 ký tự."
          />
          {confirmPasswordError ? (
            <p className="text-xs text-emergency font-medium">{confirmPasswordError}</p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={deleteDocumentId !== null}
        title="Xóa tài liệu"
        confirmLabel="Xóa"
        confirmVariant="danger"
        onConfirm={confirmDeleteDocument}
        onClose={() => setDeleteDocumentId(null)}
      >
        <p className="text-sm text-secondary">
          Bạn có chắc chắn muốn xóa tài liệu này?
        </p>
      </Modal>
    </AppShell>
  );
}

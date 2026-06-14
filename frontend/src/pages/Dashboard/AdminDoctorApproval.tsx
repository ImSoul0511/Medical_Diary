import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Eye, FileCheck, Timer, X } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { StatCard } from "../../components/StatCard";
import { useAdminStore } from "../../store/adminStore";
import type { DoctorApproval, DoctorVerifyForm } from "../../types/admin";
import { formatDateTime } from "../../utils/date";

type DoctorTab = "pending" | "rejected";
type DoctorAction = DoctorVerifyForm["action"];

const tabLabels: Record<DoctorTab, string> = {
  pending: "Chờ phê duyệt",
  rejected: "Bị từ chối",
};

function isPending(status: DoctorApproval["status"]) {
  return status === "pending_verification" || status === "pending";
}

function getStatusTone(status: DoctorApproval["status"]) {
  if (status === "approved") return "success";
  if (status === "rejected") return "emergency";
  return "pending";
}

function getStatusLabel(status: DoctorApproval["status"]) {
  if (status === "approved") return "Đã xác minh";
  if (status === "rejected") return "Bị từ chối";
  return "Chờ phê duyệt";
}

export function AdminDoctorApproval() {
  const doctors = useAdminStore((state) => state.doctors);
  const loadDoctors = useAdminStore((state) => state.loadDoctors);
  const verifyDoctor = useAdminStore((state) => state.verifyDoctor);
  const verifyingDoctorId = useAdminStore((state) => state.verifyingDoctorId);
  const isLoadingDoctors = useAdminStore((state) => state.isLoadingDoctors);
  const error = useAdminStore((state) => state.error);

  const [activeTab, setActiveTab] = useState<DoctorTab>("pending");
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorApproval | null>(null);
  const [note, setNote] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("");

  useEffect(() => {
    void loadDoctors().catch(() => undefined);
  }, [loadDoctors]);

  const pendingDoctors = useMemo(() => doctors.filter((doctor) => isPending(doctor.status)), [doctors]);
  const rejectedDoctors = useMemo(
    () => doctors.filter((doctor) => doctor.status === "rejected"),
    [doctors],
  );

  const visibleDoctors = useMemo(() => {
    const source = activeTab === "pending" ? pendingDoctors : rejectedDoctors;

    return source.filter((doctor) => {
      const specialty = doctor.specialty.toLowerCase();
      const hospital = (doctor.hospital ?? "").toLowerCase();
      return (
        specialty.includes(specialtyFilter.trim().toLowerCase()) &&
        hospital.includes(hospitalFilter.trim().toLowerCase())
      );
    });
  }, [activeTab, hospitalFilter, pendingDoctors, rejectedDoctors, specialtyFilter]);

  async function handleAction(doctor: DoctorApproval, action: DoctorAction) {
    await verifyDoctor(doctor.id, { action, note });
    setNote("");
    setSelectedDoctor(null);
    await loadDoctors();
  }

  const columns: DataTableColumn<DoctorApproval>[] = [
    {
      key: "doctor",
      header: "Bác sĩ",
      render: (row) => <span className="font-semibold text-secondary">{row.fullName}</span>,
    },
    { key: "specialty", header: "Chuyên khoa", render: (row) => row.specialty },
    { key: "hospital", header: "Bệnh viện", render: (row) => row.hospital || "Chưa cập nhật" },
    { key: "email", header: "Email", render: (row) => row.email },
    {
      key: "license",
      header: "Giấy phép",
      render: (row) => (
        <code className="rounded bg-slate-100 px-1.5 py-1 text-xs font-semibold text-slate-700">
          {row.licenseNumber}
        </code>
      ),
    },
    { key: "registered", header: "Đăng ký lúc", render: (row) => formatDateTime(row.registeredAt) },
    {
      key: "status",
      header: "Trạng thái",
      className: "text-center",
      render: (row) => (
        <div className="flex justify-center">
          <Badge tone={getStatusTone(row.status)}>{getStatusLabel(row.status)}</Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            aria-label={`Xem hồ sơ ${row.fullName}`}
            onClick={() => {
              setSelectedDoctor(row);
              setNote("");
            }}
            size="sm"
            variant="ghost"
          >
            <Eye className="h-4 w-4" />
            Chi tiết
          </Button>

          {isPending(row.status) ? (
            <>
              <Button
                aria-label={`Phê duyệt ${row.fullName}`}
                disabled={verifyingDoctorId === row.id}
                onClick={() => void handleAction(row, "approved").catch(() => undefined)}
                size="sm"
                variant="success"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                aria-label={`Từ chối ${row.fullName}`}
                disabled={verifyingDoctorId === row.id}
                onClick={() => void handleAction(row, "rejected").catch(() => undefined)}
                size="sm"
                variant="danger"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : null}

        </div>
      ),
    },
  ];

  return (
    <AppShell role="admin" title="Duyệt hồ sơ bác sĩ">
      <div className="space-y-8">
        <section className="grid gap-5 sm:grid-cols-3">
          <StatCard icon={Clock} label="Chờ phê duyệt" tone="admin" value={`${pendingDoctors.length}`} />
          <StatCard icon={FileCheck} label="Bị từ chối" tone="danger" value={`${rejectedDoctors.length}`} />
          <StatCard icon={Timer} label="Tổng hồ sơ" tone="warning" value={`${doctors.length}`} />
        </section>

        {error ? (
          <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-emergency">
            {error}
          </div>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-border">
            {(Object.keys(tabLabels) as DoctorTab[]).map((tab) => {
              const count = tab === "pending" ? pendingDoctors.length : rejectedDoctors.length;

              return (
                <button
                  className={`border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? "border-adminPrimary text-adminPrimary"
                      : "border-transparent text-mutedForeground hover:text-secondary"
                  }`}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tabLabels[tab]} ({count})
                </button>
              );
            })}
          </div>

          <div className="grid gap-5 rounded-card border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur-glass sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold text-mutedForeground">
              <span>Chuyên khoa</span>
              <input
                className="h-11 w-full rounded-button border border-border/50 bg-white/80 px-3 text-sm font-medium text-secondary shadow-soft-sm outline-none backdrop-blur-sm transition-all focus:border-adminPrimary/40 focus:shadow-soft focus:ring-4 focus:ring-adminPrimary/10"
                onChange={(event) => setSpecialtyFilter(event.target.value)}
                placeholder="Lọc theo chuyên khoa"
                type="text"
                value={specialtyFilter}
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-mutedForeground">
              <span>Bệnh viện</span>
              <input
                className="h-11 w-full rounded-button border border-border/50 bg-white/80 px-3 text-sm font-medium text-secondary shadow-soft-sm outline-none backdrop-blur-sm transition-all focus:border-adminPrimary/40 focus:shadow-soft focus:ring-4 focus:ring-adminPrimary/10"
                onChange={(event) => setHospitalFilter(event.target.value)}
                placeholder="Lọc theo bệnh viện"
                type="text"
                value={hospitalFilter}
              />
            </label>
          </div>

          {isLoadingDoctors ? (
            <div className="rounded-card border border-white/60 bg-white/80 px-5 py-8 text-sm font-medium text-mutedForeground shadow-soft backdrop-blur-glass">
              Đang tải danh sách bác sĩ...
            </div>
          ) : (
            <DataTable
              columns={columns}
              emptyDescription="Không có bác sĩ phù hợp với bộ lọc hiện tại."
              emptyTitle="Không có hồ sơ bác sĩ"
              getRowKey={(row) => row.id}
              rows={visibleDoctors}
            />
          )}
        </section>

        {selectedDoctor ? (
          <Modal
            onClose={() => {
              setSelectedDoctor(null);
              setNote("");
            }}
            open={Boolean(selectedDoctor)}
            showFooter={false}
            size="lg"
            title={isPending(selectedDoctor.status) ? "Kiểm duyệt hồ sơ bác sĩ" : "Thông tin bác sĩ"}
          >
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-mutedForeground">Họ và tên</p>
                  <p className="mt-1 text-sm font-bold text-secondary">{selectedDoctor.fullName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-mutedForeground">Trạng thái</p>
                  <div className="mt-1">
                    <Badge tone={getStatusTone(selectedDoctor.status)}>
                      {getStatusLabel(selectedDoctor.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-mutedForeground">Chuyên khoa</p>
                  <p className="mt-1 text-sm font-medium text-secondary">{selectedDoctor.specialty}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-mutedForeground">Bệnh viện</p>
                  <p className="mt-1 text-sm font-medium text-secondary">
                    {selectedDoctor.hospital || "Chưa cập nhật"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-mutedForeground">Email</p>
                  <p className="mt-1 text-sm font-medium text-secondary">{selectedDoctor.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-mutedForeground">Số giấy phép</p>
                  <code className="mt-1 inline-flex rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {selectedDoctor.licenseNumber}
                  </code>
                </div>
              </div>

              {selectedDoctor.certificateUrl ? (
                <div className="rounded-card border border-white/60 bg-white/50 p-4 shadow-soft-sm backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase text-mutedForeground">Chứng chỉ hành nghề</p>
                  <a
                    className="mt-2 inline-flex text-sm font-semibold text-adminPrimary hover:underline"
                    href={selectedDoctor.certificateUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Mở tài liệu đính kèm
                  </a>
                </div>
              ) : null}

              {selectedDoctor.status !== "rejected" ? (
                <label className="block space-y-2 text-xs font-semibold uppercase text-mutedForeground">
                  <span>Ghi chú phản hồi</span>
                  <textarea
                    className="h-24 w-full resize-none rounded-button border border-border/50 bg-white/80 p-3 text-sm font-medium normal-case text-secondary shadow-soft-sm outline-none backdrop-blur-sm transition-all focus:border-adminPrimary/40 focus:shadow-soft focus:ring-4 focus:ring-adminPrimary/10"
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Nhập ghi chú gửi tới bác sĩ"
                    value={note}
                  />
                </label>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button
                  onClick={() => {
                    setSelectedDoctor(null);
                    setNote("");
                  }}
                  variant="outline"
                >
                  Đóng
                </Button>

                {isPending(selectedDoctor.status) ? (
                  <>
                    <Button
                      disabled={verifyingDoctorId === selectedDoctor.id}
                      onClick={() => void handleAction(selectedDoctor, "rejected").catch(() => undefined)}
                      variant="danger"
                    >
                      <X className="h-4 w-4" />
                      Từ chối
                    </Button>
                    <Button
                      disabled={verifyingDoctorId === selectedDoctor.id}
                      onClick={() => void handleAction(selectedDoctor, "approved").catch(() => undefined)}
                      variant="success"
                    >
                      <Check className="h-4 w-4" />
                      Phê duyệt
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </Modal>
        ) : null}
      </div>
    </AppShell>
  );
}

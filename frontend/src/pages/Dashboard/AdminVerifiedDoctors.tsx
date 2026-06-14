import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { StatCard } from "../../components/StatCard";
import { useAdminStore } from "../../store/adminStore";
import type { DoctorApproval, DoctorVerifyForm } from "../../types/admin";
import { formatDateTime } from "../../utils/date";

type DoctorAction = DoctorVerifyForm["action"];

export function AdminVerifiedDoctors() {
  const doctors = useAdminStore((state) => state.doctors);
  const loadDoctors = useAdminStore((state) => state.loadDoctors);
  const verifyDoctor = useAdminStore((state) => state.verifyDoctor);
  const verifyingDoctorId = useAdminStore((state) => state.verifyingDoctorId);
  const isLoadingDoctors = useAdminStore((state) => state.isLoadingDoctors);
  const error = useAdminStore((state) => state.error);

  const [selectedDoctor, setSelectedDoctor] = useState<DoctorApproval | null>(null);
  const [note, setNote] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState<DoctorApproval | null>(null);

  useEffect(() => {
    void loadDoctors().catch(() => undefined);
  }, [loadDoctors]);

  const verifiedDoctors = useMemo(
    () => doctors.filter((d) => d.status === "approved"),
    [doctors],
  );

  // Top specialties for stats
  const specialtyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of verifiedDoctors) {
      map[d.specialty] = (map[d.specialty] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [verifiedDoctors]);

  const topSpecialty = specialtyCounts[0]?.[0] ?? "—";

  const uniqueHospitals = useMemo(
    () => new Set(verifiedDoctors.map((d) => d.hospital).filter(Boolean)).size,
    [verifiedDoctors],
  );

  const visibleDoctors = useMemo(() => {
    const name = nameFilter.trim().toLowerCase();
    const specialty = specialtyFilter.trim().toLowerCase();
    const hospital = hospitalFilter.trim().toLowerCase();
    return verifiedDoctors.filter(
      (d) =>
        d.fullName.toLowerCase().includes(name) &&
        d.specialty.toLowerCase().includes(specialty) &&
        (d.hospital ?? "").toLowerCase().includes(hospital),
    );
  }, [verifiedDoctors, nameFilter, specialtyFilter, hospitalFilter]);

  async function handleRevoke(doctor: DoctorApproval, action: DoctorAction) {
    await verifyDoctor(doctor.id, { action, note });
    setNote("");
    setSelectedDoctor(null);
    setConfirmRevoke(null);
    await loadDoctors();
  }

  function exportCsv() {
    const header = ["Họ và tên", "Chuyên khoa", "Bệnh viện", "Email", "Số giấy phép", "Ngày đăng ký"];
    const rows = visibleDoctors.map((d) => [
      d.fullName,
      d.specialty,
      d.hospital ?? "Chưa cập nhật",
      d.email,
      d.licenseNumber,
      formatDateTime(d.registeredAt),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bac-si-da-xac-minh-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    {
      key: "registered",
      header: "Ngày đăng ký",
      render: (row) => formatDateTime(row.registeredAt),
    },
    {
      key: "status",
      header: "Trạng thái",
      className: "text-center",
      render: () => (
        <div className="flex justify-center">
          <Badge tone="success">Đã xác minh</Badge>
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
          <Button
            aria-label={`Rút quyền ${row.fullName}`}
            disabled={verifyingDoctorId === row.id}
            onClick={() => {
              setConfirmRevoke(row);
              setNote("");
            }}
            size="sm"
            variant="danger"
          >
            <ShieldAlert className="h-4 w-4" />
            Rút quyền
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell role="admin" title="Bác sĩ đã xác minh">
      <div className="space-y-8">
        {/* Stats */}
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={UserCheck} label="Tổng đã xác minh" tone="success" value={`${verifiedDoctors.length}`} />
          <StatCard icon={Users} label="Bệnh viện liên kết" tone="admin" value={`${uniqueHospitals}`} />
          <StatCard icon={Stethoscope} label="Chuyên khoa phổ biến" tone="warning" value={topSpecialty} />
          <StatCard icon={ShieldCheck} label="Hiển thị" tone="success" value={`${visibleDoctors.length}`} />
        </section>

        {error ? (
          <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-emergency">
            {error}
          </div>
        ) : null}

        {/* Filters + Export */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end gap-4 rounded-card border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur-glass">
            <label className="flex-1 space-y-1.5 text-xs font-semibold text-mutedForeground" style={{ minWidth: 160 }}>
              <span>Tên bác sĩ</span>
              <input
                className="h-11 w-full rounded-button border border-border/50 bg-white/80 px-3 text-sm font-medium text-secondary shadow-soft-sm outline-none backdrop-blur-sm transition-all focus:border-adminPrimary/40 focus:shadow-soft focus:ring-4 focus:ring-adminPrimary/10"
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Tìm theo tên"
                type="text"
                value={nameFilter}
              />
            </label>
            <label className="flex-1 space-y-1.5 text-xs font-semibold text-mutedForeground" style={{ minWidth: 160 }}>
              <span>Chuyên khoa</span>
              <input
                className="h-11 w-full rounded-button border border-border/50 bg-white/80 px-3 text-sm font-medium text-secondary shadow-soft-sm outline-none backdrop-blur-sm transition-all focus:border-adminPrimary/40 focus:shadow-soft focus:ring-4 focus:ring-adminPrimary/10"
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                placeholder="Lọc chuyên khoa"
                type="text"
                value={specialtyFilter}
              />
            </label>
            <label className="flex-1 space-y-1.5 text-xs font-semibold text-mutedForeground" style={{ minWidth: 160 }}>
              <span>Bệnh viện</span>
              <input
                className="h-11 w-full rounded-button border border-border/50 bg-white/80 px-3 text-sm font-medium text-secondary shadow-soft-sm outline-none backdrop-blur-sm transition-all focus:border-adminPrimary/40 focus:shadow-soft focus:ring-4 focus:ring-adminPrimary/10"
                onChange={(e) => setHospitalFilter(e.target.value)}
                placeholder="Lọc bệnh viện"
                type="text"
                value={hospitalFilter}
              />
            </label>
            <div className="flex items-end pb-0.5">
              <Button
                aria-label="Xuất danh sách CSV"
                onClick={exportCsv}
                size="sm"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                Xuất CSV
              </Button>
            </div>
          </div>

          {isLoadingDoctors ? (
            <div className="rounded-card border border-white/60 bg-white/80 px-5 py-8 text-sm font-medium text-mutedForeground shadow-soft backdrop-blur-glass">
              Đang tải danh sách bác sĩ...
            </div>
          ) : (
            <DataTable
              columns={columns}
              emptyDescription="Chưa có bác sĩ nào được xác minh hoặc không khớp bộ lọc."
              emptyTitle="Không có bác sĩ đã xác minh"
              getRowKey={(row) => row.id}
              rows={visibleDoctors}
            />
          )}
        </section>

        {/* Detail Modal */}
        {selectedDoctor ? (
          <Modal
            onClose={() => {
              setSelectedDoctor(null);
              setNote("");
            }}
            open={Boolean(selectedDoctor)}
            showFooter={false}
            size="lg"
            title="Thông tin bác sĩ đã xác minh"
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
                    <Badge tone="success">Đã xác minh</Badge>
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
                <Button
                  disabled={verifyingDoctorId === selectedDoctor.id}
                  onClick={() => {
                    setConfirmRevoke(selectedDoctor);
                    setSelectedDoctor(null);
                  }}
                  variant="danger"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Rút quyền bác sĩ
                </Button>
              </div>
            </div>
          </Modal>
        ) : null}

        {/* Confirm Revoke Modal */}
        {confirmRevoke ? (
          <Modal
            onClose={() => {
              setConfirmRevoke(null);
              setNote("");
            }}
            open={Boolean(confirmRevoke)}
            showFooter={false}
            size="md"
            title="Xác nhận rút quyền bác sĩ"
          >
            <div className="space-y-4">
              <div className="rounded-card border border-red-200/40 bg-red-50/60 p-4 shadow-soft-sm backdrop-blur-sm">
                <p className="text-sm font-semibold text-emergency">
                  Bạn sắp rút quyền xác minh của bác sĩ{" "}
                  <span className="font-bold">{confirmRevoke.fullName}</span>.
                  Tài khoản sẽ được chuyển về trạng thái chờ xét duyệt.
                </p>
              </div>

              <label className="block space-y-2 text-xs font-semibold uppercase text-mutedForeground">
                <span>Lý do rút quyền</span>
                <textarea
                  className="h-24 w-full resize-none rounded-button border border-border/50 bg-white/80 p-3 text-sm font-medium normal-case text-secondary shadow-soft-sm outline-none backdrop-blur-sm transition-all focus:border-adminPrimary/40 focus:shadow-soft focus:ring-4 focus:ring-adminPrimary/10"
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập lý do để thông báo tới bác sĩ (tuỳ chọn)"
                  value={note}
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button
                  onClick={() => {
                    setConfirmRevoke(null);
                    setNote("");
                  }}
                  variant="outline"
                >
                  Huỷ
                </Button>
                <Button
                  disabled={verifyingDoctorId === confirmRevoke.id}
                  onClick={() =>
                    void handleRevoke(confirmRevoke, "pending_verification").catch(() => undefined)
                  }
                  variant="danger"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Xác nhận rút quyền
                </Button>
              </div>
            </div>
          </Modal>
        ) : null}
      </div>
    </AppShell>
  );
}

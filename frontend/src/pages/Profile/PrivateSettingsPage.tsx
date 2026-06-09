import { FormEvent, useEffect, useState } from "react";
import { KeyRound, MonitorSmartphone, RefreshCw, Save, ShieldX, Trash2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { FormInput } from "../../components/FormInput";
import { Modal } from "../../components/Modal";
import { ROUTES } from "../../constants/routes";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";
import { useUserStore } from "../../store/userStore";
import type { AuthSession, Role } from "../../types/auth";
import type { AccessHistoryItem, Gender } from "../../types/users";
import { formatDate, formatDateTime } from "../../utils/date";
import { formatGender } from "../../utils/gender";

export function PrivateSettingsPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const role = (currentUser?.role ?? "user") as Role;
  const profile = useUserStore((state) => state.profile);
  const loadMe = useUserStore((state) => state.loadMe);
  const updatePrivateProfile = useUserStore((state) => state.updatePrivateProfile);
  const accessHistory = useUserStore((state) => state.accessHistory);
  const loadAccessHistory = useUserStore((state) => state.loadAccessHistory);
  const profileError = useUserStore((state) => state.error);
  const sessions = useAuthStore((state) => state.sessions);
  const loadSessions = useAuthStore((state) => state.loadSessions);
  const revokeSession = useAuthStore((state) => state.revokeSession);
  const revokeAllSessions = useAuthStore((state) => state.revokeAllSessions);
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const sessionMutationLoading = useAuthStore((state) => state.sessionMutationLoading);
  const sessionError = useAuthStore((state) => state.sessionError);
  const showToast = useUiStore((state) => state.showToast);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender | "">("male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cccd, setCccd] = useState("");
  const [password, setPassword] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [sessionModal, setSessionModal] = useState<
    { mode: "selected"; session: AuthSession } | { mode: "all" } | null
  >(null);

  useEffect(() => {
    void loadMe().catch(() => undefined);
    void loadSessions().catch(() => undefined);
    void loadAccessHistory().catch(() => undefined);
  }, [loadAccessHistory, loadMe, loadSessions]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setGender(profile.gender ?? "male");
    setDateOfBirth(profile.dateOfBirth ?? "");
    setPhoneNumber(profile.phoneNumber ?? "");
    setCccd(profile.cccd ?? "");
  }, [profile]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void updatePrivateProfile({
      password,
      fullName,
      gender,
      dateOfBirth,
      phoneNumber,
      cccd,
    })
      .then(() => {
        setPassword("");
        showToast("Đã cập nhật thông tin riêng tư.");
      })
      .catch(() => undefined);
  }

  function closeSessionModal() {
    setSessionModal(null);
    setSessionPassword("");
  }

  function handleConfirmSessionRevoke() {
    if (!sessionModal) return;
    const action =
      sessionModal.mode === "selected"
        ? revokeSession(sessionModal.session.sessionId, sessionPassword)
        : revokeAllSessions(sessionPassword);

    void action
      .then(() => {
        showToast(sessionModal.mode === "selected" ? "Đã thu hồi phiên đăng nhập." : "Đã đăng xuất khỏi tất cả thiết bị.");
        closeSessionModal();
        if (sessionModal.mode === "all") navigate(ROUTES.login);
      })
      .catch(() => undefined);
  }

  const accessHistoryColumns: DataTableColumn<AccessHistoryItem>[] = [
    { key: "doctor", header: "Người truy cập", render: (row) => row.doctorName || "Không rõ" },
    { key: "action", header: "Hành động", render: (row) => row.action },
    { key: "dataType", header: "Dữ liệu", render: (row) => row.dataType },
    { key: "date", header: "Thời điểm", render: (row) => formatDate(row.accessedAt) },
  ];

  const sessionColumns: DataTableColumn<AuthSession>[] = [
    {
      key: "device",
      header: "Thiết bị",
      render: (row) => (
        <div className="max-w-md">
          <p className="truncate font-medium text-secondary">{row.userAgent || "Không rõ thiết bị"}</p>
          <p className="text-xs text-mutedForeground">{row.ip || "Không rõ IP"}</p>
        </div>
      ),
    },
    { key: "createdAt", header: "Tạo lúc", render: (row) => formatDateTime(row.createdAt) },
    { key: "updatedAt", header: "Cập nhật", render: (row) => formatDateTime(row.updatedAt) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <Button
          leftIcon={<Trash2 className="h-4 w-4" />}
          onClick={() => {
            setSessionModal({ mode: "selected", session: row });
            setSessionPassword("");
          }}
          size="sm"
          variant="outline"
        >
          Thu hồi
        </Button>
      ),
    },
  ];

  return (
    <AppShell role={role} title="Cài đặt riêng tư">
      <div className="space-y-6">
        <Card padding="lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-card bg-infoBg p-3 text-primary">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary">Thông tin cá nhân</h2>
              <p className="text-sm text-mutedForeground">Email hiện tại: {profile?.email ?? currentUser?.email ?? "Chưa có"}</p>
            </div>
          </div>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <FormInput label="Họ và tên" onChange={(event) => setFullName(event.target.value)} required value={fullName} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-secondary">Giới tính</span>
              <select
                className="h-10 w-full rounded-input border border-border bg-inputBackground px-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setGender(event.target.value as Gender)}
                value={gender}
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
            </label>
            <FormInput label="Ngày sinh" onChange={(event) => setDateOfBirth(event.target.value)} type="date" value={dateOfBirth} />
            <FormInput inputMode="numeric" label="Số điện thoại" onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, ""))} value={phoneNumber} />
            <FormInput
              helperText="Chỉ nhận đúng 12 chữ số."
              inputMode="numeric"
              label="CCCD"
              maxLength={12}
              onChange={(event) => setCccd(event.target.value.replace(/\D/g, "").slice(0, 12))}
              pattern="[0-9]{12}"
              value={cccd}
            />
            <FormInput label="Xác nhận mật khẩu" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
            {profileError ? <p className="text-sm text-emergency sm:col-span-2">{profileError}</p> : null}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button disabled={password.length < 8} leftIcon={<Save className="h-4 w-4" />} type="submit">
                Cập nhật thông tin
              </Button>
              <Button
                leftIcon={<KeyRound className="h-4 w-4" />}
                onClick={() => {
                  const email = profile?.email ?? currentUser?.email;
                  if (!email) return;
                  void requestPasswordReset(email)
                    .then(() => showToast("Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi."))
                    .catch(() => undefined);
                }}
                type="button"
                variant="outline"
              >
                Đặt lại mật khẩu
              </Button>
            </div>
          </form>
        </Card>

        <Card padding="lg">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-card bg-muted p-4">
              <p className="text-xs text-mutedForeground">Giới tính</p>
              <p className="mt-1 font-semibold text-secondary">{formatGender(profile?.gender)}</p>
            </div>
            <div className="rounded-card bg-muted p-4">
              <p className="text-xs text-mutedForeground">Ngày sinh</p>
              <p className="mt-1 font-semibold text-secondary">{profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : "Chưa cập nhật"}</p>
            </div>
            <div className="rounded-card bg-muted p-4">
              <p className="text-xs text-mutedForeground">Số điện thoại</p>
              <p className="mt-1 font-semibold text-secondary">{profile?.phoneNumber ?? "Chưa cập nhật"}</p>
            </div>
            <div className="rounded-card bg-muted p-4">
              <p className="text-xs text-mutedForeground">CCCD</p>
              <p className="mt-1 font-semibold text-secondary">{profile?.cccd ?? "Chưa cập nhật"}</p>
            </div>
          </div>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-secondary">Phiên đăng nhập</h2>
          </div>
          {sessionError ? <p className="text-sm text-emergency">{sessionError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadSessions().catch(() => undefined)} size="sm" variant="outline">
              Tải lại
            </Button>
            <Button
              disabled={sessions.length === 0}
              leftIcon={<ShieldX className="h-4 w-4" />}
              onClick={() => setSessionModal({ mode: "all" })}
              size="sm"
              variant="danger"
            >
              Thu hồi tất cả
            </Button>
          </div>
          <DataTable columns={sessionColumns} emptyDescription="Chưa có phiên đăng nhập nào." emptyTitle="Chưa có phiên đăng nhập" getRowKey={(row) => row.sessionId} rows={sessions} />
        </section>

        {role === "user" ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-secondary">Lịch sử truy cập</h2>
            <DataTable
              columns={accessHistoryColumns}
              emptyDescription="Chưa có bản ghi truy cập nào."
              emptyTitle="Chưa có lịch sử truy cập"
              getRowKey={(row) => `${row.id}-${row.accessedAt}-${row.action}`}
              rows={accessHistory}
            />
          </section>
        ) : null}
      </div>

      <Modal
        confirmDisabled={sessionPassword.length < 8 || sessionMutationLoading}
        confirmLabel={sessionMutationLoading ? "Đang xử lý..." : "Xác nhận thu hồi"}
        confirmVariant="danger"
        description="Nhập mật khẩu để xác nhận thao tác phiên đăng nhập."
        onClose={closeSessionModal}
        onConfirm={handleConfirmSessionRevoke}
        open={Boolean(sessionModal)}
        title={sessionModal?.mode === "all" ? "Thu hồi tất cả phiên" : "Thu hồi phiên đăng nhập"}
      >
        <FormInput
          helperText="Mật khẩu tối thiểu 8 ký tự."
          label="Mật khẩu"
          onChange={(event) => setSessionPassword(event.target.value)}
          type="password"
          value={sessionPassword}
        />
      </Modal>
    </AppShell>
  );
}

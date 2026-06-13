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
import { parseUserAgent } from "../../utils/format";

export function PrivateSettingsPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const role = (currentUser?.role ?? "user") as Role;
  const profile = useUserStore((state) => state.profile);
  const loadMe = useUserStore((state) => state.loadMe);
  const updatePrivateProfile = useUserStore((state) => state.updatePrivateProfile);
  const profileError = useUserStore((state) => state.error);
  const sessions = useAuthStore((state) => state.sessions);
  const loadSessions = useAuthStore((state) => state.loadSessions);
  const revokeSession = useAuthStore((state) => state.revokeSession);
  const revokeAllSessions = useAuthStore((state) => state.revokeAllSessions);
  const changePasswordAction = useAuthStore((state) => state.changePassword);
  const sessionMutationLoading = useAuthStore((state) => state.sessionMutationLoading);
  const sessionError = useAuthStore((state) => state.sessionError);
  const showToast = useUiStore((state) => state.showToast);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender | "">("male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cccd, setCccd] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [hospital, setHospital] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [sessionModal, setSessionModal] = useState<
    { mode: "selected"; session: AuthSession } | { mode: "all" } | null
  >(null);

  // States for change password modal popup
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  // States for profile editing and confirmation modal
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmPasswordModalOpen, setIsConfirmPasswordModalOpen] = useState(false);
  const [profileUpdatePassword, setProfileUpdatePassword] = useState("");
  const [confirmPasswordLoading, setConfirmPasswordLoading] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  function closeChangePasswordModal() {
    setIsChangePasswordModalOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwError("");
  }

  async function handleConfirmChangePassword() {
    if (newPassword.length < 8) {
      setPwError("Mật khẩu mới tối thiểu 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setPwError("");
    setPwLoading(true);
    try {
      await changePasswordAction(currentPassword, newPassword);
      showToast("Đã thay đổi mật khẩu thành công.");
      closeChangePasswordModal();
    } catch (err: any) {
      setPwError(err?.message ?? "Đổi mật khẩu thất bại. Vui lòng thử lại.");
    } finally {
      setPwLoading(false);
    }
  }

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
      await updatePrivateProfile({
        password: profileUpdatePassword,
        fullName,
        gender,
        dateOfBirth,
        phoneNumber,
        cccd,
        specialty: role === "doctor" ? specialty : undefined,
        hospital: role === "doctor" ? hospital : undefined,
      });
      showToast("Đã cập nhật thông tin riêng tư.");
      setIsEditing(false);
      closeConfirmPasswordModal();
    } catch (err: any) {
      setConfirmPasswordError(err?.message ?? "Xác nhận mật khẩu thất bại. Vui lòng thử lại.");
    } finally {
      setConfirmPasswordLoading(false);
    }
  }

  useEffect(() => {
    void loadMe().catch(() => undefined);
    void loadSessions().catch(() => undefined);
  }, [loadMe, loadSessions]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setGender(profile.gender ?? "male");
    setDateOfBirth(profile.dateOfBirth ?? "");
    setPhoneNumber(profile.phoneNumber ?? "");
    setCccd(profile.cccd ?? "");
    setSpecialty(profile.specialty ?? "");
    setHospital(profile.hospital ?? "");
  }, [profile]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsConfirmPasswordModalOpen(true);
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



  const sessionColumns: DataTableColumn<AuthSession>[] = [
    {
      key: "device",
      header: "Thiết bị",
      render: (row) => (
        <div className="max-w-md">
          <p className="truncate font-medium text-secondary" title={row.userAgent || "Không rõ thiết bị"}>
            {parseUserAgent(row.userAgent)}
          </p>
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
            <FormInput
              disabled={!isEditing}
              className="disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
              label="Họ và tên"
              onChange={(event) => setFullName(event.target.value)}
              required
              value={fullName}
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-secondary">Giới tính</span>
              <select
                disabled={!isEditing}
                className="h-10 w-full rounded-input border border-border/50 bg-white px-3 text-sm text-secondary outline-none transition-all duration-200 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                onChange={(event) => setGender(event.target.value as Gender)}
                value={gender}
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
            </label>
            <FormInput
              disabled={!isEditing}
              className="disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
              label="Ngày sinh"
              onChange={(event) => setDateOfBirth(event.target.value)}
              type="date"
              value={dateOfBirth}
            />
            <FormInput
              disabled={!isEditing}
              className="disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
              inputMode="numeric"
              label="Số điện thoại"
              onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, ""))}
              value={phoneNumber}
            />
            <FormInput
              disabled={!isEditing}
              className="disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
              helperText="Chỉ nhận đúng 12 chữ số."
              inputMode="numeric"
              label="CCCD"
              maxLength={12}
              onChange={(event) => setCccd(event.target.value.replace(/\D/g, "").slice(0, 12))}
              pattern="[0-9]{12}"
              value={cccd}
            />
            {role === "doctor" ? (
              <>
                <FormInput
                  disabled={!isEditing}
                  className="disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  label="Chuyên khoa"
                  onChange={(event) => setSpecialty(event.target.value)}
                  required
                  value={specialty}
                />
                <FormInput
                  disabled={!isEditing}
                  className="disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  label="Bệnh viện"
                  onChange={(event) => setHospital(event.target.value)}
                  required
                  value={hospital}
                />
              </>
            ) : null}
            {profileError ? <p className="text-sm text-emergency sm:col-span-2">{profileError}</p> : null}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
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
                        setFullName(profile.fullName);
                        setGender(profile.gender ?? "male");
                        setDateOfBirth(profile.dateOfBirth ?? "");
                        setPhoneNumber(profile.phoneNumber ?? "");
                        setCccd(profile.cccd ?? "");
                        setSpecialty(profile.specialty ?? "");
                        setHospital(profile.hospital ?? "");
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
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={() => setIsEditing(true)}
                  type="button"
                >
                  Cập nhật thông tin
                </Button>
              )}
              <Button
                leftIcon={<KeyRound className="h-4 w-4" />}
                onClick={() => setIsChangePasswordModalOpen(true)}
                type="button"
                variant="outline"
              >
                Đặt lại mật khẩu
              </Button>
            </div>
          </form>
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

      <Modal
        confirmDisabled={currentPassword.length === 0 || newPassword.length < 8 || confirmPassword.length < 8 || pwLoading}
        confirmLabel={pwLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
        confirmVariant="primary"
        description="Nhập thông tin bên dưới để thay đổi mật khẩu của bạn."
        onClose={closeChangePasswordModal}
        onConfirm={handleConfirmChangePassword}
        open={isChangePasswordModalOpen}
        title="Đặt lại mật khẩu"
      >
        <div className="space-y-4">
          <FormInput
            label="Mật khẩu hiện tại"
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            type="password"
            value={currentPassword}
          />
          <FormInput
            label="Mật khẩu mới"
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
            helperText="Mật khẩu tối thiểu 8 ký tự."
          />
          <FormInput
            label="Xác nhận mật khẩu mới"
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
          {pwError ? (
            <p className="text-xs text-emergency font-medium">{pwError}</p>
          ) : null}
        </div>
      </Modal>

      <Modal
        confirmDisabled={profileUpdatePassword.length < 8 || confirmPasswordLoading}
        confirmLabel={confirmPasswordLoading ? "Đang lưu..." : "Xác nhận"}
        confirmVariant="primary"
        description="Vui lòng nhập mật khẩu của bạn để xác nhận cập nhật thông tin cá nhân."
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
    </AppShell>
  );
}

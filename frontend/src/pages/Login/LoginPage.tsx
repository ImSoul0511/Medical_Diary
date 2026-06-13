/**
 * Tệp: frontend/src/pages/Login/LoginPage.tsx
 * Mục đích: Trang đăng nhập của SPA.
 * Hành vi: Gọi `useAuthStore.login` và điều hướng theo role backend trả về.
 */

import { FormEvent, useEffect, useState } from "react";
import { Activity, HeartPulse, Lock, Mail, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormInput } from "../../components/FormInput";
import { Modal } from "../../components/Modal";
import { ROUTES, roleHomePath } from "../../constants/routes";
import { roleLabels } from "../../constants/roles";
import { useAuthStore } from "../../store/authStore";
import type { Role } from "../../types/auth";
import { isEmail } from "../../utils/validation";
import { cn } from "../../utils/cn";

const loginRoles: Role[] = ["user", "doctor"];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedRole = useAuthStore((state) => state.selectedRole);
  const setSelectedRole = useAuthStore((state) => state.setSelectedRole);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const clearError = useAuthStore((state) => state.clearError);

  useEffect(() => {
    clearError();
    setError("");
    return () => {
      clearError();
    };
  }, [clearError]);

  useEffect(() => {
    if (location.pathname === ROUTES.doctorLogin) {
      setSelectedRole("doctor");
    } else {
      setSelectedRole("user");
    }
  }, [location.pathname, setSelectedRole]);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    
    const authError = hashParams.get("error_description") || queryParams.get("error_description");
    if (authError) {
      const decodedError = decodeURIComponent(authError).replace(/\+/g, " ");
      let friendlyError = decodedError;
      if (decodedError.includes("Email link is invalid or has expired")) {
        friendlyError = "Liên kết xác nhận email không hợp lệ hoặc đã hết hạn. Vui lòng gửi yêu cầu mới.";
      }
      setError(friendlyError);
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    const isRecovery = hashParams.get("type") === "recovery" || queryParams.get("type") === "recovery";
    const hasToken = hashParams.has("access_token") || queryParams.has("access_token");

    if (hasToken || isRecovery) {
      navigate(`${ROUTES.resetPassword}${window.location.search}${window.location.hash}`, { replace: true });
    }
  }, [navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleForgotPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isEmail(forgotEmail)) {
      setForgotError("Email chưa đúng định dạng.");
      return;
    }
    setForgotError("");
    setForgotLoading(true);
    try {
      await requestPasswordReset(forgotEmail);
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err?.message ?? "Gửi yêu cầu khôi phục thất bại. Vui lòng thử lại.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isEmail(email)) {
      setError("Email chưa đúng định dạng.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu tối thiểu 8 ký tự.");
      return;
    }
    setError("");
    try {
      const user = await login(selectedRole, email, password);
      if (user.role !== selectedRole) {
        await logout();
        if (selectedRole === "doctor") {
          setError("Tài khoản này là Bệnh nhân. Vui lòng đăng nhập ở trang Bệnh nhân.");
        } else {
          setError("Tài khoản này là Bác sĩ. Vui lòng đăng nhập ở trang Bác sĩ.");
        }
        return;
      }
      navigate(roleHomePath[user.role]);
    } catch (err) {
      setError("Đăng nhập thất bại. Vui lòng thử lại.");
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden items-center bg-gradient-to-br from-primary via-primaryDark to-accent p-12 text-white lg:flex overflow-hidden">
        <div aria-hidden="true" className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div aria-hidden="true" className="absolute bottom-10 left-10 h-60 w-60 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-3 shadow-soft-sm backdrop-blur-sm">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-wide">Medical Diary</p>
              <p className="text-sm text-white/75 font-medium">Nhật ký Y tế</p>
            </div>
          </div>

          <h1 className="mt-12 text-3xl font-semibold leading-tight tracking-tight">
            Theo dõi sức khỏe, quyền riêng tư và hồ sơ y tế trong một giao diện gọn.
          </h1>
        </div>
      </section>

      <main className="flex items-center justify-center px-4 py-8 sm:px-6">
        <Card className="w-full max-w-md animate-scale-in" padding="lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primaryDark text-white shadow-soft">
              <Activity className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-secondary tracking-tight">Đăng nhập hệ thống</h1>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-1.5 shadow-soft-sm">
            {loginRoles.map((role) => (
              <button
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200",
                  selectedRole === role
                    ? "bg-white text-primary shadow-soft-sm scale-[1.02]"
                    : "text-mutedForeground hover:text-secondary",
                )}
                key={role}
                onClick={() => {
                  if (role === "doctor") {
                    navigate(ROUTES.doctorLogin);
                  } else {
                    navigate(ROUTES.login);
                  }
                }}
                type="button"
              >
                {roleLabels[role]}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormInput
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              onChange={(event) => setEmail(event.target.value)}
              value={email}
            />
            <FormInput
              icon={<Lock className="h-4 w-4" />}
              label="Mật khẩu"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
            <div className="-mt-2 flex justify-end">
              <button
                onClick={() => {
                  setIsForgotOpen(true);
                  setForgotSuccess(false);
                  setForgotEmail("");
                  setForgotError("");
                }}
                className="text-sm font-medium text-mutedForeground hover:text-primary transition"
                type="button"
              >
                Quên mật khẩu?
              </button>
            </div>
            {error ? <p className="text-sm text-emergency">{error}</p> : null}
            {resetMessage ? <p className="text-sm text-success">{resetMessage}</p> : null}
            <Button className="w-full" type="submit">
              Đăng nhập
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <Link className="font-medium text-primary hover:underline" to={ROUTES.register}>
              Tạo tài khoản
            </Link>
            <Link className="inline-flex items-center gap-1 text-mutedForeground hover:text-primary" to={ROUTES.adminLogin}>
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          </div>
        </Card>

        <Modal
          open={isForgotOpen}
          title="Khôi phục mật khẩu"
          description={forgotSuccess ? undefined : "Nhập email của bạn để nhận liên kết đặt lại mật khẩu"}
          onClose={() => setIsForgotOpen(false)}
          cancelLabel="Đóng"
          size="sm"
          showFooter={!forgotSuccess}
        >
          {forgotSuccess ? (
            <div className="rounded-card border border-green-100 bg-successBg p-4 text-green-900 text-sm">
              <p className="font-medium">Đã gửi email khôi phục!</p>
              <p className="mt-1 text-green-800">
                Chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu đến <strong>{forgotEmail}</strong>. Vui lòng kiểm tra hộp thư của bạn.
              </p>
              <Button className="mt-3 w-full" onClick={() => setIsForgotOpen(false)}>
                Đồng ý
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleForgotPasswordSubmit}>
              <FormInput
                label="Email khôi phục"
                onChange={(event) => setForgotEmail(event.target.value)}
                required
                type="email"
                value={forgotEmail}
                icon={<Mail className="h-4 w-4" />}
              />
              {forgotError ? (
                <p className="text-sm text-emergency font-medium">{forgotError}</p>
              ) : null}
              <Button className="w-full" disabled={forgotLoading} type="submit">
                {forgotLoading ? "Đang gửi..." : "Gửi email khôi phục"}
              </Button>
            </form>
          )}
        </Modal>
      </main>
    </div>
  );
}

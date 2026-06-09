/**
 * Tệp: frontend/src/pages/Login/LoginPage.tsx
 * Mục đích: Trang đăng nhập của SPA.
 * Hành vi: Gọi `useAuthStore.login` và điều hướng theo role backend trả về.
 */

import { FormEvent, useState } from "react";
import { Activity, HeartPulse, Lock, Mail, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormInput } from "../../components/FormInput";
import { ROUTES, roleHomePath } from "../../constants/routes";
import { roleLabels } from "../../constants/roles";
import { useAuthStore } from "../../store/authStore";
import type { Role } from "../../types/auth";
import { isEmail } from "../../utils/validation";
import { cn } from "../../utils/cn";

const loginRoles: Role[] = ["user", "doctor"];

export function LoginPage() {
  const navigate = useNavigate();
  const selectedRole = useAuthStore((state) => state.selectedRole);
  const setSelectedRole = useAuthStore((state) => state.setSelectedRole);
  const login = useAuthStore((state) => state.login);
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

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
      navigate(roleHomePath[user.role]);
    } catch (err) {
      setError("Đăng nhập thất bại. Vui lòng thử lại.");
    }
  }

  async function handlePasswordReset() {
    if (!isEmail(email)) {
      setError("Nhập email hợp lệ trước khi đặt lại mật khẩu.");
      return;
    }
    setError("");
    setResetMessage("");
    try {
      await requestPasswordReset(email);
      setResetMessage("Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.");
    } catch {
      setError("Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.");
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden items-center bg-gradient-to-br from-primary via-primaryDark to-accent p-12 text-white lg:flex">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-3">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-semibold">Medical Diary</p>
              <p className="text-sm text-white/75">Nhật ký Y tế</p>
            </div>
          </div>

          <h1 className="mt-12 text-3xl font-semibold leading-tight">
            Theo dõi sức khỏe, quyền riêng tư và hồ sơ y tế trong một giao diện gọn.
          </h1>
        </div>
      </section>

      <main className="flex items-center justify-center px-4 py-8 sm:px-6">
        <Card className="w-full max-w-md" padding="lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
              <Activity className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold text-secondary">Đăng nhập hệ thống</h1>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-card bg-muted p-1">
            {loginRoles.map((role) => (
              <button
                className={cn(
                  "rounded-input px-3 py-2 text-sm font-medium transition",
                  selectedRole === role
                    ? "bg-card text-primary shadow-sm"
                    : "text-mutedForeground hover:text-secondary",
                )}
                key={role}
                onClick={() => setSelectedRole(role)}
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
              <button className="text-sm font-medium text-primary hover:underline" onClick={() => void handlePasswordReset()} type="button">
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
      </main>
    </div>
  );
}

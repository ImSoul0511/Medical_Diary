import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, HeartPulse, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormInput } from "../../components/FormInput";
import { ROUTES } from "../../constants/routes";
import { useAuthStore } from "../../store/authStore";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const resetPasswordAction = useAuthStore((state) => state.resetPassword);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hasToken, setHasToken] = useState(true);

  useEffect(() => {
    // Parse token from hash or search parameters
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    const token = hashParams.get("access_token") || queryParams.get("access_token");

    if (token) {
      setAccessToken(token);
    } else {
      // Check if we are already logged in (maybe we got redirected and token is in store already)
      const currentToken = useAuthStore.getState().accessToken;
      if (!currentToken) {
        setHasToken(false);
        setError("Không tìm thấy liên kết khôi phục mật khẩu hợp lệ hoặc liên kết đã hết hạn.");
      }
    }
  }, [setAccessToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Mật khẩu tối thiểu phải từ 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setError("");
    try {
      await resetPasswordAction(password);
      setSuccess(true);
      // clear token to require re-login
      setAccessToken(null);
    } catch (err: any) {
      setError(err?.message ?? "Đặt lại mật khẩu thất bại. Vui lòng thử lại.");
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Link className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" to={ROUTES.login}>
          <ArrowLeft className="h-4 w-4" />
          Quay lại đăng nhập
        </Link>

        <Card padding="lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold text-secondary">Đặt lại mật khẩu</h1>
            <p className="mt-1.5 text-sm text-mutedForeground">Nhập mật khẩu mới cho tài khoản của bạn</p>
          </div>

          {!hasToken ? (
            <div className="rounded-card border border-emergency/30 bg-dangerBg p-4 text-emergency text-sm flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Lỗi xác thực</p>
                <p className="mt-1">{error}</p>
                <Button className="mt-4 w-full" onClick={() => navigate(ROUTES.login)} variant="outline">
                  Quay lại Trang chủ
                </Button>
              </div>
            </div>
          ) : success ? (
            <div className="rounded-card border border-green-100 bg-successBg p-5 text-green-900 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-3" />
              <h2 className="font-semibold text-lg">Đặt lại mật khẩu thành công!</h2>
              <p className="mt-2 text-sm text-green-800">
                Mật khẩu của bạn đã được thay đổi. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.
              </p>
              <Button className="mt-5 w-full" onClick={() => navigate(ROUTES.login)}>
                Đăng nhập ngay
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <FormInput
                label="Mật khẩu mới"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
              <FormInput
                label="Xác nhận mật khẩu mới"
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />

              {error ? (
                <div className="flex items-start gap-2 rounded-card border border-emergency/30 bg-dangerBg p-3 text-sm text-emergency">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <Button className="w-full" disabled={isLoading} type="submit">
                {isLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}

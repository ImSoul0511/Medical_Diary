import { FormEvent, useState } from "react";
import { AlertTriangle, ArrowLeft, FileUp, HeartPulse, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormInput } from "../../components/FormInput";
import { ROUTES } from "../../constants/routes";
import { useAuthStore } from "../../store/authStore";
import type { Gender } from "../../types/users";
import type { RegisterMode } from "../../types/auth";
import { cn } from "../../utils/cn";

const defaultGender: Gender = "male";

export function RegisterPage() {
  const navigate = useNavigate();
  const registerPatient = useAuthStore((state) => state.registerPatient);
  const registerDoctor = useAuthStore((state) => state.registerDoctor);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const [mode, setMode] = useState<RegisterMode>("patient");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const base = {
      email: String(formData.get("email") ?? ""),
      phoneNumber: String(formData.get("phoneNumber") ?? ""),
      password: String(formData.get("password") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
      gender: String(formData.get("gender") ?? defaultGender) as Gender,
      dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
    };

    const action =
      mode === "doctor"
        ? registerDoctor({
          ...base,
          cccd: String(formData.get("cccd") ?? ""),
          licenseNumber: String(formData.get("licenseNumber") ?? ""),
          specialty: String(formData.get("specialty") ?? ""),
          hospital: String(formData.get("hospital") ?? ""),
          certificateFile: (formData.get("certificateFile") as File | null) ?? null,
        })
        : registerPatient(base);

    void action
      .then(() => setSubmitted(true))
      .catch(() => undefined);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Link className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary" to={ROUTES.login}>
          <ArrowLeft className="h-4 w-4" />
          Quay lại đăng nhập
        </Link>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="bg-secondary text-white" padding="lg">
            <HeartPulse className="h-10 w-10 text-primary" />
            <h1 className="mt-6 text-2xl font-semibold">Đăng ký Medical Diary</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Tạo tài khoản bệnh nhân hoặc gửi hồ sơ bác sĩ để chờ xét duyệt.
            </p>
          </Card>

          <Card padding="lg">
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-card bg-muted p-1">
              {[
                ["patient", "Bệnh nhân"],
                ["doctor", "Bác sĩ"],
              ].map(([value, label]) => (
                <button
                  className={cn(
                    "rounded-input px-3 py-2 text-sm font-medium transition",
                    mode === value
                      ? "bg-card text-primary shadow-sm"
                      : "text-mutedForeground hover:text-secondary",
                  )}
                  key={value}
                  onClick={() => setMode(value as RegisterMode)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {submitted ? (
              <div className="rounded-card border border-green-100 bg-successBg p-5 text-green-900">
                <h2 className="font-semibold">
                  {mode === "doctor" ? "Hồ sơ bác sĩ đang chờ duyệt" : "Tạo tài khoản thành công"}
                </h2>
                <p className="mt-2 text-sm">
                  Bạn có thể quay về đăng nhập.
                </p>
                <Button className="mt-4" onClick={() => navigate(ROUTES.login)}>
                  Về đăng nhập
                </Button>
              </div>
            ) : (
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
                <FormInput label="Họ và tên" name="fullName" placeholder="" required />
                <FormInput label="Email" name="email" placeholder="" required type="email" />
                <FormInput label="Số điện thoại" name="phoneNumber" placeholder="" required />
                <FormInput label="Ngày sinh" name="dateOfBirth" required type="date" />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-secondary">Giới tính</span>
                  <select
                    className="h-10 w-full rounded-input border border-border/50 bg-white px-3 text-sm text-secondary outline-none transition-all duration-200 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                    defaultValue={defaultGender}
                    name="gender"
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                </label>
                <FormInput label="Mật khẩu" name="password" required type="password" />
                {mode === "doctor" ? (
                  <>
                    <FormInput label="CCCD" name="cccd" placeholder="12 chữ số" required />
                    <FormInput label="Số giấy phép" name="licenseNumber" placeholder="HCM-2026-..." required />
                    <FormInput label="Chuyên khoa" name="specialty" placeholder="Tim mạch" required />
                    <FormInput label="Bệnh viện" name="hospital" placeholder="Bệnh viện..." required />
                    <label className="block sm:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-secondary">
                        Chứng chỉ hành nghề
                      </span>
                      <span className="flex min-h-10 items-center gap-2 rounded-input border border-dashed border-border px-3 text-sm text-mutedForeground">
                        <FileUp className="h-4 w-4" />
                        <input className="text-sm" name="certificateFile" required type="file" />
                      </span>
                    </label>
                  </>
                ) : null}
                {error ? (
                  <div className="sm:col-span-2 flex items-start gap-2 rounded-card border border-emergency/30 bg-dangerBg p-3 text-sm text-emergency">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <Button className="w-full" disabled={isLoading} leftIcon={<UserRound className="h-4 w-4" />} type="submit">
                    {mode === "doctor" ? "Gửi hồ sơ bác sĩ" : "Tạo tài khoản bệnh nhân"}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

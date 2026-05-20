import { FormEvent, useState } from "react";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormInput } from "../../components/FormInput";
import { ROUTES, roleHomePath } from "../../constants/routes";
import { useAuthStore } from "../../store/authStore";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const loginMock = useAuthStore((state) => state.loginMock);
  const [email, setEmail] = useState("admin@example.com");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMock("admin", email);
    navigate(roleHomePath.admin);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-adminBackground px-4 py-8">
      <Card className="w-full max-w-md" padding="lg">
        <Link className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-adminPrimary" to={ROUTES.login}>
          <ArrowLeft className="h-4 w-4" />
          Về đăng nhập hệ thống
        </Link>
        <div className="mb-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-adminPrimary text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-secondary">Đăng nhập quản trị</h1>
          <p className="mt-2 text-sm text-mutedForeground">
            Admin dashboard dùng mock state, không kết nối API.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormInput label="Email quản trị" onChange={(event) => setEmail(event.target.value)} value={email} />
          <FormInput icon={<LockKeyhole className="h-4 w-4" />} label="Mật khẩu" type="password" value="admin1234" readOnly />
          <Button className="w-full bg-adminPrimary hover:bg-adminSecondary" type="submit">
            Vào trang quản trị
          </Button>
        </form>
      </Card>
    </main>
  );
}

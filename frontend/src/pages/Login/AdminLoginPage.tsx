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
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const user = await login("admin", email, password);
      navigate(roleHomePath[user.role]);
    } catch (err) {
      setError("Đăng nhập quản trị thất bại.");
    }
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
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormInput label="Email quản trị" onChange={(event) => setEmail(event.target.value)} value={email} />
          <FormInput
            icon={<LockKeyhole className="h-4 w-4" />}
            label="Mật khẩu"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          {error ? <p className="text-sm text-emergency">{error}</p> : null}
          <Button className="w-full bg-adminPrimary hover:bg-adminSecondary" type="submit">
            Vào trang quản trị
          </Button>
        </form>
      </Card>
    </main>
  );
}

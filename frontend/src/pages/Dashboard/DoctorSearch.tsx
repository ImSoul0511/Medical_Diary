import { FormEvent, useState } from "react";
import { Search, ShieldPlus, UserSearch } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormInput } from "../../components/FormInput";
import { ROUTES } from "../../constants/routes";
import { useUiStore } from "../../store/uiStore";
import { mockProfile } from "../../constants/mockData";

export function DoctorSearch() {
  const showToast = useUiStore((state) => state.showToast);
  const [query, setQuery] = useState("0987 654 321");
  const [hasSearched, setHasSearched] = useState(true);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSearched(true);
  }

  return (
    <AppShell
      description="Tìm bệnh nhân và tạo yêu cầu cấp quyền mock."
      role="doctor"
      title="Tìm kiếm bệnh nhân"
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card padding="lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-card bg-teal-50 p-3 text-accent">
              <UserSearch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary">Tra cứu bệnh nhân</h2>
              <p className="text-sm text-mutedForeground">Theo SĐT, CCCD hoặc mã bệnh nhân.</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={handleSearch}>
            <FormInput
              icon={<Search className="h-4 w-4" />}
              label="Thông tin tìm kiếm"
              onChange={(event) => setQuery(event.target.value)}
              value={query}
            />
            <Button className="w-full" type="submit" variant="success">
              Tìm bệnh nhân
            </Button>
          </form>
        </Card>

        <section>
          {hasSearched ? (
            <Card padding="lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Badge tone="info">Kết quả mock</Badge>
                  <h2 className="mt-3 text-xl font-semibold text-secondary">{mockProfile.fullName}</h2>
                  <p className="mt-1 text-sm text-mutedForeground">
                    {mockProfile.phoneNumber} - {mockProfile.address}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-card bg-infoBg p-3">
                      <p className="text-xs text-blue-700">Nhóm máu</p>
                      <p className="font-semibold text-blue-900">{mockProfile.bloodType}</p>
                    </div>
                    <div className="rounded-card bg-dangerBg p-3">
                      <p className="text-xs text-red-700">Dị ứng public</p>
                      <p className="font-semibold text-red-900">Cần consent</p>
                    </div>
                    <div className="rounded-card bg-warningBg p-3">
                      <p className="text-xs text-orange-700">Trạng thái</p>
                      <p className="font-semibold text-orange-900">Chưa cấp quyền</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    leftIcon={<ShieldPlus className="h-4 w-4" />}
                    onClick={() => showToast("Đã tạo yêu cầu cấp quyền mock.")}
                    variant="success"
                  >
                    Xin quyền truy cập
                  </Button>
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-input border border-border px-4 text-sm font-medium text-secondary hover:bg-muted"
                    to={ROUTES.doctorPatient}
                  >
                    Xem demo chi tiết
                  </Link>
                </div>
              </div>
            </Card>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

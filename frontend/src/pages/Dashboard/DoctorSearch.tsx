import { FormEvent, useState } from "react";
import { Search, ShieldPlus, UserSearch } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormInput } from "../../components/FormInput";
import { ROUTES } from "../../constants/routes";
import { useDoctorStore } from "../../store/doctorStore";
import { useUiStore } from "../../store/uiStore";

export function DoctorSearch() {
  const showToast = useUiStore((state) => state.showToast);
  const results = useDoctorStore((state) => state.patientSearchResults);
  const searchPatients = useDoctorStore((state) => state.searchPatients);
  const requestAccess = useDoctorStore((state) => state.requestAccess);
  const error = useDoctorStore((state) => state.error);
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSearched(true);
    void searchPatients(query).catch(() => undefined);
  }

  function handleRequestAccess(patientId: string) {
    void requestAccess({
      patientId,
      requestedScopes: ["blood_type", "allergies", "emergency_contact", "medical_records"],
      reason: "Cần xem thông tin y tế để hỗ trợ khám và điều trị.",
    })
      .then(() => showToast("Đã gửi yêu cầu cấp quyền."))
      .catch(() => undefined);
  }

  return (
    <AppShell
      description="Tìm bệnh nhân và tạo yêu cầu cấp quyền."
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
              <p className="text-sm text-mutedForeground">Theo số điện thoại bệnh nhân.</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={handleSearch}>
            <FormInput
              icon={<Search className="h-4 w-4" />}
              label="Số điện thoại"
              onChange={(event) => setQuery(event.target.value)}
              value={query}
            />
            <Button className="w-full" type="submit" variant="success">
              Tìm bệnh nhân
            </Button>
          </form>
          {error ? <p className="mt-3 text-sm text-emergency">{error}</p> : null}
        </Card>

        <section className="space-y-3">
          {hasSearched && results.length === 0 ? (
            <Card padding="lg">
              <p className="text-sm text-mutedForeground">Không có kết quả phù hợp.</p>
            </Card>
          ) : null}
          {results.map((patient) => (
            <Card key={patient.id} padding="lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Badge tone="info">Kết quả</Badge>
                  <h2 className="mt-3 text-xl font-semibold text-secondary">{patient.fullName}</h2>
                  <p className="mt-1 text-sm text-mutedForeground">Giới tính: {patient.gender}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    leftIcon={<ShieldPlus className="h-4 w-4" />}
                    onClick={() => handleRequestAccess(patient.id)}
                    variant="success"
                  >
                    Xin quyền truy cập
                  </Button>
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-input border border-border px-4 text-sm font-medium text-secondary hover:bg-muted"
                    to={`/bac-si/benh-nhan/${patient.id}`}
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            </Card>
          ))}
          {!hasSearched ? (
            <Card padding="lg">
              <p className="text-sm text-mutedForeground">Nhập số điện thoại để bắt đầu tìm kiếm.</p>
            </Card>
          ) : null}
          <Link className="sr-only" to={ROUTES.doctorPatient}>Chi tiết bệnh nhân</Link>
        </section>
      </div>
    </AppShell>
  );
}

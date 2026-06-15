import { FormEvent, useEffect, useState } from "react";
import { Eye, Search, ShieldPlus, UserSearch } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormInput } from "../../components/FormInput";
import { Modal } from "../../components/Modal";
import { ROUTES } from "../../constants/routes";
import { consentScopeLabels } from "../../constants/consentScopes";
import { useDoctorStore } from "../../store/doctorStore";
import { useUiStore } from "../../store/uiStore";
import { HEALTH_METRIC_CONSENT_SCOPES } from "../../types/consent";
import { formatGender } from "../../utils/gender";

export function DoctorSearch() {
  const showToast = useUiStore((state) => state.showToast);
  const results = useDoctorStore((state) => state.patientSearchResults);
  const searchPatients = useDoctorStore((state) => state.searchPatients);
  const requestAccess = useDoctorStore((state) => state.requestAccess);
  const isSearching = useDoctorStore((state) => state.isSearching);
  const error = useDoctorStore((state) => state.error);
  const searchQuery = useDoctorStore((state) => state.searchQuery);
  const setSearchQuery = useDoctorStore((state) => state.setSearchQuery);
  const searchValidationError = useDoctorStore((state) => state.searchValidationError);
  const setSearchValidationError = useDoctorStore((state) => state.setSearchValidationError);
  const hasSearched = useDoctorStore((state) => state.hasSearched);
  const managedPatients = useDoctorStore((state) => state.managedPatients);
  const loadManagedPatients = useDoctorStore((state) => state.loadManagedPatients);

  useEffect(() => {
    void loadManagedPatients().catch(() => undefined);
  }, [loadManagedPatients]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetPatient, setTargetPatient] = useState<{ id: string; fullName: string } | null>(null);
  const [scopes, setScopes] = useState<Record<string, boolean>>({
    blood_type: true,
    allergies: true,
    emergency_contact: true,
    medical_records: true,
    prescriptions: true,
    diaries: true,
    heart_rate: true,
    step_count: true,
    respiratory_rate: true,
    manual_health_records: true,
    patient_documents: true,
  });
  const [reason, setReason] = useState("Cần xem thông tin y tế để hỗ trợ khám và điều trị.");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchQuery.trim().length < 8) {
      setSearchValidationError("Số điện thoại phải có ít nhất 8 chữ số.");
      return;
    }
    setSearchValidationError("");
    void searchPatients(searchQuery).catch(() => undefined);
  }

  function handleRequestAccess(patient: { id: string; fullName: string }) {
    setTargetPatient(patient);
    const relation = managedPatients.find((p) => p.patientId === patient.id);
    if (relation && relation.scopes) {
      const newScopes: Record<string, boolean> = {
        blood_type: false,
        allergies: false,
        emergency_contact: false,
        medical_records: false,
        prescriptions: false,
        diaries: false,
        heart_rate: false,
        step_count: false,
        respiratory_rate: false,
        manual_health_records: false,
        patient_documents: false,
      };
      relation.scopes.forEach((s) => {
        newScopes[s] = true;
      });
      setScopes(newScopes);
    } else {
      setScopes({
        blood_type: true,
        allergies: true,
        emergency_contact: true,
        medical_records: true,
        prescriptions: true,
        diaries: true,
        heart_rate: true,
        step_count: true,
        respiratory_rate: true,
        manual_health_records: true,
        patient_documents: true,
      });
    }
    setIsModalOpen(true);
  }

  function submitRequest() {
    if (!targetPatient) return;
    const requestedScopes = Object.keys(scopes).filter((key) => scopes[key]);
    if (requestedScopes.length === 0) {
      showToast("Vui lòng chọn ít nhất một quyền truy cập.");
      return;
    }

    void requestAccess({
      patientId: targetPatient.id,
      requestedScopes: requestedScopes as any,
      reason,
    })
      .then(() => {
        showToast("Đã gửi yêu cầu cấp quyền.");
        setIsModalOpen(false);
        void loadManagedPatients().catch(() => undefined);
      })
      .catch(() => undefined);
  }

  return (
    <AppShell role="doctor" title="Tìm kiếm bệnh nhân">
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
              inputMode="numeric"
              label="Số điện thoại"
              onChange={(event) => setSearchQuery(event.target.value.replace(/\D/g, ""))}
              value={searchQuery}
            />
            <Button className="w-full" disabled={isSearching} type="submit" variant="success">
              {isSearching ? "Đang tìm..." : "Tìm bệnh nhân"}
            </Button>
          </form>
          {searchValidationError ? <p className="mt-3 text-sm text-emergency">{searchValidationError}</p> : null}
          {error && !searchValidationError ? <p className="mt-3 text-sm text-emergency">{error}</p> : null}
        </Card>

        <section className="space-y-3">
          {isSearching ? (
            <Card padding="lg">
              <p className="animate-pulse text-sm text-mutedForeground">Đang tìm kiếm...</p>
            </Card>
          ) : hasSearched && results.length === 0 ? (
            <Card padding="lg">
              <p className="text-sm text-mutedForeground">Không có kết quả phù hợp.</p>
            </Card>
          ) : null}

          {!isSearching &&
            results.map((patient) => {
              const relation = managedPatients.find((p) => p.patientId === patient.id);
              let buttonText = "Xin quyền truy cập";
              let buttonVariant: "success" | "outline" | "secondary" = "success";
              if (relation) {
                if (relation.accessStatus === "active") {
                  buttonText = "Đã được cấp quyền";
                  buttonVariant = "secondary";
                } else if (relation.accessStatus === "pending") {
                  buttonText = "Đã xin quyền truy cập";
                  buttonVariant = "outline";
                }
              }
              return (
                <Card key={patient.id} padding="lg">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <Badge tone="info">Kết quả</Badge>
                      <h2 className="mt-3 text-xl font-semibold text-secondary">{patient.fullName}</h2>
                      <p className="mt-1 text-sm text-mutedForeground">Giới tính: {formatGender(patient.gender)}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button leftIcon={<ShieldPlus className="h-4 w-4" />} onClick={() => handleRequestAccess(patient)} variant={buttonVariant}>
                        {buttonText}
                      </Button>
                      <Link
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-input border border-border px-4 text-sm font-medium text-secondary hover:bg-muted"
                        to={`/bac-si/benh-nhan/${patient.id}/cong-khai`}
                      >
                        <Eye className="h-4 w-4" />
                        Xem công khai
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}

          {!hasSearched && !isSearching ? (
            <Card padding="lg">
              <p className="text-sm text-mutedForeground">Nhập số điện thoại để bắt đầu tìm kiếm.</p>
            </Card>
          ) : null}
          <Link className="sr-only" to={ROUTES.doctorPatient}>
            Chi tiết bệnh nhân
          </Link>
        </section>
      </div>

      <Modal
        open={isModalOpen}
        title={`Yêu cầu cấp quyền: ${targetPatient?.fullName}`}
        confirmLabel="Gửi yêu cầu"
        confirmVariant="success"
        onConfirm={submitRequest}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <span className="block text-sm font-semibold text-secondary mb-2">Chọn các phạm vi quyền muốn yêu cầu:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto border border-border/40 rounded-card p-3 bg-slate-50/50">
              {Object.keys(scopes).map((scopeKey) => (
                <label key={scopeKey} className="flex items-center gap-2 text-sm text-secondary hover:bg-muted/40 p-1.5 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    checked={scopes[scopeKey]}
                    onChange={(e) => setScopes((prev) => ({ ...prev, [scopeKey]: e.target.checked }))}
                  />
                  <span>{consentScopeLabels[scopeKey as keyof typeof consentScopeLabels] || scopeKey}</span>
                </label>
              ))}
            </div>
          </div>
          
          <label className="block">
            <span className="block text-sm font-semibold text-secondary mb-1.5">Lý do yêu cầu</span>
            <textarea
              className="w-full min-h-20 rounded-input border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do gửi yêu cầu cấp quyền..."
            />
          </label>
        </div>
      </Modal>
    </AppShell>
  );
}

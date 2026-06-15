import { useEffect, useState } from "react";
import { Pill, CheckCircle2, Circle, Clock, FileText, User, UserCheck, Calendar, Info } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { usePrescriptionStore } from "../../store/prescriptionStore";
import { formatDate } from "../../utils/date";

export function PatientPrescriptionTracker() {
  const prescriptions = usePrescriptionStore((state) => state.prescriptions);
  const todayLogs = usePrescriptionStore((state) => state.todayLogs);
  const isLoading = usePrescriptionStore((state) => state.isLoadingPrescriptions);
  const loadPrescriptions = usePrescriptionStore((state) => state.loadPrescriptions);
  const updateLogStatus = usePrescriptionStore((state) => state.updateLogStatus);
  const error = usePrescriptionStore((state) => state.error);

  const [filter, setFilter] = useState<"all" | "pending" | "taken">("all");

  useEffect(() => {
    void loadPrescriptions().catch(() => undefined);
  }, [loadPrescriptions]);

  // Helper lookups
  const getMedicationItem = (itemId: string) => {
    for (const rx of prescriptions) {
      const item = rx.items.find((i) => i.id === itemId);
      if (item) return { item, rx };
    }
    return null;
  };

  const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null);

  const sortedLogs = [...todayLogs].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  // Group logs by prescriptionId and scheduledTime
  interface GroupedLog {
    prescriptionId: string;
    scheduledTime: string;
    doctorName?: string;
    status: "taken" | "pending";
    logs: typeof todayLogs;
  }

  const groupedLogs: GroupedLog[] = [];

  sortedLogs.forEach((log) => {
    const details = getMedicationItem(log.prescriptionItemId);
    const prescriptionId = details?.rx.id || "unknown";
    const doctorName = details?.rx.doctorName;
    const time = log.scheduledTime;

    let group = groupedLogs.find(
      (g) => g.prescriptionId === prescriptionId && g.scheduledTime === time
    );

    if (!group) {
      group = {
        prescriptionId,
        scheduledTime: time,
        doctorName: doctorName || undefined,
        status: "taken",
        logs: [],
      };
      groupedLogs.push(group);
    }
    group.logs.push(log);
  });

  // Update status of each group (taken only if all logs in it are taken)
  groupedLogs.forEach((group) => {
    const allTaken = group.logs.every((l) => l.status === "taken");
    group.status = allTaken ? "taken" : "pending";
  });

  // Sort grouped logs chronologically by scheduledTime
  groupedLogs.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  // Filter groups
  const filteredGroups = groupedLogs.filter((group) => {
    if (filter === "taken") return group.status === "taken";
    if (filter === "pending") return group.status === "pending";
    return true;
  });

  const handleToggleGroupStatus = async (group: GroupedLog) => {
    const groupId = `${group.prescriptionId}_${group.scheduledTime}`;
    setUpdatingGroupId(groupId);
    const newStatus = group.status === "taken" ? "untaken" : "taken";
    try {
      await Promise.all(
        group.logs.map((log) => updateLogStatus(log.id, newStatus))
      );
    } catch (err) {
      console.error("Failed to update group status:", err);
    } finally {
      setUpdatingGroupId(null);
    }
  };

  const takenCount = todayLogs.filter((log) => log.status === "taken").length;
  const totalCount = todayLogs.length;
  const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <AppShell role="user" title="Đơn thuốc & Lịch uống thuốc">
      <div className="space-y-6">
        {/* Adherence Header Card */}
        <Card padding="lg" className="bg-gradient-to-r from-primary/10 to-primaryDark/5 border-primary/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-secondary">Theo dõi dùng thuốc hôm nay</h2>
                <p className="text-xs text-mutedForeground mt-0.5">
                  Đảm bảo uống thuốc đúng giờ và đầy đủ để bảo vệ sức khỏe của bạn.
                </p>
              </div>
            </div>
            {totalCount > 0 ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm font-semibold text-secondary">Tiến trình dùng thuốc</span>
                  <p className="text-xs text-mutedForeground mt-0.5">
                    Đã uống {takenCount} / {totalCount} liều ({progressPercent}%)
                  </p>
                </div>
                <div className="relative h-14 w-14 flex items-center justify-center rounded-full border-4 border-slate-200">
                  <div className="absolute inset-0 rounded-full border-4 border-primary" style={{ clipPath: `polygon(50% 50%, -50% -50%, ${progressPercent >= 25 ? "150% -50%" : "50% -50%"}, ${progressPercent >= 50 ? "150% 150%" : "50% -50%"}, ${progressPercent >= 75 ? "-50% 150%" : "50% -50%"}, ${progressPercent >= 100 ? "-50% -50%" : "50% -50%"})` }} />
                  <span className="text-xs font-bold text-primary">{progressPercent}%</span>
                </div>
              </div>
            ) : (
              <Badge tone="info">Hôm nay không có lịch uống thuốc</Badge>
            )}
          </div>
        </Card>

        {error && (
          <Card tone="danger">
            <p className="text-sm text-red-800">{error}</p>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left Column: Today's Intake logs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-secondary flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Lịch uống thuốc hôm nay
              </h3>
              {totalCount > 0 && (
                <div className="flex gap-1.5 bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-2.5 py-1 rounded-md transition-all ${filter === "all" ? "bg-white text-secondary shadow-sm" : "text-mutedForeground hover:text-secondary"}`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setFilter("pending")}
                    className={`px-2.5 py-1 rounded-md transition-all ${filter === "pending" ? "bg-white text-secondary shadow-sm" : "text-mutedForeground hover:text-secondary"}`}
                  >
                    Chưa uống
                  </button>
                  <button
                    onClick={() => setFilter("taken")}
                    className={`px-2.5 py-1 rounded-md transition-all ${filter === "taken" ? "bg-white text-secondary shadow-sm" : "text-mutedForeground hover:text-secondary"}`}
                  >
                    Đã uống
                  </button>
                </div>
              )}
            </div>

            {isLoading ? (
              <Card className="flex items-center justify-center py-12">
                <p className="text-sm text-mutedForeground animate-pulse">Đang tải lịch uống thuốc...</p>
              </Card>
            ) : filteredGroups.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-12 text-center text-mutedForeground">
                <Pill className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium">Không có lịch uống thuốc nào phù hợp.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredGroups.map((group) => {
                  const groupId = `${group.prescriptionId}_${group.scheduledTime}`;
                  const isUpdatingThisGroup = updatingGroupId === groupId;
                  const isTaken = group.status === "taken";

                  return (
                    <Card
                      key={groupId}
                      padding="md"
                      className={`transition-all duration-200 border-l-4 ${isTaken ? "border-l-success bg-successBg/10" : "border-l-warning bg-warningBg/10"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center ${isTaken ? "bg-success/10 text-success" : "bg-warning/10 text-pending"}`}>
                            <Clock className="h-4.5 w-4.5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-secondary">
                                {group.scheduledTime}
                              </span>
                              <Badge tone={isTaken ? "success" : "pending"}>
                                {isTaken ? "Đã uống" : "Chưa uống"}
                              </Badge>
                            </div>

                            {/* List of medications in the group */}
                            <div className="mt-2.5 space-y-2">
                              {group.logs.map((log) => {
                                const details = getMedicationItem(log.prescriptionItemId);
                                return (
                                  <div key={log.id} className="border-l-2 border-primary/20 pl-2.5 py-0.5">
                                    <h4 className="font-bold text-secondary text-sm">
                                      {details?.item.medicationName ?? "Thuốc điều trị"}
                                    </h4>
                                    <p className="text-xs text-mutedForeground mt-0.5 font-medium">
                                      Liều lượng: {details?.item.dosage}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>

                            {group.doctorName && (
                              <p className="text-[10px] text-mutedForeground mt-3 flex items-center gap-1 font-sans">
                                <User className="h-3 w-3" /> Chỉ định bởi Bác sĩ: <span className="font-medium text-secondary">{group.doctorName}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleToggleGroupStatus(group)}
                          disabled={isUpdatingThisGroup}
                          size="sm"
                          variant={isTaken ? "outline" : "success"}
                          className="flex-shrink-0"
                          leftIcon={
                            isUpdatingThisGroup ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : isTaken ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )
                          }
                        >
                          {isUpdatingThisGroup ? "Đang lưu..." : isTaken ? "Đã uống" : "Đánh dấu uống"}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Active Prescriptions List */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-secondary flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Đơn thuốc của bạn
            </h3>

            {isLoading ? (
              <Card className="flex items-center justify-center py-12">
                <p className="text-sm text-mutedForeground animate-pulse">Đang tải danh sách đơn thuốc...</p>
              </Card>
            ) : prescriptions.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-12 text-center text-mutedForeground">
                <FileText className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium">Bạn chưa có đơn thuốc nào được kê.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((rx) => (
                  <Card key={rx.id} padding="lg">
                    <div className="border-b border-border pb-3 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-accent">MÃ ĐƠN: {rx.id.slice(0, 8).toUpperCase()}</span>
                        <span className="text-[10px] text-mutedForeground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(rx.createdAt)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-secondary font-medium">
                        <UserCheck className="h-3.5 w-3.5 text-primary" />
                        <span>Kê bởi: {rx.doctorName || "Bác sĩ điều trị"}</span>
                      </div>
                      {(rx.doctorHospital || rx.doctorSpecialty) && (
                        <p className="text-[10px] text-mutedForeground ml-5 mt-0.5">
                          {rx.doctorSpecialty} - {rx.doctorHospital}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-mutedForeground">
                        Danh mục thuốc
                      </p>
                      {rx.items.map((item) => (
                        <div key={item.id} className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex justify-between font-bold text-secondary">
                            <span>{item.medicationName}</span>
                            <span>{item.durationDays ? `${item.durationDays} ngày` : ""}</span>
                          </div>
                          <div className="mt-1 flex justify-between text-mutedForeground">
                            <span>Liều dùng: {item.dosage}</span>
                            <span>Thời điểm: {item.scheduledTimes.join(", ")}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {rx.notes && (
                      <div className="mt-4 bg-blue-50/50 border border-blue-100 p-2.5 rounded-lg flex gap-2">
                        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">
                            Ghi chú từ bác sĩ
                          </p>
                          <p className="text-xs text-blue-900 mt-0.5 italic">{rx.notes}</p>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

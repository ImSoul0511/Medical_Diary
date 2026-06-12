import { FormEvent, useEffect, useState } from "react";
import { Activity, ArrowLeft, HeartPulse, NotebookText, Pill, Plus, Droplets, Thermometer, Scale, Calendar } from "lucide-react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { FormInput } from "../../components/FormInput";
import { Modal } from "../../components/Modal";
import { ROUTES } from "../../constants/routes";
import { useDiaryStore } from "../../store/diaryStore";
import { useDoctorStore } from "../../store/doctorStore";
import { useHealthMetricsStore } from "../../store/healthMetricsStore";
import { useMedicalRecordStore } from "../../store/medicalRecordStore";
import { usePrescriptionStore } from "../../store/prescriptionStore";
import { useUiStore } from "../../store/uiStore";
import type { DiaryEntry } from "../../types/diary";
import type { MedicalRecord } from "../../types/medicalRecord";
import { formatDate, formatDateTime } from "../../utils/date";
import { formatGender } from "../../utils/gender";
import { manualMetricLabels, formatManualMetricValue } from "../HealthMetrics/HealthMetricsPage";

export function DoctorPatientDetail() {
  const { patientId = "" } = useParams();
  const patient = useDoctorStore((state) => state.selectedPatient);
  const loadPatientDetail = useDoctorStore((state) => state.loadPatientDetail);
  const doctorError = useDoctorStore((state) => state.error);
  const healthMetrics = useHealthMetricsStore((state) => state.items);
  const loadPatientMetrics = useHealthMetricsStore((state) => state.loadPatientMetrics);
  const manualMetrics = useHealthMetricsStore((state) => state.manualItems);
  const loadPatientManual = useHealthMetricsStore((state) => state.loadPatientManual);
  const diaries = useDiaryStore((state) => state.items);
  const loadPatientDiaries = useDiaryStore((state) => state.loadPatientDiaries);
  const medicalRecords = useMedicalRecordStore((state) => state.patientRecords);
  const loadPatientRecords = useMedicalRecordStore((state) => state.loadPatientRecords);
  const createRecord = useMedicalRecordStore((state) => state.createRecord);
  const isCreatingRecord = useMedicalRecordStore((state) => state.isCreating);
  
  const prescriptions = usePrescriptionStore((state) => state.prescriptions);
  const loadPatientPrescriptions = usePrescriptionStore((state) => state.loadPatientPrescriptions);
  const deletePrescription = usePrescriptionStore((state) => state.deletePrescription);

  const showToast = useUiStore((state) => state.showToast);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [recordNotes, setRecordNotes] = useState("");
  const [attachments, setAttachments] = useState("");
  const chartData = healthMetrics.map((metric) => ({
    day: formatDate(metric.recordedAt, "dd/MM"),
    heartRate: metric.heartRate,
    stepCount: metric.stepCount,
    respiratoryRate: metric.respiratoryRate,
  }));
  const latestHeartRate = healthMetrics.find((metric) => metric.heartRate != null)?.heartRate;
  const latestStepCount = healthMetrics.find((metric) => metric.stepCount != null)?.stepCount;
  const latestRespiratoryRate = healthMetrics.find(
    (metric) => metric.respiratoryRate != null,
  )?.respiratoryRate;

  useEffect(() => {
    if (!patientId) return;
    void loadPatientDetail(patientId).catch(() => undefined);
    void loadPatientMetrics(patientId).catch(() => undefined);
    void loadPatientManual(patientId).catch(() => undefined);
    void loadPatientDiaries(patientId).catch(() => undefined);
    void loadPatientRecords(patientId).catch(() => undefined);
    void loadPatientPrescriptions(patientId).catch(() => undefined);
  }, [loadPatientDetail, loadPatientDiaries, loadPatientMetrics, loadPatientManual, loadPatientRecords, loadPatientPrescriptions, patientId]);

  function handleCreateRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientId) return;

    const attachmentList = attachments
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);

    void createRecord({
      patientId,
      diagnosis,
      notes: recordNotes,
      attachments: attachmentList,
    })
      .then(() => {
        setDiagnosis("");
        setRecordNotes("");
        setAttachments("");
        setIsRecordModalOpen(false);
        showToast("Đã tạo hồ sơ bệnh án.");
      })
      .catch(() => undefined);
  }

  function handleDeletePrescription(prescriptionId: string) {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn thuốc này?")) return;
    void deletePrescription(prescriptionId)
      .then(() => {
        showToast("Đã hủy đơn thuốc thành công.");
        if (patientId) {
          void loadPatientPrescriptions(patientId).catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }

  const diaryColumns: DataTableColumn<DiaryEntry>[] = [
    { key: "time", header: "Thời gian", render: (row) => formatDateTime(row.createdAt) },
    { key: "content", header: "Ghi chú", render: (row) => row.content },
    {
      key: "severity",
      header: "Triệu chứng",
      render: (row) => row.symptoms.map((item) => item.name).join(", "),
    },
  ];

  const recordColumns: DataTableColumn<MedicalRecord>[] = [
    { key: "diagnosis", header: "Hồ sơ", render: (row) => row.diagnosis },
    { key: "doctor", header: "Bác sĩ", render: (row) => row.doctorName ?? "Không rõ" },
    { key: "date", header: "Ngày", render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <AppShell role="doctor" title="Chi tiết bệnh nhân">
      <div className="space-y-6">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          to="/bac-si/tim-kiem"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại tìm kiếm
        </Link>

        <Card padding="lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge tone={patient ? "success" : "pending"}>
                {patient ? "Đã cấp quyền" : "Đang chờ dữ liệu"}
              </Badge>
              <h2 className="mt-3 text-2xl font-semibold text-secondary">
                {patient?.fullName ?? "Chưa có hồ sơ"}
              </h2>
              <p className="text-sm text-mutedForeground">
                {patient
                  ? `Giới tính ${formatGender(patient.gender)} - Nhóm máu ${patient.bloodType ?? "chưa cập nhật"}`
                  : doctorError ?? "Chọn bệnh nhân từ trang tìm kiếm."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                disabled={!patientId || isCreatingRecord}
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsRecordModalOpen(true)}
              >
                Thêm bệnh án
              </Button>
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-input bg-accent px-4 text-sm font-medium text-white transition hover:bg-teal-700"
                to={patientId ? `/bac-si/tao-don-thuoc/${patientId}` : ROUTES.doctorPrescription}
              >
                <Pill className="h-4 w-4" />
                Tạo đơn thuốc
              </Link>
            </div>
          </div>
        </Card>

        <section className="grid gap-4 lg:grid-cols-4">
          {[
            { Icon: HeartPulse, label: "Nhịp tim", value: `${latestHeartRate ?? "--"} bpm` },
            { Icon: Activity, label: "Bước chân", value: `${latestStepCount ?? "--"}` },
            { Icon: HeartPulse, label: "Nhịp thở", value: `${latestRespiratoryRate ?? "--"} lần/phút` },
            { Icon: NotebookText, label: "Nhật ký", value: `${diaries.length} bản ghi` },
          ].map(({ Icon, label, value }) => (
            <Card key={label}>
              <Icon className="h-5 w-5 text-accent" />
              <p className="mt-3 text-sm text-mutedForeground">{label}</p>
              <p className="text-xl font-semibold text-secondary">{value}</p>
            </Card>
          ))}
        </section>

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-secondary">Chỉ số sức khỏe</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line dataKey="heartRate" name="Nhịp tim" stroke="#DC2626" strokeWidth={2} type="monotone" />
                <Line dataKey="respiratoryRate" name="Nhịp thở" stroke="#7C3AED" strokeWidth={2} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Manual Measurements History Card */}
        <Card padding="lg">
          <div>
            <h2 className="text-lg font-semibold text-secondary">Chỉ số sức khỏe đo tay (Manual Vitals)</h2>
            <p className="text-xs text-mutedForeground">Thông tin sức khỏe do bệnh nhân tự đo lường tại nhà.</p>
          </div>

          {manualMetrics.length === 0 ? (
            <p className="mt-4 text-xs text-mutedForeground italic">Không tìm thấy bản ghi chỉ số đo tay nào.</p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {manualMetrics.map((item) => {
                let MetricIcon = Activity;
                let cardColor = "bg-slate-50 border-slate-200";
                let textTone = "text-slate-700";

                if (item.metricType === "blood_pressure") {
                  MetricIcon = HeartPulse;
                  cardColor = "bg-red-50/50 border-red-100";
                  textTone = "text-red-700";
                } else if (item.metricType === "blood_glucose") {
                  MetricIcon = Droplets;
                  cardColor = "bg-cyan-50/50 border-cyan-100";
                  textTone = "text-cyan-700";
                } else if (item.metricType === "spo2") {
                  MetricIcon = Activity;
                  cardColor = "bg-indigo-50/50 border-indigo-100";
                  textTone = "text-indigo-700";
                } else if (item.metricType === "body_temperature") {
                  MetricIcon = Thermometer;
                  cardColor = "bg-orange-50/50 border-orange-100";
                  textTone = "text-orange-700";
                } else if (item.metricType === "weight") {
                  MetricIcon = Scale;
                  cardColor = "bg-emerald-50/50 border-emerald-100";
                  textTone = "text-emerald-700";
                }

                return (
                  <div
                    key={item.id}
                    className={`rounded-card border p-4 flex flex-col justify-between transition-all hover:shadow-sm ${cardColor}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${textTone}`}>
                          <MetricIcon className="h-4 w-4" />
                          {manualMetricLabels[item.metricType]}
                        </span>
                        <span className="text-[10px] text-mutedForeground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(item.recordedAt)}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-secondary">
                        {formatManualMetricValue(item.metricType, item.metrics)}
                      </p>
                    </div>

                    {(item.deviceName || item.notes) && (
                      <div className="mt-3 pt-2 border-t border-dashed border-border text-[10px] text-mutedForeground space-y-1 font-sans">
                        {item.deviceName && (
                          <p>
                            Thiết bị: <span className="font-medium text-secondary">{item.deviceName}</span>
                          </p>
                        )}
                        {item.notes && (
                          <p className="italic">
                            Ghi chú: {item.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-secondary">Nhật ký triệu chứng</h2>
          <DataTable columns={diaryColumns} getRowKey={(row) => row.id} rows={diaries} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-secondary">Đơn thuốc đã kê</h2>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-input bg-accent px-4 text-sm font-medium text-white transition hover:bg-teal-700"
              to={patientId ? `/bac-si/tao-don-thuoc/${patientId}` : ROUTES.doctorPrescription}
            >
              <Pill className="h-4 w-4" />
              Tạo đơn thuốc mới
            </Link>
          </div>
          
          {prescriptions.length === 0 ? (
            <Card padding="md">
              <p className="text-sm text-mutedForeground italic text-center py-4">Bệnh nhân chưa có đơn thuốc nào.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((rx) => (
                <Card key={rx.id} padding="lg">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border pb-3 mb-3">
                    <div>
                      <p className="text-xs font-bold text-accent">Mã đơn: {rx.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-mutedForeground">Ngày kê: {formatDate(rx.createdAt)}</p>
                      {rx.notes && <p className="mt-1 text-sm text-secondary italic">Ghi chú: {rx.notes}</p>}
                    </div>
                    <Button
                      onClick={() => handleDeletePrescription(rx.id)}
                      size="sm"
                      variant="ghost"
                      className="text-emergency hover:bg-emergency/10 border border-emergency/20"
                    >
                      Hủy đơn thuốc
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-secondary font-sans">
                      <thead>
                        <tr className="border-b border-border text-xs uppercase text-mutedForeground">
                          <th className="py-2">Tên thuốc</th>
                          <th className="py-2">Liều lượng</th>
                          <th className="py-2">Thời gian uống</th>
                          <th className="py-2">Số ngày</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rx.items?.map((item) => (
                          <tr key={item.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 font-medium">{item.medicationName}</td>
                            <td className="py-2">{item.dosage}</td>
                            <td className="py-2">
                              {item.scheduledTimes ? item.scheduledTimes.join(", ") : "Theo lịch"}
                            </td>
                            <td className="py-2">{item.durationDays ? `${item.durationDays} ngày` : "--"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-secondary">Hồ sơ bệnh án</h2>
            <Button
              disabled={!patientId || isCreatingRecord}
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsRecordModalOpen(true)}
              variant="outline"
            >
              Thêm bệnh án
            </Button>
          </div>
          <DataTable columns={recordColumns} getRowKey={(row) => row.id} rows={medicalRecords} />
        </section>

        <Modal
          confirmLabel="Create"
          onClose={() => setIsRecordModalOpen(false)}
          open={isRecordModalOpen}
          title="Thêm hồ sơ bệnh án"
        >
          <form className="space-y-4" id="create-record-form" onSubmit={handleCreateRecord}>
            <FormInput
              label="Chẩn đoán"
              onChange={(event) => setDiagnosis(event.target.value)}
              required
              value={diagnosis}
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-secondary font-medium">Ghi chú</span>
              <textarea
                className="min-h-24 w-full rounded-input border border-border/50 bg-white px-3 py-2 text-sm text-secondary outline-none transition-all duration-200 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                onChange={(event) => setRecordNotes(event.target.value)}
                value={recordNotes}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-secondary font-medium">URL đính kèm</span>
              <textarea
                className="min-h-20 w-full rounded-input border border-border/50 bg-white px-3 py-2 text-sm text-secondary outline-none transition-all duration-200 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                onChange={(event) => setAttachments(event.target.value)}
                placeholder="Mỗi dòng một URL"
                value={attachments}
              />
            </label>
            <div className="flex justify-end">
              <Button disabled={isCreatingRecord} type="submit">
                Tạo hồ sơ
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}

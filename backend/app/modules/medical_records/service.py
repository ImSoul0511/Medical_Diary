import logging
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.modules.medical_records.models import MedicalRecord, PatientDocument
from app.modules.medical_records.schemas import (
    MedicalRecordCreateRequest,
    MedicalRecordResponse,
    PatientDocumentResponse,
)
from app.modules.users.models import Doctor, Profile
from app.shared.consent import check_consent
from app.shared.dependencies import get_supabase_admin_client
from app.shared.schemas import MessageResponse


logger = logging.getLogger("medical_diary")


class MedicalRecordsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _records_with_display_fields_query(self):
        patient_profile = aliased(Profile)
        doctor_profile = aliased(Profile)

        return (
            select(
                MedicalRecord,
                patient_profile.full_name.label("patient_name"),
                doctor_profile.full_name.label("doctor_name"),
                Doctor.specialty.label("doctor_specialty"),
                Doctor.hospital.label("doctor_hospital"),
            )
            .join(patient_profile, patient_profile.id == MedicalRecord.patient_id)
            .join(doctor_profile, doctor_profile.id == MedicalRecord.doctor_id)
            .outerjoin(Doctor, Doctor.id == MedicalRecord.doctor_id)
        )

    def _to_response(self, row) -> MedicalRecordResponse:
        record = row[0]

        return MedicalRecordResponse(
            id=record.id,
            patient_id=record.patient_id,
            doctor_id=record.doctor_id,
            patient_name=row.patient_name,
            doctor_name=row.doctor_name,
            doctor_specialty=row.doctor_specialty,
            doctor_hospital=row.doctor_hospital,
            diagnosis=record.diagnosis,
            notes=record.notes,
            attachments=record.attachments,
            created_at=record.created_at,
        )

    async def _get_record_response(self, record_id: UUID) -> MedicalRecordResponse:
        stmt = self._records_with_display_fields_query().where(MedicalRecord.id == record_id)
        result = await self.db.execute(stmt)
        return self._to_response(result.one())

    async def list_own_records(
        self,
        user_id: UUID,
    ) -> list[MedicalRecordResponse]:
        """User xem ho so benh an cua chinh minh."""
        stmt = (
            self._records_with_display_fields_query()
            .where(
                MedicalRecord.patient_id == user_id,
                MedicalRecord.deleted_at.is_(None),
            )
            .order_by(MedicalRecord.created_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        logger.info(f"Listed {len(rows)} medical records for user: {user_id}")
        return [self._to_response(row) for row in rows]

    async def create(
        self,
        doctor_id: UUID,
        data: MedicalRecordCreateRequest,
    ) -> MedicalRecordResponse:
        """Bac si tao ho so benh an. Khong can consent."""
        record = MedicalRecord(
            patient_id=data.patient_id,
            doctor_id=doctor_id,
            diagnosis=data.diagnosis,
            notes=data.notes,
            attachments=data.attachments,
        )
        self.db.add(record)
        await self.db.flush()
        await self.db.refresh(record)

        logger.info(f"Medical record created by doctor {doctor_id} for patient {data.patient_id}")
        return await self._get_record_response(record.id)

    async def list_by_patient(
        self,
        doctor_id: UUID,
        patient_id: UUID,
    ) -> list[MedicalRecordResponse]:
        """Bac si xem ho so benh an cua benh nhan. Can consent scope 'medical_records'."""
        has_consent = await check_consent(
            self.db,
            str(doctor_id),
            str(patient_id),
            "medical_records",
        )
        if not has_consent:
            raise HTTPException(
                status_code=403,
                detail="Khong co quyen truy cap ho so benh an cua benh nhan nay.",
            )

        stmt = (
            self._records_with_display_fields_query()
            .where(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.deleted_at.is_(None),
            )
            .order_by(MedicalRecord.created_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        logger.info(f"Doctor {doctor_id} listed {len(rows)} medical records for patient {patient_id}")
        return [self._to_response(row) for row in rows]

    async def upload_document(
        self,
        patient_id: UUID,
        file_name: str,
        file_bytes: bytes,
        mime_type: str,
        file_size: int,
    ) -> PatientDocumentResponse:
        """Bệnh nhân tải lên tài liệu/file bệnh án cá nhân của mình."""
        file_uuid = uuid4()
        storage_path = f"{patient_id}/{file_uuid}_{file_name}"

        try:
            supabase = get_supabase_admin_client()
            supabase.storage.from_("patient-files").upload(
                file=file_bytes,
                path=storage_path,
                file_options={"content-type": mime_type}
            )
        except Exception as e:
            logger.error(f"Failed to upload file to Supabase Storage: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Lỗi khi tải file lên kho lưu trữ: {str(e)}"
            )

        # Lưu thông tin vào database
        doc = PatientDocument(
            patient_id=patient_id,
            file_name=file_name,
            file_path=storage_path,
            file_size=file_size,
            mime_type=mime_type,
        )
        self.db.add(doc)
        await self.db.flush()
        await self.db.refresh(doc)

        # Tạo signed URL cho response
        try:
            signed_res = supabase.storage.from_("patient-files").create_signed_url(
                storage_path, 3600
            )
            download_url = signed_res.get("signedURL") or signed_res.get("signed_url")
        except Exception:
            download_url = None

        return PatientDocumentResponse(
            id=doc.id,
            patient_id=doc.patient_id,
            file_name=doc.file_name,
            file_path=doc.file_path,
            file_size=doc.file_size,
            mime_type=doc.mime_type,
            download_url=download_url,
            created_at=doc.created_at,
        )

    async def list_own_documents(self, patient_id: UUID) -> list[PatientDocumentResponse]:
        """Lấy danh sách file bệnh án tự tải lên của bệnh nhân."""
        stmt = select(PatientDocument).where(PatientDocument.patient_id == patient_id).order_by(PatientDocument.created_at.desc())
        result = await self.db.execute(stmt)
        docs = result.scalars().all()

        supabase = get_supabase_admin_client()
        responses = []
        for doc in docs:
            try:
                signed_res = supabase.storage.from_("patient-files").create_signed_url(
                    doc.file_path, 3600
                )
                download_url = signed_res.get("signedURL") or signed_res.get("signed_url")
            except Exception:
                download_url = None

            responses.append(
                PatientDocumentResponse(
                    id=doc.id,
                    patient_id=doc.patient_id,
                    file_name=doc.file_name,
                    file_path=doc.file_path,
                    file_size=doc.file_size,
                    mime_type=doc.mime_type,
                    download_url=download_url,
                    created_at=doc.created_at,
                )
            )
        return responses

    async def list_patient_documents(self, doctor_id: UUID, patient_id: UUID) -> list[PatientDocumentResponse]:
        """Bác sĩ xem danh sách file tự tải lên của bệnh nhân (cần scope patient_documents)."""
        has_consent = await check_consent(
            self.db,
            str(doctor_id),
            str(patient_id),
            "patient_documents",
        )
        if not has_consent:
            raise HTTPException(
                status_code=403,
                detail="Không có quyền truy cập tài liệu y tế cá nhân của bệnh nhân này.",
            )

        stmt = select(PatientDocument).where(PatientDocument.patient_id == patient_id).order_by(PatientDocument.created_at.desc())
        result = await self.db.execute(stmt)
        docs = result.scalars().all()

        supabase = get_supabase_admin_client()
        responses = []
        for doc in docs:
            try:
                signed_res = supabase.storage.from_("patient-files").create_signed_url(
                    doc.file_path, 3600
                )
                download_url = signed_res.get("signedURL") or signed_res.get("signed_url")
            except Exception:
                download_url = None

            responses.append(
                PatientDocumentResponse(
                    id=doc.id,
                    patient_id=doc.patient_id,
                    file_name=doc.file_name,
                    file_path=doc.file_path,
                    file_size=doc.file_size,
                    mime_type=doc.mime_type,
                    download_url=download_url,
                    created_at=doc.created_at,
                )
            )
        return responses

    async def delete_document(self, patient_id: UUID, document_id: UUID) -> MessageResponse:
        """Xóa tài liệu của bệnh nhân."""
        stmt = select(PatientDocument).where(
            PatientDocument.id == document_id,
            PatientDocument.patient_id == patient_id,
        )
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()

        if not doc:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy tài liệu này hoặc bạn không có quyền xóa.",
            )

        # Xóa trên Supabase Storage
        try:
            supabase = get_supabase_admin_client()
            supabase.storage.from_("patient-files").remove([doc.file_path])
        except Exception as e:
            logger.error(f"Failed to remove file from Supabase Storage: {str(e)}")

        await self.db.delete(doc)
        await self.db.flush()
        return MessageResponse(message="Xóa tài liệu thành công.")


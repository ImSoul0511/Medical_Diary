from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.medical_records.schemas import (
    MedicalRecordCreateRequest,
    MedicalRecordResponse,
    PatientDocumentResponse,
)
from app.modules.medical_records.service import MedicalRecordsService
from app.shared.dependencies import require_role
from app.shared.schemas import MessageResponse, error_responses as _error_responses

router = APIRouter(prefix="/medical-records", tags=["Medical Records"])


def _get_service(db: AsyncSession = Depends(get_db)) -> MedicalRecordsService:
    return MedicalRecordsService(db)


@router.get(
    "/me",
    response_model=List[MedicalRecordResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Xem hồ sơ bệnh án của chính mình",
    description="User xem toàn bộ hồ sơ bệnh án do bác sĩ tạo.",
)
async def list_my_records(
    service: MedicalRecordsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> List[MedicalRecordResponse]:
    return await service.list_own_records(UUID(current_user["sub"]))


@router.post(
    "",
    response_model=MedicalRecordResponse,
    status_code=201,
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Tạo hồ sơ bệnh án",
    description="Bác sĩ tạo hồ sơ bệnh án cho bệnh nhân. Không cần consent — bác sĩ chủ động tạo.",
)
async def create_record(
    data: MedicalRecordCreateRequest,
    service: MedicalRecordsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> MedicalRecordResponse:
    return await service.create(UUID(current_user["sub"]), data)


@router.get(
    "/{patient_id}",
    response_model=List[MedicalRecordResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Bác sĩ xem hồ sơ bệnh án của bệnh nhân",
    description="Bác sĩ xem hồ sơ bệnh án của bệnh nhân cụ thể. Cần consent scope 'medical_records'.",
)
async def list_patient_records(
    patient_id: UUID,
    service: MedicalRecordsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> List[MedicalRecordResponse]:
    return await service.list_by_patient(UUID(current_user["sub"]), patient_id)


@router.post(
    "/documents/upload",
    response_model=PatientDocumentResponse,
    status_code=201,
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Bệnh nhân tự tải file tài liệu y tế/bệnh án lên",
)
async def upload_document(
    file: UploadFile = File(...),
    service: MedicalRecordsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> PatientDocumentResponse:
    file_bytes = await file.read()
    return await service.upload_document(
        patient_id=UUID(current_user["sub"]),
        file_name=file.filename,
        file_bytes=file_bytes,
        mime_type=file.content_type,
        file_size=len(file_bytes),
    )


@router.post(
    "/upload-attachment/{patient_id}",
    response_model=PatientDocumentResponse,
    status_code=201,
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Bác sĩ tải lên tài liệu đính kèm cho bệnh án của bệnh nhân",
)
async def doctor_upload_attachment(
    patient_id: UUID,
    file: UploadFile = File(...),
    service: MedicalRecordsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> PatientDocumentResponse:
    file_bytes = await file.read()
    return await service.upload_document(
        patient_id=patient_id,
        file_name=file.filename,
        file_bytes=file_bytes,
        mime_type=file.content_type,
        file_size=len(file_bytes),
    )


@router.get(
    "/documents/me",
    response_model=List[PatientDocumentResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Bệnh nhân xem danh sách tài liệu y tế tự tải của mình",
)
async def list_my_documents(
    service: MedicalRecordsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> List[PatientDocumentResponse]:
    return await service.list_own_documents(UUID(current_user["sub"]))


@router.get(
    "/documents/patient/{patient_id}",
    response_model=List[PatientDocumentResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Bác sĩ xem danh sách tài liệu tự tải của bệnh nhân",
    description="Yêu cầu bác sĩ có consent scope 'medical_records' đối với bệnh nhân này.",
)
async def list_patient_documents(
    patient_id: UUID,
    service: MedicalRecordsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> List[PatientDocumentResponse]:
    return await service.list_patient_documents(
        doctor_id=UUID(current_user["sub"]),
        patient_id=patient_id,
    )


@router.delete(
    "/documents/{document_id}",
    response_model=MessageResponse,
    responses={401: _error_responses[401], 403: _error_responses[403], 404: _error_responses[404]},
    summary="Bệnh nhân xóa tài liệu y tế tự tải lên của mình",
)
async def delete_document(
    document_id: UUID,
    service: MedicalRecordsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> MessageResponse:
    return await service.delete_document(
        patient_id=UUID(current_user["sub"]),
        document_id=document_id,
    )


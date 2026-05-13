import logging
import json
import io
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.modules.users.schemas import (
    UserProfileResponse,
    UserProfileUpdateRequest,
    PrivacyUpdateRequest,
    AccessHistoryItem,
    DoctorPublicResponse
)

logger = logging.getLogger("medical_diary")

class UsersService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_profile(self, user_id: str) -> UserProfileResponse:
        try:
            query = text("""
                SELECT id, full_name, gender, date_of_birth, blood_type, allergies,
                       emergency_contact, privacy_settings
                FROM profiles
                WHERE id = :user_id AND deleted_at IS NULL
            """)
            result = await self.db.execute(query, {"user_id": user_id})
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ người dùng.")

            logger.info(f"Retrieved profile for user: {user_id}")
            return UserProfileResponse(
                id=row.id,
                full_name=row.full_name,
                gender=row.gender,
                date_of_birth=row.date_of_birth,
                blood_type=row.blood_type,
                allergies=row.allergies,
                emergency_contact=row.emergency_contact,
                privacy_settings=row.privacy_settings
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get profile for {user_id}: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi lấy thông tin hồ sơ.")

    async def update_profile(self, user_id: str, data: UserProfileUpdateRequest) -> UserProfileResponse:
        try:
            update_data = data.model_dump(exclude_none=True)
            if not update_data:
                return await self.get_profile(user_id)

            set_clauses = []
            params = {"user_id": user_id}
            
            for key, value in update_data.items():
                set_clauses.append(f"{key} = :{key}")
                params[key] = value

            set_sql = ", ".join(set_clauses)
            
            query = text(f"""
                UPDATE profiles
                SET {set_sql}, updated_at = now()
                WHERE id = :user_id AND deleted_at IS NULL
            """)
            
            await self.db.execute(query, params)
            await self.db.commit()

            logger.info(f"Updated profile for user: {user_id}")
            return await self.get_profile(user_id)
        except HTTPException:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update profile for {user_id}: {e}")
            raise HTTPException(status_code=400, detail="Không thể cập nhật hồ sơ.")

    async def update_privacy(self, user_id: str, data: PrivacyUpdateRequest) -> dict:
        try:
            update_data = data.model_dump(exclude_none=True)
            if not update_data:
                # Trả về privacy settings hiện tại
                profile = await self.get_profile(user_id)
                return profile.privacy_settings

            query = text("""
                UPDATE profiles
                SET privacy_settings = privacy_settings || :updates, updated_at = now()
                WHERE id = :user_id AND deleted_at IS NULL
                RETURNING privacy_settings
            """)
            
            result = await self.db.execute(query, {
                "updates": json.dumps(update_data),
                "user_id": user_id
            })
            row = result.fetchone()
            await self.db.commit()

            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ người dùng.")

            logger.info(f"Updated privacy settings for user: {user_id}")
            return row.privacy_settings
        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update privacy settings for {user_id}: {e}")
            raise HTTPException(status_code=400, detail="Không thể cập nhật cài đặt quyền riêng tư.")

    async def export_data(self, user_id: str, format: str, scope: str) -> StreamingResponse:
        try:
            # Phase 3A: Chỉ hỗ trợ scope=profile
            if scope != "profile":
                raise HTTPException(status_code=400, detail=f"Scope '{scope}' chưa được hỗ trợ.")

            profile = await self.get_profile(user_id)
            profile_dict = profile.model_dump(mode="json")

            if format == "json":
                json_data = json.dumps(profile_dict, ensure_ascii=False, indent=2)
                file_stream = io.BytesIO(json_data.encode("utf-8"))
                
                logger.info(f"Exported data for user: {user_id} in JSON format")
                return StreamingResponse(
                    file_stream,
                    media_type="application/json",
                    headers={"Content-Disposition": f"attachment; filename=medical_export_{user_id}.json"}
                )
            
            elif format == "pdf":
                from reportlab.pdfbase import pdfmetrics
                from reportlab.pdfbase.ttfonts import TTFont
                from reportlab.lib.pagesizes import letter
                from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
                from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
                from reportlab.lib import colors
                import os

                # Dang ky font Roboto ho tro tieng Viet
                font_path = os.path.join("app", "assets", "fonts", "Roboto-Regular.ttf")
                if os.path.exists(font_path):
                    pdfmetrics.registerFont(TTFont('Roboto', font_path))
                    font_name = 'Roboto'
                else:
                    font_name = 'Helvetica' # Fallback neu thieu font

                buffer = io.BytesIO()
                doc = SimpleDocTemplate(buffer, pagesize=letter)
                elements = []

                # Styles
                styles = getSampleStyleSheet()
                title_style = ParagraphStyle(
                    'CustomTitle',
                    parent=styles['Heading1'],
                    fontName=font_name,
                    fontSize=24,
                    textColor=colors.HexColor('#2c3e50'),
                    spaceAfter=10
                )
                normal_style = ParagraphStyle(
                    'CustomNormal',
                    parent=styles['Normal'],
                    fontName=font_name,
                    fontSize=12,
                    spaceAfter=10
                )

                from reportlab.lib.units import cm

                # Header with 4x6 Photo Box
                title_text = "<b>HỒ SƠ Y TẾ CÁ NHÂN</b><br/><br/><font size=14 color='gray'><i>(Medical Profile)</i></font>"
                title_p = Paragraph(title_text, title_style)
                
                # Tao khung anh 4x6
                photo_box = Table([['Ảnh 4x6\n(Photo)']], colWidths=[4*cm], rowHeights=[6*cm])
                photo_box.setStyle(TableStyle([
                    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('GRID', (0,0), (-1,-1), 1, colors.grey),
                    ('TEXTCOLOR', (0,0), (-1,-1), colors.grey),
                    ('FONTNAME', (0,0), (-1,-1), font_name)
                ]))
                
                # Ghep Title va Photo Box vao 1 bang de sap xep
                header_table = Table([[title_p, photo_box]], colWidths=[doc.width - 4.2*cm, 4.2*cm])
                header_table.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 0),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ]))
                
                elements.append(header_table)
                elements.append(Spacer(1, 30))
                # Chuan bi data table
                table_data = []
                for key, value in profile_dict.items():
                    # Bo qua cac truong khong can in ra file PDF
                    if key in ["privacy_settings", "id"]:
                        continue
                    
                    # Map ten tieng Viet
                    key_mapping = {
                        "full_name": "Họ và tên (Full Name)",
                        "gender": "Giới tính (Gender)",
                        "date_of_birth": "Ngày sinh (Date of Birth)",
                        "blood_type": "Nhóm máu (Blood Type)",
                        "allergies": "Dị ứng (Allergies)",
                        "emergency_contact": "Liên hệ khẩn cấp (Emergency)"
                    }
                    display_key = key_mapping.get(key, key.replace('_', ' ').title())
                    display_val = str(value) if value is not None else "Trống (N/A)"
                    
                    table_data.append([Paragraph(f"<b>{display_key}</b>", normal_style), Paragraph(display_val, normal_style)])

                # Tao Table
                t = Table(table_data, colWidths=[200, doc.width - 200])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8f9fa')), # Mau nen cho cot tieu de
                    ('BACKGROUND', (1, 0), (1, -1), colors.white),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('PADDING', (0, 0), (-1, -1), 12),
                ]))
                elements.append(t)
                elements.append(Spacer(1, 20))

                # Build PDF
                doc.build(elements)
                buffer.seek(0)
                
                logger.info(f"Exported data for user: {user_id} in PDF format")
                return StreamingResponse(
                    buffer,
                    media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=medical_export_{user_id}.pdf"}
                )
            else:
                raise HTTPException(status_code=400, detail=f"Định dạng '{format}' không hợp lệ.")
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to export data for {user_id}: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi xuất dữ liệu.")

    async def get_access_history(self, user_id: str) -> list[AccessHistoryItem]:
        try:
            query = text("""
                SELECT dal.actor_id, p.full_name AS doctor_name,
                       dal.action, dal.table_name AS data_type, dal.created_at AS accessed_at
                FROM data_access_logs dal
                JOIN profiles p ON p.id = dal.actor_id
                WHERE dal.target_user_id = :user_id
                ORDER BY dal.created_at DESC
            """)
            result = await self.db.execute(query, {"user_id": user_id})
            rows = result.fetchall()

            history = []
            for row in rows:
                history.append(AccessHistoryItem(
                    doctor_name=row.doctor_name,
                    action=row.action,
                    data_type=row.data_type,
                    accessed_at=row.accessed_at
                ))

            logger.info(f"Retrieved access history for user: {user_id}")
            return history
        except Exception as e:
            logger.error(f"Failed to get access history for {user_id}: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi lấy lịch sử truy cập.")

    async def search_doctors(self, name: str | None, specialty: str | None) -> list[DoctorPublicResponse]:
        try:
            params = {}
            conditions = []
            
            if name:
                conditions.append("p.full_name ILIKE '%' || :name || '%'")
                params["name"] = name
            if specialty:
                conditions.append("d.specialty ILIKE '%' || :specialty || '%'")
                params["specialty"] = specialty
                
            where_clause = ""
            if conditions:
                where_clause = " AND " + " AND ".join(conditions)

            query = text(f"""
                SELECT p.id, p.full_name, d.specialty, d.hospital
                FROM profiles p
                JOIN doctors d ON d.id = p.id
                WHERE p.role = 'doctor'
                  AND d.verification_status = 'approved'
                  AND p.deleted_at IS NULL
                  {where_clause}
            """)
            
            result = await self.db.execute(query, params)
            rows = result.fetchall()

            doctors = []
            for row in rows:
                doctors.append(DoctorPublicResponse(
                    id=row.id,
                    full_name=row.full_name,
                    specialty=row.specialty,
                    hospital=row.hospital
                ))

            logger.info(f"Searched doctors with name: {name}, specialty: {specialty}. Found: {len(doctors)}")
            return doctors
        except Exception as e:
            logger.error(f"Failed to search doctors: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi tìm kiếm bác sĩ.")

import logging 
from fastapi import HTTPException
from supabase import Client
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.modules.auth.schemas import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterDoctorRequest,
    SessionResponse,
    SessionListResponse,
    UserBrief
)
from app.shared.schemas import MessageResponse

logger = logging.getLogger("medical_diary")

class AuthService: 
    def __init__(self, db: AsyncSession, supabase: Client):
        self.db = db
        self.supabase = supabase 
    
    async def login(self, data: LoginRequest) -> LoginResponse: 
        try: 
            # xác thực với Supabase Auth 
            response = self.supabase.auth.sign_in_with_password({
                "email": data.email, 
                "password": data.password 
            })

            user_id = response.user.id 
            access_token = response.session.access_token 

            # lấy role từ DB 
            query = text("SELECT role FROM profiles WHERE id = :user_id AND deleted_at IS NULL") 
            result = await self.db.execute(query, {"user_id": user_id}) 
            row = result.fetchone()
            role = row[0] if row else "user" 

            return LoginResponse(
                access_token = access_token, 
                token_type="bearer",
                user=UserBrief(
                    id=user_id, 
                    role=role
                )
            )
        except Exception as e: 
            logger.warning(f"Login failed for {data.email}")
            raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
        
    async def register(self, data: RegisterRequest) -> MessageResponse:
        try: 
            response = self.supabase.auth.sign_up({
                "email": data.email, 
                "password": data.password 
            })

            user_id = response.user.id 

            query = text("""
                INSERT INTO profiles (id, full_name, role, gender, date_of_birth)
                VALUES (:id, :full_name, :role, :gender, :date_of_birth)
                """)
            await self.db.execute(query, {
                "id": user_id, 
                "full_name": data.full_name, 
                "role": "user",
                "gender": data.gender,
                "date_of_birth": data.date_of_birth,
            })
            await self.db.commit() 

            logger.info(f"User registered: {user_id}")
            return MessageResponse(message="Đăng ký thành công. Vui lòng đăng nhập.")

        except Exception as e: 
            await self.db.rollback()
            logger.error(f"Register failed: {e}")
            raise HTTPException(status_code=400, detail=f"Đăng ký thất bại: {str(e)}")

    async def register_doctor(
        self, data: RegisterDoctorRequest, certificate_url: str
    ) -> MessageResponse:
        try:
            # 1. Tạo tài khoản trên Supabase Auth
            response = self.supabase.auth.sign_up({
                "email": data.email,
                "password": data.password,
            })
            user_id = response.user.id

            # 2. Lưu profile (role = doctor, mã hóa cccd)
            profile_query = text("""
                INSERT INTO profiles (id, full_name, date_of_birth, cccd_encrypted, gender, role)
                VALUES (
                    :id, :full_name, :dob,
                    pgp_sym_encrypt(:cccd, current_setting('app.encryption_key')),
                    :gender,
                    'doctor'
                )
            """)
            await self.db.execute(profile_query, {
                "id": user_id,
                "full_name": data.full_name,
                "dob": data.date_of_birth,
                "cccd": data.cccd,
                "gender": data.gender,
            })

            # 3. Lưu thông tin bác sĩ
            doctor_query = text("""
                INSERT INTO doctors (id, specialty, license_number, hospital, certificate_url, verification_status)
                VALUES (:id, :specialty, :license_number, :hospital, :cert_url, 'pending_verification')
            """)
            await self.db.execute(doctor_query, {
                "id": user_id,
                "specialty": data.specialty,
                "license_number": data.license_number,
                "hospital": data.hospital,
                "cert_url": certificate_url,
            })
            await self.db.commit()

            logger.info(f"Doctor registered (pending): {user_id}")
            return MessageResponse(message="Đăng ký bác sĩ thành công. Vui lòng chờ admin duyệt.")

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Register doctor failed: {e}")
            raise HTTPException(status_code=400, detail=f"Đăng ký bác sĩ thất bại: {str(e)}")

    async def log_out(self) -> MessageResponse:
        try: 
            self.supabase.auth.sign_out() 
            logger.info(f"User logged out successfully")
            return MessageResponse("Đã đăng xuất thành công.")
        except Exception as e:
            logger.error(f"Logout failed: {e}")
            raise HTTPException(status_code=400, detail="Không thể đăng xuất.") 
    
    async def list_session(self, user_id: str) -> SessionListResponse:
        try: 
            response = self.supabase.rpc("list_user_sessions", {
                "target_user_id": user_id
            }).execute()
            logger.info(f"Sessions listed of user: {user_id}")
            return SessionListResponse(
                sessions=[
                    SessionResponse(
                        session_id=row["id"],
                        user_id=user_id,
                        created_at=row["created_at"],
                        updated_at=row["updated_at"],
                        user_agent=row.get("user_agent") or "Unknown",
                        ip=row.get("ip") or "Unknown"
                    ) for row in (response.data or [])
                ]
            )
        except Exception as e:
            logger.error(f"List sessions failed: {e}")
            raise HTTPException(status_code=400, detail="Không thể lấy danh sách phiên đăng nhập.")

    async def revoke_selected_session(self, session_id: str, user_id: str, password: str) -> MessageResponse:
        try:
            # Xác thực mật khẩu trước
            is_valid = self.supabase.rpc("verify_user_password", {
                "target_user_id": user_id,
                "plain_password": password
            }).execute()
            
            if not is_valid.data:
                raise HTTPException(status_code=401, detail="Mật khẩu không chính xác.")

            self.supabase.rpc("revoke_selected_session", {
                "target_session_id": session_id,
                "target_user_id": user_id
            }).execute()
            logger.info(f"Selected session {session_id} revoked successfully of user: {user_id}")
            return MessageResponse(message="Đã thu hồi phiên đăng nhập.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Revoke selected session failed: {e}")
            raise HTTPException(status_code=400, detail="Không thể thu hồi phiên đăng nhập.")

    async def revoke_all_user_sessions(self, user_id: str, password: str) -> MessageResponse:
        try:
            # Xác thực mật khẩu trước
            is_valid = self.supabase.rpc("verify_user_password", {
                "target_user_id": user_id,
                "plain_password": password
            }).execute()
            
            if not is_valid.data:
                raise HTTPException(status_code=401, detail="Mật khẩu không chính xác.")

            self.supabase.rpc("revoke_all_user_sessions", {
                "target_user_id": user_id,
            }).execute()
            logger.info(f"All sessions revoked successfully of user: {user_id}")
            return MessageResponse(message="Đã thu hồi tất cả phiên đăng nhập.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Revoke all user sessions failed: {e}")
            raise HTTPException(status_code=400, detail="Không thể thu hồi tất cả phiên đăng nhập.")
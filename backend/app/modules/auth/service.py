import logging 
from dataclasses import dataclass
from fastapi import HTTPException
from supabase import Client
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from app.modules.auth.schemas import (
    LoginRequest,
    LoginResponse,
    PasswordResetRequest,
    RegisterRequest,
    RegisterDoctorRequest,
    RegisterDoctorResponse,
    SessionResponse,
    SessionListResponse,
    UserBrief,
    ForgotPasswordRequest,
    ChangePasswordRequest,
    ResetPasswordRequest
)
from app.shared.schemas import MessageResponse

logger = logging.getLogger("medical_diary")

@dataclass
class LoginResult:
    response: LoginResponse
    refresh_token: str

class AuthService: 
    def __init__(self, db: AsyncSession, supabase: Client):
        self.db = db
        self.supabase = supabase 
    
    async def login(self, data: LoginRequest) -> LoginResult: 
        try: 
            # xác thực với Supabase Auth 
            response = self.supabase.auth.sign_in_with_password({
                "email": data.email, 
                "password": data.password 
            })

            user_id = response.user.id 
            access_token = response.session.access_token 
            refresh_token = response.session.refresh_token 

            # lấy role từ DB 
            query = text("SELECT role FROM profiles WHERE id = :user_id AND deleted_at IS NULL") 
            result = await self.db.execute(query, {"user_id": user_id}) 
            row = result.fetchone()
            role = row[0] if row else "user" 

            logger.info(f"Login successful for user: {user_id}")
            return LoginResult(
                response=LoginResponse(
                    access_token=access_token,
                    token_type="bearer",
                    user=UserBrief(
                        id=user_id,
                        role=role
                    )
                ),
                refresh_token=refresh_token,
            )
        except Exception as e: 
            logger.warning(f"Login failed for {data.email}")
            raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
        
    async def refresh_session(self, refresh_token: str) -> LoginResult:
        try:
            response = self.supabase.auth.refresh_session(refresh_token)

            if not response.session or not response.user:
                raise HTTPException(status_code=401, detail="Invalid session")

            user_id = response.user.id
            access_token = response.session.access_token
            new_refresh_token = response.session.refresh_token

            query = text("SELECT role FROM profiles WHERE id = :user_id AND deleted_at IS NULL")
            result = await self.db.execute(query, {"user_id": user_id})
            row = result.fetchone()
            role = row[0] if row else "user"

            logger.info(f"Session refreshed for user: {user_id}")
            return LoginResult(
                response=LoginResponse(
                    access_token=access_token,
                    token_type="bearer",
                    user=UserBrief(
                        id=user_id,
                        role=role,
                    )
                ),
                refresh_token=new_refresh_token,
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Refresh session failed: {e}")
            raise HTTPException(status_code=401, detail="Session expired")

    async def request_password_reset(self, data: PasswordResetRequest) -> MessageResponse:
        try:
            self.supabase.auth.reset_password_for_email(data.email)
            logger.info(f"Password reset email requested for: {data.email}")
            return MessageResponse(
                message="Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu."
            )
        except Exception as e:
            logger.error(f"Password reset request failed for {data.email}: {e}")
            raise HTTPException(status_code=400, detail="Không thể gửi email đặt lại mật khẩu.")

    async def register(self, data: RegisterRequest) -> MessageResponse:
        try: 
            response = self.supabase.auth.sign_up({
                "email": data.email, 
                "password": data.password 
            })

            user_id = response.user.id 

            query = text("""
                INSERT INTO profiles (id, full_name, role, gender, date_of_birth, phone_encrypted)
                VALUES (:id, :full_name, :role, :gender, :date_of_birth, pgp_sym_encrypt(:phone, current_setting('app.encryption_key')))
                """)
            await self.db.execute(query, {
                "id": user_id, 
                "full_name": data.full_name, 
                "role": "user",
                "gender": data.gender,
                "date_of_birth": data.date_of_birth,
                "phone": data.phone_number
            })
            await self.db.flush() 

            logger.info(f"User registered: {user_id}")
            return MessageResponse(message="Đăng ký thành công. Vui lòng đăng nhập.")

        except Exception as e: 
            await self.db.rollback()
            if 'user_id' in locals():
                try:
                    from supabase import create_client
                    from app.core.config import settings
                    admin_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
                    admin_client.auth.admin.delete_user(user_id)
                    logger.info(f"Rollback Supabase Auth: Deleted user {user_id} due to DB registration error")
                except Exception as rollback_err:
                    logger.error(f"Failed to rollback Supabase Auth user {user_id}: {rollback_err}")
            logger.error(f"Register failed: {e}")
            raise HTTPException(status_code=400, detail=f"Đăng ký thất bại: {str(e)}")

    async def register_doctor(
        self, data: RegisterDoctorRequest, certificate_url: str
    ) -> RegisterDoctorResponse:
        try:
            # 1. Tạo tài khoản trên Supabase Auth
            response = self.supabase.auth.sign_up({
                "email": data.email,
                "password": data.password,
            })
            user_id = response.user.id

            # 2. Lưu profile (role = doctor, mã hóa cccd)
            profile_query = text("""
                INSERT INTO profiles (id, full_name, date_of_birth, phone_encrypted, cccd_encrypted, gender, role)
                VALUES (
                    :id, :full_name, :dob,
                    pgp_sym_encrypt(:phone, current_setting('app.encryption_key')),
                    pgp_sym_encrypt(:cccd, current_setting('app.encryption_key')),
                    :gender,
                    'doctor'
                )
            """)
            await self.db.execute(profile_query, {
                "id": user_id,
                "full_name": data.full_name,
                "dob": data.date_of_birth,
                "phone": data.phone_number,
                "cccd": data.cccd,
                "gender": data.gender,
            })

            # 3. Lưu thông tin bác sĩ
            doctor_query = text("""
                INSERT INTO doctors (id, email, specialty, license_number, hospital, certificate_url, verification_status)
                VALUES (:id, :email, :specialty, :license_number, :hospital, :cert_url, 'pending_verification')
            """)
            await self.db.execute(doctor_query, {
                "id": user_id,
                "email": data.email,
                "specialty": data.specialty,
                "license_number": data.license_number,
                "hospital": data.hospital,
                "cert_url": certificate_url,
            })
            await self.db.flush()

            logger.info(f"Doctor registered (pending): {user_id}")
            return RegisterDoctorResponse(
                id=user_id,
                full_name=data.full_name,
                status="pending_verification",
                certificate_url=certificate_url
            )

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            if 'user_id' in locals():
                try:
                    from supabase import create_client
                    from app.core.config import settings
                    admin_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
                    admin_client.auth.admin.delete_user(user_id)
                    logger.info(f"Rollback Supabase Auth: Deleted doctor user {user_id} due to DB registration error")
                except Exception as rollback_err:
                    logger.error(f"Failed to rollback Supabase Auth doctor user {user_id}: {rollback_err}")
            logger.error(f"Register doctor failed: {e}")
            error_str = str(e)
            if "doctors_license_number_key" in error_str or "license_number" in error_str:
                raise HTTPException(status_code=400, detail="Số giấy phép hành nghề này đã được đăng ký. Vui lòng kiểm tra lại.")
            if "profiles_pkey" in error_str or "duplicate key" in error_str:
                raise HTTPException(status_code=400, detail="Email này đã được đăng ký. Vui lòng sử dụng email khác.")
            raise HTTPException(status_code=400, detail="Đăng ký bác sĩ thất bại. Vui lòng kiểm tra lại thông tin.")

    async def log_out(self) -> MessageResponse:
        try: 
            self.supabase.auth.sign_out() 
            logger.info(f"User logged out successfully")
            return MessageResponse(message="Đã đăng xuất thành công.")
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

    async def forgot_password(self, email: str, redirect_url: str) -> MessageResponse:
        try:
            self.supabase.auth.reset_password_for_email(email, {"redirect_to": redirect_url})
            logger.info(f"Password reset email sent to: {email} with redirect: {redirect_url}")
            return MessageResponse(message="Email khôi phục mật khẩu đã được gửi.")
        except Exception as e:
            logger.error(f"Forgot password failed for {email}: {e}")
            raise HTTPException(status_code=400, detail="Không thể gửi email khôi phục mật khẩu.")

    async def change_password(self, user_id: str, current_password: str, new_password: str) -> MessageResponse:
        try:
            # Verify current password
            is_valid = self.supabase.rpc("verify_user_password", {
                "target_user_id": user_id,
                "plain_password": current_password
            }).execute()
            
            if not is_valid.data:
                raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác.")
                
            # Update password via service role client
            from supabase import create_client
            from app.core.config import settings
            admin_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            admin_client.auth.admin.update_user_by_id(user_id, {"password": new_password})
            
            logger.info(f"Password changed successfully for user: {user_id}")
            return MessageResponse(message="Đổi mật khẩu thành công.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Change password failed: {e}")
            raise HTTPException(status_code=400, detail="Không thể đổi mật khẩu.")

    async def reset_password(self, user_id: str, new_password: str) -> MessageResponse:
        try:
            from supabase import create_client
            from app.core.config import settings
            admin_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            admin_client.auth.admin.update_user_by_id(user_id, {"password": new_password})
            
            logger.info(f"Password reset successfully for user: {user_id}")
            return MessageResponse(message="Đặt lại mật khẩu thành công.")
        except Exception as e:
            logger.error(f"Reset password failed: {e}")
            raise HTTPException(status_code=400, detail="Không thể đặt lại mật khẩu.")

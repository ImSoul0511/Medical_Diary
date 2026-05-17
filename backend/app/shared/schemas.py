from typing import Generic, TypeVar, List 
from pydantic import BaseModel

# Khai báo Generic Type cho việc phân trang
T = TypeVar('T')

class ErrorResponse(BaseModel):
    """Format chuẩn cho các lỗi trả về từ API"""
    error_code: str
    message: str
    request_id: str

class PaginatedResponse(BaseModel, Generic[T]):
    """Format chuẩn cho danh sách, dữ liệu được phân trang
    - items: List[T]: Danh sách các bản ghi của trang hiện tại.
    - total: int: Tổng số bản ghi có trong cơ sở dữ liệu (không phải số lượng trong trang này).
    - page: int: Số thứ tự trang hiện tại mà người dùng đang xem.
    - limit: int: Số lượng bản ghi tối đa trên một trang.
    """
    items: List[T]
    total: int
    page: int
    limit: int 
    
class MessageResponse(BaseModel):
    """Format chuẩn cho các response trả về tin nhắn (thành công)"""
    message: str
    
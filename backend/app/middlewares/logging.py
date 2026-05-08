import uuid 
from time import time 
import logging 
from fastapi import Request 
from typing import Callable 
from starlette.middleware.base import BaseMiddleware 

# Cấu hình logger 
logger = logging.getLogger("medical_diary")

class LoggingMiddleware(BaseMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        # tạo request_id
        request_id = uuid.uuid4().hex[:8]
        request.state.request_id = request_id 

        # ghi log request đến
        logger.info(
            f"[{request_id}] -> {request.method} {request.url.path}"
        )
        
        # đo thời gian xử lý
        start_time = time()
        response = await call_next(request)
        duration = round((time() - start_time) * 1000, 2)
        
        # ghi log response đi 
        logger.info(
            f"[{request_id}] <- {response.status_code} ({duration}ms)"
        )

        # thêm request_id vào header trả về
        response.headers["X-Request-ID"] = request_id

        return response 
        

        
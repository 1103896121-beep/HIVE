from fastapi import APIRouter
from . import user, focus, social

router = APIRouter()
router.include_router(user.router)
router.include_router(focus.router)
router.include_router(social.router)

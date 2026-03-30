from fastapi import APIRouter
from . import user, focus, social, presence, subscription, auth

router = APIRouter()
router.include_router(user.router)
router.include_router(focus.router)
router.include_router(social.router)
router.include_router(presence.router)
router.include_router(subscription.router)
router.include_router(auth.router)

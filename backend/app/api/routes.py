from fastapi import APIRouter
from app.services import stripe_service, huggingface_service

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.post("/predict")
async def predict(input_text: str):
    prediction = huggingface_service.predict(input_text)
    return {"prediction": prediction}

@router.post("/create-checkout-session")
async def create_checkout_session():
    session_url = stripe_service.create_checkout_session()
    return {"checkout_url": session_url}

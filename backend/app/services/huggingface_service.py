import requests
from app.core.config import settings

API_URL = "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english"

headers = {"Authorization": f"Bearer {settings.HUGGINGFACE_TOKEN}"}

def predict(text: str):
    response = requests.post(API_URL, headers=headers, json={"inputs": text})
    response.raise_for_status()
    output = response.json()
    return output

import stripe
from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

def create_checkout_session():
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        mode='subscription',
        line_items=[{
            'price': 'price_XXXXXX',  # replace with your price id
            'quantity': 1,
        }],
        success_url='https://your-frontend-domain.com/success',
        cancel_url='https://your-frontend-domain.com/cancel',
    )
    return session.url

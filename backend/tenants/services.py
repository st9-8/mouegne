# apps/tenants/services.py
from django.db import transaction, IntegrityError
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from .models import Merchant, Shop, Employee, RoleChoices

User = get_user_model()


@transaction.atomic
def create_shop(*, merchant, name, address=None, email=None, phone_number=None, currency="XAF"):
    base_slug = slugify(name)
    slug = base_slug
    counter = 1
    while Shop.objects.filter(slug=slug).exists():
        counter += 1
        slug = f"{base_slug}-{counter}"

    shop = Shop.objects.create(
        owner=merchant,
        name=name,
        slug=slug,
        address=address,
        phone_number=phone_number,
        currency=currency,
    )
    Employee.objects.create(user=merchant.user, shop=shop, role=RoleChoices.OWNER)
    return shop


@transaction.atomic
def register_merchant(*, username, password, company_name, phone_number=None, shop_name):
    if User.objects.filter(username=username).exists():
        raise ValueError("Ce nom d'utilisateur est déjà pris.")

    user = User.objects.create_user(username=username, password=password)
    merchant = Merchant.objects.create(user=user, company_name=company_name, phone_number=phone_number)
    shop = create_shop(merchant=merchant, name=shop_name)

    return user, merchant, shop


@transaction.atomic
def add_employee(*, shop, username, password, role):
    if User.objects.filter(username=username).exists():
        raise ValueError(f"Le nom d'utilisateur « {username} » est déjà pris.")

    try:
        user = User.objects.create_user(username=username, password=password)
    except IntegrityError:
        # Garde contre une race condition entre le check et la création.
        raise ValueError(f"Le nom d'utilisateur « {username} » est déjà pris.")

    return Employee.objects.create(user=user, shop=shop, role=role)

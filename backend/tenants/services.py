import re

from django.utils.text import slugify
from django.db import transaction, IntegrityError
from django.contrib.auth import get_user_model

from tenants.models import Merchant, Shop, Employee, RoleChoices

User = get_user_model()

LEGAL_SUFFIXES = {"SARL", "SA", "SAS", "SASU", "EURL", "LTD", "LLC", "INC", "PLC", "GMBH", "CORP"}


def generate_shop_code(name, exclude_shop_id=None):
    words = [w for w in name.split() if w.upper() not in LEGAL_SUFFIXES]

    if len(words) >= 2:
        base = (words[0][0] + words[1][0]).upper()
    elif words:
        word = words[0]
        capitals = re.findall(r"[A-Z]", word)
        base = "".join(capitals[:2]).upper() if len(capitals) >= 2 else word[:2].upper()
    else:
        base = "SH"

    def is_taken(code):
        qs = Shop.objects.filter(code=code)
        if exclude_shop_id:
            qs = qs.exclude(pk=exclude_shop_id)
        return qs.exists()

    code = base
    suffix = 1
    while is_taken(code):
        suffix += 1
        code = f"{base}{suffix}"
    return code

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
        code=generate_shop_code(name),
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

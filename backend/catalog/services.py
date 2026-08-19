from django.db import transaction

from catalog.models import Item
from catalog.models import Category


DEFAULT_CATEGORY_NAME = "Divers"


def get_or_create_default_category(*, merchant):
    category, _ = Category.objects.get_or_create(merchant=merchant, name=DEFAULT_CATEGORY_NAME)
    return category


@transaction.atomic
def quick_create_item(*, shop, name, price, quantity=1):
    """
        Création rapide depuis l'écran de vente — accessible à tout membre de la
        boutique, y compris CASHIER. Pas de choix de catégorie (assignée
        automatiquement) ni de fournisseur, pour rester dans l'esprit
        "vente en 15 secondes".
    """
    category = get_or_create_default_category(merchant=shop.owner)
    return Item.objects.create(
        shop=shop,
        category=category,
        name=name,
        price=price,
        purchase_price=price,
        quantity=quantity,
    )


@transaction.atomic
def create_item(*, shop, category, vendor=None, **fields):
    if category.merchant_id != shop.owner_id:
        raise ValueError("Cette catégorie n'appartient pas à votre commerce.")
    if vendor and vendor.merchant_id != shop.owner_id:
        raise ValueError("Ce fournisseur n'appartient pas à votre commerce.")

    return Item.objects.create(shop=shop, category=category, vendor=vendor, **fields)

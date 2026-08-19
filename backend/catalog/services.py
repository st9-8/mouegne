from django.db import transaction

from catalog.models import Item


@transaction.atomic
def create_item(*, shop, category, vendor=None, **fields):
    if category.merchant_id != shop.owner_id:
        raise ValueError("Cette catégorie n'appartient pas à votre commerce.")
    if vendor and vendor.merchant_id != shop.owner_id:
        raise ValueError("Ce fournisseur n'appartient pas à votre commerce.")

    return Item.objects.create(shop=shop, category=category, vendor=vendor, **fields)

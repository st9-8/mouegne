from django.db import models
from django.db import transaction

from inventory.models import Purchase


@transaction.atomic
def receive_purchase(*, shop, item, vendor, quantity, price, description=''):
    if item.shop_id != shop.id:
        raise ValueError("Cet article n'appartient pas à cette boutique.")

    if vendor and vendor.merchant != shop.owner:
        raise ValueError("Ce fournisseur ne fait pas partie des fournisseurs de cette boutique.")

    purchase = Purchase(
        shop=shop,
        item=item,
        vendor=vendor,
        quantity=quantity,
        price=price,
        description=description,
    )

    item.quantity = models.F('quantity') + quantity
    item.save(update_fields=['quantity'])
    item.refresh_from_db(fields=['quantity'])

    return purchase


@transaction.atomic
def reverse_purchase(purchase: Purchase):
    item = purchase.item
    item.quantity = models.F('quantity') - purchase.quantity
    item.save(update_fields=['quantity'])
    purchase.delete()
    
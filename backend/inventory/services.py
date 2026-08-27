from django.db import models
from django.db.models import Max
from django.db import transaction

from tenants.models import Shop

from inventory.models import Purchase, PurchaseBatch, Vendor

from catalog.models import Item


@transaction.atomic
def receive_purchase_batch(*, shop, employee, description, items_data):
    """
        items_data: [{"item_id": ..., "vendor_id": ... ou None, "quantity": ..., "price": ...}, ...]
        Crée un PurchaseBatch + une ligne Purchase par article, atomiquement.
    """
    locked_shop = Shop.objects.select_for_update().get(pk=shop.pk)

    last_reference = PurchaseBatch.objects.filter(shop=locked_shop).aggregate(
        Max("reference_number")
    )["reference_number__max"] or 0

    batch = PurchaseBatch.objects.create(
        shop=shop,
        employee=employee,
        description=description,
        reference_number=last_reference + 1,
    )

    for entry in items_data:
        try:
            item = Item.objects.select_for_update().get(id=entry["item_id"], shop=shop)
        except Item.DoesNotExist:
            raise ValueError("Un des articles sélectionnés n'existe pas dans cette boutique.")

        vendor = None
        if entry.get("vendor_id"):
            try:
                vendor = Vendor.objects.get(id=entry["vendor_id"])
            except Vendor.DoesNotExist:
                raise ValueError("Un des fournisseurs sélectionnés n'existe pas.")
            if vendor.merchant_id != shop.owner_id:
                raise ValueError(f"Le fournisseur sélectionné pour « {item.name} » n'appartient pas à ce commerce.")

        quantity = entry["quantity"]
        price = entry["price"]

        Purchase.objects.create(
            shop=shop, batch=batch, item=item, vendor=vendor,
            quantity=quantity, price=price, total_value=price * quantity,
        )

        item.quantity = models.F("quantity") + quantity
        item.save(update_fields=["quantity"])

    return batch


@transaction.atomic
def receive_purchase(*, shop, item, vendor, quantity, price, description=''):
    if item.shop_id != shop.id:
        raise ValueError("Cet article n'appartient pas à cette boutique.")

    if vendor and vendor.merchant != shop.owner:
        raise ValueError("Ce fournisseur ne fait pas partie des fournisseurs de cette boutique.")

    purchase = Purchase.objects.create(
        shop=shop,
        item=item,
        vendor=vendor,
        quantity=quantity,
        price=price,
        total_value=price * quantity,
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

from django.db import transaction, models

from catalog.models import Item

from sales.models import Sale, SaleDetail


@transaction.atomic
def create_sale(*, shop, customer, employee, items_data, payment_data, allow_zero_stock=False):
    if customer and customer.merchant_id != shop.owner_id:
        raise ValueError("Ce client n'appartient pas au commerçant de cette boutique.")

    # Cohérence des montants — règle métier, donc centralisée ici plutôt qu'en serializer.
    total_mobile_money = payment_data.get("total_mobile_money", 0)
    cash_payment_amount = payment_data.get("cash_payment_amount", 0)
    amount_paid = payment_data["amount_paid"]

    if round(total_mobile_money + cash_payment_amount, 2) != round(amount_paid, 2):
        raise ValueError("La somme Mobile Money + Espèces ne correspond pas au montant payé.")
    if amount_paid < payment_data["grand_total"]:
        raise ValueError("Le montant payé doit être supérieur ou égal au total général.")

    sale = Sale.objects.create(shop=shop, customer=customer, employee=employee, **payment_data)

    for entry in items_data:
        item = Item.objects.select_for_update().get(id=entry["item_id"], shop=shop)

        if not allow_zero_stock and item.quantity < entry["quantity"]:
            raise ValueError(f"Quantité en stock insuffisante pour: {item.name}")

        SaleDetail.objects.create(
            shop=shop,
            sale=sale,
            item=item,
            price=entry["price"],
            quantity=entry["quantity"],
            total_detail=entry["total_item"],
        )

        item.quantity = models.F("quantity") - entry["quantity"]
        item.save(update_fields=["quantity"])

    return sale

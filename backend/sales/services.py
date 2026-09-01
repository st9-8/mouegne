from django.db import transaction, models

from catalog.models import Item

from sales.models import Sale, SaleDetail

from tenants.models import Shop


@transaction.atomic
def create_sale(*, shop, customer, employee, items_data, payment_data, allow_zero_stock=False):
    # Verrouille la boutique pour éviter que deux ventes concurrentes reçoivent
    # le même numéro de référence.
    locked_shop = Shop.objects.select_for_update().get(pk=shop.pk)

    if customer and customer.merchant_id != shop.owner_id:
        raise ValueError("Ce client n'appartient pas au commerçant de cette boutique.")

    if customer:
        payment_data = {**payment_data, "customer_name_override": ""}

    total_mobile_money = payment_data.get("total_mobile_money", 0)
    cash_payment_amount = payment_data.get("cash_payment_amount", 0)
    amount_paid = payment_data["amount_paid"]

    if round(total_mobile_money + cash_payment_amount, 2) != round(amount_paid, 2):
        raise ValueError("La somme Mobile Money + Espèces ne correspond pas au montant payé.")
    if amount_paid < payment_data["grand_total"]:
        raise ValueError("Le montant payé doit être supérieur ou égal au total général.")

    last_reference = Sale.objects.filter(shop=locked_shop).aggregate(models.Max("reference_number"))[
                         "reference_number__max"] or 0

    sale = Sale.objects.create(
        shop=shop, customer=customer, employee=employee,
        reference_number=last_reference + 1,
        **payment_data,
    )

    for entry in items_data:
        item = Item.objects.select_for_update().get(id=entry["item_id"], shop=shop)
        if not allow_zero_stock and item.quantity < entry["quantity"]:
            raise ValueError(f"Quantité en stock insuffisante pour: {item.name}")

        SaleDetail.objects.create(
            shop=shop, sale=sale, item=item,
            price=entry["price"], cost_price=item.purchase_price, quantity=entry["quantity"],
            total_detail=entry["total_item"],
        )
        item.quantity = models.F("quantity") - entry["quantity"]
        item.save(update_fields=["quantity"])

    return sale

from django.db import models
from django.db import transaction

from inventory.models import Item

from sales.models import Sale
from sales.models import SaleDetail


@transaction.atomic
def create_sale(*, shop, customer, employee, items_data, payment_data, allow_zero_stock=False):
    """
        items_data: [{"item_id": ..., "price": ..., "quantity": ..., "total_item": ...}, ...]
        payment_data: sub_total, grand_total, tax_amount, tax_percentage, amount_paid,
                  amount_change, total_mobile_money, cash_payment_amount, mobile_money_covers_total
    """

    if customer and customer.merchant != shop.merchant:
        raise ValueError("Ce n'est pas un client de la boutique")

    sale = Sale.objects.create(
        shop=shop,
        customer=customer,
        employee=employee,
        **payment_data
    )

    for entry in items_data:
        item = Item.objects.select_for_update().get(id=entry['item_id'], shop=shop)

        if not allow_zero_stock and item.quantity == 0:
            raise ValueError(f'Le stock du produit <{item.name}> est épuisé.')

        SaleDetail.objects.create(
            shop=shop,
            sale=sale,
            item=item,
            price=entry['price'],
            quantity=entry['quantity'],
            total_detail=entry['total_item'],
        )

        item.quantity = models.F('quantity') - entry['quantity']
        item.save(update_fields=['quantity'])

    return sale

from django.core.management.base import BaseCommand
from django.db import transaction
from sales.models import SaleDetail


class Command(BaseCommand):
    help = "Renseigne cost_price=0 existants avec le prix d'achat actuel de l'article (approximatif)."

    def handle(self, *args, **options):
        updated = 0
        with transaction.atomic():
            for detail in SaleDetail.objects.filter(cost_price=0).select_related("item"):
                if detail.item:
                    detail.cost_price = detail.item.purchase_price
                    detail.save(update_fields=["cost_price"])
                    updated += 1
        self.stdout.write(self.style.SUCCESS(f"{updated} ligne(s) mise(s) à jour."))

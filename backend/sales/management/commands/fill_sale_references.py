from django.db import transaction
from django.core.management.base import BaseCommand

from tenants.models import Shop

from sales.models import Sale


class Command(BaseCommand):
    help = "Attribue un reference_number séquentiel (par boutique, dans l'ordre chronologique) aux ventes existantes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Renumérote TOUTES les ventes depuis 1, y compris celles qui ont déjà un reference_number.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        total_updated = 0

        with transaction.atomic():
            for shop in Shop.objects.all().order_by("created_at"):
                if force:
                    sales = list(Sale.objects.filter(shop=shop).order_by("created_at"))
                    next_number = 1
                else:
                    sales = list(Sale.objects.filter(shop=shop, reference_number__isnull=True).order_by("created_at"))
                    last_number = (
                                      Sale.objects.filter(shop=shop, reference_number__isnull=False)
                                      .order_by("-reference_number")
                                      .values_list("reference_number", flat=True)
                                      .first()
                                  ) or 0
                    next_number = last_number + 1

                if not sales:
                    continue

                for sale in sales:
                    sale.reference_number = next_number
                    sale.save(update_fields=["reference_number"])
                    next_number += 1

                self.stdout.write(f"  {shop.name} ({shop.code or '?'}): {len(sales)} vente(s) numérotée(s)")
                total_updated += len(sales)

        self.stdout.write(self.style.SUCCESS(f"{total_updated} vente(s) mise(s) à jour au total."))

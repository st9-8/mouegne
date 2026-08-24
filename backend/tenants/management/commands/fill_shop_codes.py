from django.core.management.base import BaseCommand
from django.db import transaction
from tenants.models import Shop
from tenants.services import generate_shop_code


class Command(BaseCommand):
    help = "Génère un code (préfixe de ticket, ex: VS) pour les boutiques qui n'en ont pas encore."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Régénère aussi le code des boutiques qui en ont déjà un.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        queryset = Shop.objects.all() if force else Shop.objects.filter(code__isnull=True) | Shop.objects.filter(
            code="")

        updated = 0
        with transaction.atomic():
            for shop in queryset.order_by("created_at"):
                code = generate_shop_code(shop.name, exclude_shop_id=shop.pk)
                shop.code = code
                shop.save(update_fields=["code"])
                updated += 1
                self.stdout.write(f"  {shop.name} -> {code}")

        self.stdout.write(self.style.SUCCESS(f"{updated} boutique(s) mise(s) à jour."))

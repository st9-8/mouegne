from django.dispatch import receiver
from django.db.models.signals import post_save

from tenants.models import Shop, ShopSettings


@receiver(post_save, sender=Shop)
def create_shop_settings(sender, instance, created, **kwargs):
    if created:
        ShopSettings.objects.create(user=instance)

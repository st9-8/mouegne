from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import ItemImage


@receiver(post_delete, sender=ItemImage)
def delete_item_image_files(sender, instance, **kwargs):
    if not instance.image:
        return
    storage = instance.image.storage
    names = [instance.image.name, instance.thumbnail.name]

    def _purge():
        for name in names:
            if name:
                storage.delete(name)

    transaction.on_commit(_purge)

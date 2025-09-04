from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Purchase


@receiver(post_save, sender=Purchase)
def update_item_quantity(sender, instance, created, **kwargs):
    """
    Increment item.quantity when a new purchase is created.
    Since all purchases are now created with delivery_status='S' (Livré),
    we always increment the item quantity on creation.
    """
    if created:
        # Increment the item quantity
        instance.item.quantity += instance.quantity
        instance.item.save()

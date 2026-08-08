from django.db.models.signals import post_save, pre_delete
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


@receiver(pre_delete, sender=Purchase)
def reduce_item_quantity_on_delete(sender, instance, **kwargs):
    """
    Reduce item.quantity when a purchase is deleted.
    This ensures inventory is properly adjusted when purchases are removed.
    """
    # Reduce the item quantity by the purchase quantity
    item = instance.item
    item.quantity -= instance.quantity
    item.save()

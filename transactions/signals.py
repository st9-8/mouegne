from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Purchase

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Purchase


@receiver(pre_save, sender=Purchase)
def _cache_old_delivery_status(sender, instance, **kwargs):
    """
    Before saving, stash the old delivery_status on the instance
    so post_save can see if it changed.
    """
    if not instance._state.adding:
        # instance already exists, fetch its old status
        old = sender.objects.get(pk=instance.pk)
        instance._old_delivery_status = old.delivery_status
    else:
        # brand new, no old status
        instance._old_delivery_status = None


@receiver(post_save, sender=Purchase)
def update_item_quantity(sender, instance, created, **kwargs):
    """
    Increment item.quantity only when:
      - created AND delivery_status=='S'
      - OR updated AND old_status=='P' AND new_status=='S'
    """
    new = instance.delivery_status
    old = getattr(instance, '_old_delivery_status', None)

    # case 1: brand-new purchase delivered immediately
    if created and new == 'S':
        instance.item.quantity += instance.quantity
        instance.item.save()

    # case 2: status changed from Pending to Shipped
    elif not created and old == 'P' and new == 'S':
        instance.item.quantity += instance.quantity
        instance.item.save()

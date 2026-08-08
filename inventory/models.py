from django.db import models

from django_extensions.db.fields import AutoSlugField
from phonenumber_field.modelfields import PhoneNumberField

from core.models import MerchantScopedModel, ShopScopedModel

from catalog.models import Item


class Vendor(MerchantScopedModel):
    """
    Represents a vendor with contact and address information.
    """
    name = models.CharField(max_length=50, verbose_name='Name')
    slug = AutoSlugField(unique=True, populate_from='name', verbose_name='Slug')
    phone_number = PhoneNumberField(blank=True, null=True, verbose_name='Phone Number')
    address = models.CharField(max_length=50, blank=True, null=True, verbose_name='Address')

    def __str__(self):
        return self.name


class Purchase(ShopScopedModel):
    """
        Stock purchase
    """

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='purchases')
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, blank=True, null=True, related_name="purchases")
    description = models.TextField(max_length=300, blank=True, null=True)
    quantity = models.PositiveIntegerField(default=0, verbose_name='Quantité')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.0, verbose_name="Prix d'achat (FCFA)", )
    total_value = models.DecimalField(max_digits=10, decimal_places=2)
    order_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.item.name} x {self.quantity} <- {self.vendor.name}'

    class Meta:
        ordering = ['-order_date']

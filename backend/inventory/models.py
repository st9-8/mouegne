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


class PurchaseBatch(ShopScopedModel):
    """
        Regroupe plusieurs Purchase reçues en une seule fois (un "bon de réception").
    """
    reference_number = models.PositiveIntegerField(editable=False)
    employee = models.ForeignKey("tenants.Employee", on_delete=models.SET_NULL, blank=True, null=True,
                                 related_name="purchase_batches")
    description = models.TextField(max_length=300, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["shop", "reference_number"],
                                    name="unique_purchase_batch_reference_per_shop")
        ]

    @property
    def reference(self):
        return f"{self.shop.code}-R{self.reference_number:08d}"

    @property
    def total_value(self):
        return sum((p.total_value for p in self.purchases.all()), start=0)

    def __str__(self):
        return self.reference


class Purchase(ShopScopedModel):
    batch = models.ForeignKey(PurchaseBatch, on_delete=models.CASCADE, related_name="purchases", null=True, blank=True)
    item = models.ForeignKey("catalog.Item", on_delete=models.CASCADE, related_name="purchases")
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name="purchases")
    description = models.TextField(max_length=300, blank=True)
    quantity = models.PositiveIntegerField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_value = models.DecimalField(max_digits=10, decimal_places=2, editable=False, default=0)

    class Meta:
        db_table = "purchases"
        ordering = ["-created_at"]

    def __str__(self):
        vendor_name = self.vendor.name if self.vendor else "N/A"
        return f"{self.item.name} x {self.quantity} <- {vendor_name}"

from django.db import models

from phonenumber_field.modelfields import PhoneNumberField

from core.models import ShopScopedModel, BaseModel
from core.models import MerchantScopedModel

from catalog.models import Item

from tenants.models import Employee


class Customer(MerchantScopedModel):
    first_name = models.CharField(max_length=256)
    last_name = models.CharField(max_length=256, blank=True, null=True)
    address = models.TextField(max_length=256, blank=True, null=True)
    email = models.EmailField(max_length=256, blank=True, null=True)
    phone = PhoneNumberField(max_length=30, blank=True, null=True)
    loyalty_points = models.IntegerField(default=0)

    class Meta:
        db_table = 'Customers'

        constraints = [
            models.UniqueConstraint(fields=['merchant', 'phone'], name='unique_customer_phone_per_merchant'),
        ]

    def __str__(self) -> str:
        return f"{self.first_name or ''} {self.last_name or ''}"

    def get_full_name(self):
        return f"{self.first_name or ''} {self.last_name or ''}"

    def to_select2(self):
        item = {
            "label": self.get_full_name(),
            "value": self.id
        }
        return item


class Sale(ShopScopedModel):
    """
        Represents a sale transaction involving a customer.
    """

    reference_number = models.PositiveIntegerField(editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, blank=True, null=True)
    customer_name_override = models.CharField(max_length=255, blank=True, null=True)
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, blank=True, null=True, related_name="sales")

    sub_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    grand_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    tax_percentage = models.FloatField(default=0.0)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    amount_change = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    total_mobile_money = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    cash_payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    mobile_money_covers_total = models.BooleanField(default=False)
    has_sav = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Sale"
        verbose_name_plural = "Sales"
        constraints = [
            models.UniqueConstraint(fields=["shop", "reference_number"], name="unique_sale_reference_per_shop")
        ]

    @property
    def reference(self):
        return f"{self.shop.code}-{self.reference_number:010d}"

    def sum_products(self):
        return sum(d.quantity for d in self.saledetail_set.all())

    def __str__(self):
        return (
            f"Sale ID: {self.id} | "
            f"Grand Total: {self.grand_total} | "
            f"Date: {self.created_at}"
        )


class SaleDetail(ShopScopedModel):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="saledetail_set")
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                     help_text="Cost price at the time of sale")  # The idea of this field is to avoid error in benefit calculation in case of purchase price changes
    quantity = models.PositiveIntegerField()
    total_detail = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "sale_details"
        verbose_name = "Sale Detail"
        verbose_name_plural = "Sale Details"

    def __str__(self):
        return f"Detail ID: {self.id} | Sale ID: {self.sale.id} | Quantity: {self.quantity}"

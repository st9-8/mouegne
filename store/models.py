"""
Module: models.py

Contains Django models for handling categories, items, and deliveries.

This module defines the following classes:
- Category: Represents a category for items.
- Item: Represents an item in the inventory.
- Delivery: Represents a delivery of an item to a customer.

Each class provides specific fields and methods for handling related data.
"""

from django.db import models
from django.urls import reverse
from django.forms import model_to_dict
from django_extensions.db.fields import AutoSlugField
from phonenumber_field.modelfields import PhoneNumberField
from accounts.models import Vendor


class Category(models.Model):
    """
    Represents a category for items.
    """
    name = models.CharField(max_length=50)
    slug = AutoSlugField(unique=True, populate_from='name')

    def __str__(self):
        """
        String representation of the category.
        """
        return f"Category: {self.name}"

    class Meta:
        verbose_name_plural = 'Categories'


class Item(models.Model):
    """
        Represents an item in the inventory.
    """
    slug = AutoSlugField(unique=True, populate_from='name')
    name = models.CharField(max_length=50)
    description = models.TextField(max_length=256)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=0)
    price = models.FloatField(default=0)
    purchase_price = models.FloatField(default=0)
    expiring_date = models.DateTimeField(null=True, blank=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """
        String representation of the item.
        """
        return self.name

    def get_absolute_url(self):
        """
            Returns the absolute URL for an item detail view.
        """
        return reverse('item-detail', kwargs={'slug': self.slug})

    def to_json(self):
        product = model_to_dict(self)
        product['id'] = self.id
        product['text'] = self.name
        product['category'] = self.category.name
        product['quantity'] = 1
        product['total_product'] = 0
        return product

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Items'


class Delivery(models.Model):
    """
    Represents a delivery to a customer with multiple items.
    """
    DELIVERY_STATUS_CHOICES = [
        ('NOT_DELIVERED', 'Not Delivered'),
        ('DELIVERED', 'Delivered'),
    ]
    
    date_added = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Delivery Creation Date"
    )
    customer_name = models.CharField(max_length=30, blank=True, null=True)
    phone_number = PhoneNumberField(blank=True, null=True)
    location = models.CharField(max_length=50, blank=True, null=True)
    delivery_date = models.DateTimeField(verbose_name="Expected Delivery Date")
    status = models.CharField(
        max_length=15,
        choices=DELIVERY_STATUS_CHOICES,
        default='NOT_DELIVERED',
        verbose_name='Delivery Status'
    )
    sub_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.0
    )
    grand_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.0
    )
    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.0
    )
    tax_percentage = models.FloatField(default=0.0)
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.0
    )
    amount_change = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.0
    )

    class Meta:
        db_table = "deliveries"
        verbose_name = "Delivery"
        verbose_name_plural = "Deliveries"
        ordering = ['-date_added']

    def __str__(self):
        """
        String representation of the delivery.
        """
        return (
            f"Delivery #{self.id} to {self.customer_name} "
            f"- Status: {self.get_status_display()}"
        )
    
    def sum_products(self):
        """
        Returns the total quantity of products in the delivery.
        """
        return sum(detail.quantity for detail in self.deliverydetail_set.all())


class DeliveryDetail(models.Model):
    """
    Represents details of a specific delivery, including item and quantity.
    """
    delivery = models.ForeignKey(
        Delivery,
        on_delete=models.CASCADE,
        db_column="delivery",
        related_name="deliverydetail_set"
    )
    item = models.ForeignKey(
        Item,
        on_delete=models.DO_NOTHING,
        db_column="item"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    quantity = models.PositiveIntegerField()
    total_detail = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "delivery_details"
        verbose_name = "Delivery Detail"
        verbose_name_plural = "Delivery Details"

    def __str__(self):
        """
        Returns a string representation of the DeliveryDetail instance.
        """
        return (
            f"Detail ID: {self.id} | "
            f"Delivery ID: {self.delivery.id} | "
            f"Item: {self.item.name} | "
            f"Quantity: {self.quantity}"
        )

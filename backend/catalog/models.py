import uuid
from core.models import MerchantScopedModel, ShopScopedModel
from imagekit.models import ImageSpecField, ProcessedImageField
from django.core.validators import MaxValueValidator, MinValueValidator
from imagekit.processors import ResizeToFill, ResizeToFit, Transpose

MAX_IMAGES_PER_ITEM = 5

"""
Module: models.py

Contains Django models for handling categories, items, and deliveries.

This module defines the following classes:
- Category: Represents a category for items.
- Item: Represents an item in the inventory.

Each class provides specific fields and methods for handling related data.
"""

from django.db import models
from django.urls import reverse
from django.forms import model_to_dict
from django_extensions.db.fields import AutoSlugField


class Category(MerchantScopedModel):
    """
        Represents a category for items.
    """
    name = models.CharField(max_length=50)
    slug = AutoSlugField(unique=True, populate_from='name')

    def __str__(self):
        return f"Category: {self.name}"

    class Meta:
        verbose_name_plural = 'Categories'
        constraints = [
            models.UniqueConstraint(fields=['name', 'merchant'], name='unique_category_name_per_merchant'),
        ]


class Item(ShopScopedModel):
    """
        Represents an item in the inventory associated to a shop
    """
    slug = AutoSlugField(unique=True, populate_from='name')
    name = models.CharField(max_length=50)
    description = models.TextField(max_length=256, blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expiring_date = models.DateTimeField(null=True, blank=True)
    vendor = models.ForeignKey('inventory.Vendor', on_delete=models.SET_NULL, null=True)
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
        product['stock_quantity'] = self.quantity
        product['quantity'] = 1
        product['total_product'] = 0

        return product

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Items'


def item_image_path(instance, filename):
    # Nom aléatoire : pas de collision ni d'énumération. Extension .webp car on convertit à l'upload.
    return f"items/{instance.shop_id}/{uuid.uuid4().hex}.webp"


class ItemImage(ShopScopedModel):
    item = models.ForeignKey("catalog.Item", on_delete=models.CASCADE, related_name="images")
    image = ProcessedImageField(
        upload_to=item_image_path,
        # Transpose() applique l'orientation EXIF : sans lui, les photos de téléphone s'affichent couchées.
        processors=[Transpose(), ResizeToFit(1200, 1200)],
        format="WEBP",
        options={"quality": 82},
    )
    thumbnail = ImageSpecField(
        source="image",
        processors=[ResizeToFill(96, 96)],
        format="WEBP",
        options={"quality": 75},
    )
    card = ImageSpecField(
        source="image",
        processors=[ResizeToFill(260, 260)],  # affiché à 130 px : 2× pour les écrans haute densité
        format="WEBP",
        options={"quality": 78},
    )

    position = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(MAX_IMAGES_PER_ITEM)],
        help_text="1 = photo d'aperçu (miniature).",
    )

    class Meta:
        db_table = "item_images"
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(fields=["item", "position"], name="unique_image_position_per_item"),
        ]

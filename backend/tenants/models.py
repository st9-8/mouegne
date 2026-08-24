from django.db import models

from django.contrib.auth import get_user_model

from core.models import BaseModel, ShopScopedModel

User = get_user_model()


class Merchant(BaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='merchant')
    company_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.company_name


class Shop(BaseModel):
    owner = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='shops')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    phone_number = models.CharField(max_length=255, blank=True, null=True)
    slug = models.SlugField(unique=True)
    code = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    currency = models.CharField(max_length=255, default='XAF')

    def __str__(self):
        return f'{self.name} - {self.owner}'


class RoleChoices(models.TextChoices):
    OWNER = 'OWNER'
    MANAGER = 'MANAGER'
    CASHIER = 'CASHIER'


class Employee(ShopScopedModel):
    """
        The same employee can have multiple role in different shop of the same merchant
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='postings')
    role = models.CharField(max_length=255, choices=RoleChoices.choices)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'shop')

    def __str__(self):
        return f'{self.user} - {self.shop} ({self.get_role_display()})'


class ShopSettings(BaseModel):
    shop = models.OneToOneField(
        'tenants.Shop', on_delete=models.CASCADE, related_name='settings'
    )
    tax_number = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='logos/')
    allow_zero_stock_sale = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.shop.name}[Settings]'

from django.contrib import admin
from django.contrib.auth.models import Group
from django.contrib.auth.admin import UserAdmin

from accounts.models import User

from sales.models import Customer

from inventory.models import Vendor

from tenants.models import ShopSettings


@admin.register(User)
class UserAdmin(UserAdmin):
    list_display = ('username', 'first_name', 'last_name', 'is_staff', 'is_superuser')
    list_fieldsets = list(UserAdmin.fieldsets)
    list_fieldsets.append(
        ('Additional infos', {'classes': ('wide',), 'fields': (
            'profile_picture', 'telephone')}))
    fieldsets = tuple(list_fieldsets)
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2'),
        }),
    )


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    fields = ('name', 'phone_number', 'address')
    list_display = ('name', 'phone_number', 'address')
    search_fields = ('name', 'phone_number', 'address')


@admin.register(ShopSettings)
class ShopSettingAdmin(admin.ModelAdmin):
    pass


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    pass


admin.site.unregister(Group)

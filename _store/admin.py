"""
Module: admin.py

Django admin configurations for managing categories, items, and deliveries.

This module defines the following admin classes:
- CategoryAdmin: Configuration for the Category model in the admin interface.
- ItemAdmin: Configuration for the Item model in the admin interface.
- DeliveryAdmin: Configuration for the Delivery model in the admin interface.
- DeliveryDetailInline: Inline configuration for DeliveryDetail in Delivery admin.
"""

from django.contrib import admin
from .models import Category, Item, Delivery, DeliveryDetail


class CategoryAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Category model.
    """
    list_display = ('name', 'slug')
    search_fields = ('name',)
    ordering = ('name',)


class ItemAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Item model.
    """
    list_display = (
        'name', 'category', 'quantity', 'price', 'purchase_price', 'vendor'
    )
    search_fields = ('name', 'category__name', 'vendor__name')
    list_filter = ('category', 'vendor')
    ordering = ('name',)


class DeliveryDetailInline(admin.TabularInline):
    """
    Inline configuration for DeliveryDetail model in Delivery admin.
    """
    model = DeliveryDetail
    extra = 0
    readonly_fields = ('total_detail',)
    fields = ('item', 'quantity', 'price', 'total_detail')


class DeliveryAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Delivery model.
    """
    list_display = (
        'id', 'customer_name', 'phone_number', 'location', 
        'delivery_date', 'status', 'grand_total', 'date_added'
    )
    search_fields = ('customer_name', 'phone_number', 'location')
    list_filter = ('status', 'delivery_date', 'date_added')
    ordering = ('-date_added',)
    readonly_fields = ('date_added',)
    inlines = [DeliveryDetailInline]
    
    fieldsets = (
        ('Information Client', {
            'fields': ('customer_name', 'phone_number', 'location', 'delivery_date')
        }),
        ('Statut', {
            'fields': ('status',)
        }),
        ('Détails Financiers', {
            'fields': ('sub_total', 'tax_percentage', 'tax_amount', 'grand_total', 'amount_paid', 'amount_change'),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('date_added',),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """
        Make financial fields readonly if delivery is already delivered.
        """
        readonly_fields = list(self.readonly_fields)
        if obj and obj.status == 'DELIVERED':
            readonly_fields.extend(['sub_total', 'tax_amount', 'grand_total', 'amount_paid', 'amount_change'])
        return readonly_fields


class DeliveryDetailAdmin(admin.ModelAdmin):
    """
    Admin configuration for the DeliveryDetail model.
    """
    list_display = ('delivery', 'item', 'quantity', 'price', 'total_detail')
    search_fields = ('delivery__customer_name', 'item__name')
    list_filter = ('delivery__status', 'delivery__date_added')
    ordering = ('-delivery__date_added',)
    readonly_fields = ('total_detail',)


admin.site.register(Category, CategoryAdmin)
admin.site.register(Item, ItemAdmin)
admin.site.register(Delivery, DeliveryAdmin)
admin.site.register(DeliveryDetail, DeliveryDetailAdmin)

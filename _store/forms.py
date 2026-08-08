from django import forms
from .models import Item, Category, Delivery, DeliveryDetail


class ItemForm(forms.ModelForm):
    """
    A form for creating or updating an Item in the inventory.
    """
    description = forms.CharField(
        required=False,
        widget=forms.Textarea(
            attrs={
                'class': 'form-control',
                'rows': 2
            }
        )
    )

    class Meta:
        model = Item
        fields = [
            'name',
            'description',
            'category',
            'quantity',
            'price',
            'purchase_price',
            'expiring_date',
            'vendor'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'category': forms.Select(attrs={'class': 'form-control'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control'}),
            'price': forms.NumberInput(
                attrs={
                    'class': 'form-control',
                    'step': '0.01'
                }
            ),
            'purchase_price': forms.NumberInput(
                attrs={
                    'class': 'form-control',
                    'step': '0.01'
                }
            ),
            'expiring_date': forms.DateTimeInput(
                attrs={
                    'class': 'form-control',
                    'type': 'datetime-local'
                }
            ),
            'vendor': forms.Select(attrs={'class': 'form-control'}),
        }


class SaleInlineItemForm(forms.ModelForm):
    """
    Simplified item form used when creating an article inline from a sale.
    Only exposes name and price while deriving the other required fields.
    """
    DEFAULT_CATEGORY_NAME = "Divers"

    class Meta:
        model = Item
        fields = [
            'name',
            'price',
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'price': forms.NumberInput(
                attrs={
                    'class': 'form-control',
                    'step': '0.01'
                }
            ),
        }

    def save(self, commit=True):
        instance = super().save(commit=False)

        default_category = Category.objects.order_by('id').first()
        if default_category is None:
            default_category = Category.objects.create(name=self.DEFAULT_CATEGORY_NAME)
        instance.category = default_category

        # Fill mandatory fields that are hidden from the inline form
        instance.description = instance.description or ''
        instance.purchase_price = instance.purchase_price or instance.price or 0

        if commit:
            instance.save()
        return instance


class CategoryForm(forms.ModelForm):
    """
    A form for creating or updating category.
    """
    class Meta:
        model = Category
        fields = ['name']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter category name',
                'aria-label': 'Category Name'
            }),
        }
        labels = {
            'name': 'Category Name',
        }


class DeliveryForm(forms.ModelForm):
    class Meta:
        model = Delivery
        fields = [
            'customer_name',
            'phone_number',
            'location',
            'delivery_date',
            'status'
        ]
        widgets = {
            'customer_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter customer name',
            }),
            'phone_number': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter phone number',
            }),
            'location': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter delivery location',
            }),
            'delivery_date': forms.DateTimeInput(attrs={
                'class': 'form-control',
                'placeholder': 'Select delivery date and time',
                'type': 'datetime-local'
            }),
            'status': forms.Select(attrs={
                'class': 'form-control',
            }),
        }

from django import forms
from .models import Purchase


class BootstrapMixin(forms.ModelForm):
    """
    A mixin to add Bootstrap classes to form fields.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs.setdefault('class', 'form-control')


class PurchaseForm(BootstrapMixin, forms.ModelForm):
    """
    A form for creating and updating Purchase instances.
    """
    class Meta:
        model = Purchase
        fields = ['item', 'quantity']
        widgets = {
            'quantity': forms.NumberInput(
                attrs={'class': 'form-control'}
            ),
        }


class PurchaseUpdateForm(BootstrapMixin, forms.ModelForm):
    """
    A form for updating only the quantity of a Purchase.
    The item field is not included as it should not be editable.
    """
    class Meta:
        model = Purchase
        fields = ['quantity']
        widgets = {
            'quantity': forms.NumberInput(
                attrs={
                    'class': 'form-control',
                    'min': '1',
                    'step': '1'
                }
            ),
        }
        labels = {
            'quantity': 'Quantité',
        }
    
    def clean_quantity(self):
        """
        Validate that quantity is positive.
        """
        quantity = self.cleaned_data.get('quantity')
        if quantity is not None and quantity <= 0:
            raise forms.ValidationError('La quantité doit être supérieure à zéro.')
        return quantity

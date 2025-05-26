from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm

from accounts.models import Vendor
from accounts.models import Setting
from accounts.models import Customer

User = get_user_model()


class CreateUserForm(UserCreationForm):
    email = forms.EmailField()

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password1',
            'password2'
        ]


class UserUpdateForm(forms.ModelForm):
    class Meta:
        model = User
        fields = [
            'username',
            'email'
        ]


class CustomerForm(forms.ModelForm):
    """Form for creating/updating customer information."""

    class Meta:
        model = Customer
        fields = [
            'first_name',
            'last_name',
            'address',
            'email',
            'phone',
            'loyalty_points'
        ]
        widgets = {
            'first_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter first name'
            }),
            'last_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter last name'
            }),
            'address': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Enter address',
                'rows': 3
            }),
            'email': forms.EmailInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter email'
            }),
            'phone': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter phone number'
            }),
            'loyalty_points': forms.NumberInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter loyalty points'
            }),
        }


class VendorForm(forms.ModelForm):
    """Form for creating/updating vendor information."""

    class Meta:
        model = Vendor
        fields = ['name', 'phone_number', 'address']
        widgets = {
            'name': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Vendor Name'}
            ),
            'phone_number': forms.NumberInput(
                attrs={'class': 'form-control', 'placeholder': 'Phone Number'}
            ),
            'address': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Address'}
            ),
        }


class SettingForm(forms.ModelForm):
    class Meta:
        model = Setting
        fields = ['name', 'email', 'phone_number', 'address', 'tax_number', 'logo']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'phone_number': forms.TextInput(attrs={'class': 'form-control'}),
            'address': forms.TextInput(attrs={'class': 'form-control'}),
            'tax_number': forms.TextInput(attrs={'class': 'form-control'}),
        }

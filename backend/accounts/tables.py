import django_tables2 as tables
from django.contrib.auth import get_user_model

User = get_user_model()


class UserTable(tables.Table):
    class Meta:
        model = User
        template_name = "django_tables2/semantic.html"
        fields = (
            'date',
            'customer_name',
            'contact_number',
            'item',
            'price_per_item',
            'quantity',
            'total'
        )

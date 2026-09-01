from rest_framework import serializers

from sales.models import Customer, Sale, SaleDetail


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "first_name", "last_name", "address", "email", "phone", "loyalty_points"]
        read_only_fields = ["id", "loyalty_points"]


class SaleItemInputSerializer(serializers.Serializer):
    item_id = serializers.UUIDField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField(min_value=1)
    total_item = serializers.DecimalField(max_digits=10, decimal_places=2)


class SaleCreateSerializer(serializers.Serializer):
    """
        Serializer d'entrée uniquement — la création réelle passe par sales.services.create_sale.
        Ne valide que la FORME des données ; les règles métier (stock, montants, cross-tenant)
        sont dans le service.
    """
    customer_id = serializers.UUIDField(required=False, allow_null=True)
    customer_name_override = serializers.CharField(required=False, allow_blank=True, default="")
    sub_total = serializers.DecimalField(max_digits=10, decimal_places=2)
    grand_total = serializers.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percentage = serializers.FloatField(default=0)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    amount_change = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_mobile_money = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    cash_payment_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    mobile_money_covers_total = serializers.BooleanField(default=False)
    has_sav = serializers.BooleanField(default=False)
    items = SaleItemInputSerializer(many=True, allow_empty=False)


class SaleDetailOutputSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True, default=None)
    profit = serializers.SerializerMethodField()

    class Meta:
        model = SaleDetail
        fields = ["id", "item", "item_name", "price", "quantity", "profit", "total_detail"]

    def get_profit(self, obj):
        return (obj.price - obj.cost_price) * obj.quantity

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        employee = getattr(request, 'employee', None) if request else None

        if not employee or employee.role not in ('OWNER', 'MANAGER'):
            data.pop('cost_price', None)
            data.pop('profit', None)

        return data


class SaleSerializer(serializers.ModelSerializer):
    """Serializer de sortie (list/retrieve), lecture seule."""
    reference = serializers.CharField(read_only=True)
    profit = serializers.SerializerMethodField()
    items = SaleDetailOutputSerializer(source="saledetail_set", many=True, read_only=True)
    customer_name = serializers.CharField(source="customer.get_full_name", read_only=True, default=None)
    employee_username = serializers.CharField(source="employee.user.username", read_only=True, default=None)

    class Meta:
        model = Sale
        fields = [
            "id", "reference", "created_at", "customer", "customer_name", "customer_name_override", "employee",
            "employee_username", "sub_total", "grand_total", "tax_amount", "tax_percentage", "amount_paid",
            "amount_change", "total_mobile_money", "cash_payment_amount",
            "mobile_money_covers_total", "has_sav", "profit", "items",
        ]

    def get_profit(self, obj):
        return sum((d.price - d.cost_price) * d.quantity for d in obj.saledetail_set.all())

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        employee = getattr(request, "employee", None) if request else None
        if not employee or employee.role not in ("OWNER", "MANAGER"):
            data.pop("profit", None)
        return data

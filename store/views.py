"""
Module: store.views

Contains Django views for managing items, profiles,
and deliveries in the store application.

Classes handle product listing, creation, updating,
deletion, and delivery management.
The module integrates with Django's authentication
and querying functionalities.
"""

# Standard library imports
import operator
from functools import reduce
import json
import logging

# Django core imports
from django.db.models import F
from django.shortcuts import render
from django.http import JsonResponse
from django.shortcuts import redirect
from django.contrib.auth import get_user_model
from django.urls import reverse, reverse_lazy
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q, Count, Sum
from django.db import transaction

# Authentication and permissions
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin

# Class-based views
from django.views.generic import (
    DetailView, CreateView, UpdateView, DeleteView, ListView
)
from django.views.generic.edit import FormMixin

# Third-party packages
import django_tables2 as tables
from django_tables2 import SingleTableView
from django_tables2.export.views import ExportMixin

# Local app imports
from accounts.models import Vendor, Settings, Customer
from transactions.models import Sale, SaleDetail
from transactions.utils import generate_pdf, print_document
from .models import Category, Item, Delivery, DeliveryDetail
from .forms import ItemForm, CategoryForm, DeliveryForm
from .tables import ItemTable

User = get_user_model()
logger = logging.getLogger(__name__)
settings = Settings.load()

from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q


@login_required
def dashboard(request):
    if not request.user.is_staff:
        return redirect('sale-create')

    # Get filter dates from request
    date_after = request.GET.get('date_after')
    date_before = request.GET.get('date_before')

    # Base queryset for sales with date filtering
    sales_query = Sale.objects.all()

    # Apply date filters if provided
    if date_after:
        try:
            date_after = datetime.strptime(date_after, '%Y-%m-%d').date()
            sales_query = sales_query.filter(date_added__date__gte=date_after)
        except ValueError:
            pass

    if date_before:
        try:
            date_before = datetime.strptime(date_before, '%Y-%m-%d').date()
            sales_query = sales_query.filter(date_added__date__lte=date_before)
        except ValueError:
            pass

    # Calculate today's sales
    today = timezone.now().date()
    today_sales = Sale.objects.filter(date_added__date=today).aggregate(
        total=Sum('grand_total')
    ).get('total', 0.00) or 0

    # Calculate total purchases (sum of purchase_price * quantity for all items)
    total_purchases = Item.objects.annotate(
        item_value=F('purchase_price') * F('quantity')
    ).aggregate(total=Sum('item_value')).get('total', 0.00) or 0

    # Optimize queries with select_related and annotate
    profiles = User.objects.all()
    items = Item.objects.select_related('category', 'vendor')

    # Calculate totals efficiently
    total_items = Item.objects.aggregate(Sum("quantity")).get("quantity__sum", 0.00) or 0
    items_count = items.count()
    profiles_count = profiles.count()

    stock_alert_count = items.filter(quantity__lte=5).count()

    # Calculate turnover (total of all sales) with date filtering
    turnover = sales_query.aggregate(total=Sum('grand_total')).get('total', 0.00) or 0

    # Prepare data for charts - optimize with values and annotate
    category_counts = Category.objects.annotate(
        item_count=Count("item")
    ).values("name", "item_count")

    categories = [cat["name"] for cat in category_counts]
    category_counts = [cat["item_count"] for cat in category_counts]

    # Optimize sales data query with date filtering
    sale_dates = (
        sales_query.values("date_added__date")
        .annotate(total_sales=Sum("grand_total"))
        .order_by("date_added__date")
    )

    sale_dates_labels = [
        date["date_added__date"].strftime("%Y-%m-%d") for date in sale_dates
    ]
    sale_dates_values = [float(date["total_sales"]) for date in sale_dates]

    # Maintain the same context keys
    context = {
        "items": items,
        "profiles": profiles,
        "profiles_count": profiles_count,
        "items_count": items_count,
        "total_items": total_items,
        "vendors": Vendor.objects.all(),
        "delivery": Delivery.objects.all(),
        "sales": sales_query,  # Filtered sales
        "categories": categories,
        "category_counts": category_counts,
        "sale_dates_labels": sale_dates_labels,
        "sale_dates_values": sale_dates_values,
        "turnover": turnover,
        "today_sales": today_sales,
        "total_purchases": total_purchases,
        "date_after": date_after,
        "date_before": date_before,
        "stock_alert_count": stock_alert_count
    }

    return render(request, "store/dashboard.html", context)


class ProductListView(LoginRequiredMixin, ExportMixin, tables.SingleTableView):
    """
    View class to display a list of products.

    Attributes:
    - model: The model associated with the view.
    - table_class: The table class used for rendering.
    - template_name: The HTML template used for rendering the view.
    - context_object_name: The variable name for the context object.
    - paginate_by: Number of items per page for pagination.
    """

    model = Item
    table_class = ItemTable
    template_name = "store/productslist.html"
    context_object_name = "items"
    paginate_by = 10
    SingleTableView.table_pagination = False
    exclude_columns = ('category', 'quantity', 'expiring_date', 'vendor')


class ProductListAlertView(LoginRequiredMixin, ExportMixin, tables.SingleTableView):
    """
    View class to display a list of products.

    Attributes:
    - model: The model associated with the view.
    - table_class: The table class used for rendering.
    - template_name: The HTML template used for rendering the view.
    - context_object_name: The variable name for the context object.
    - paginate_by: Number of items per page for pagination.
    """

    model = Item
    table_class = ItemTable
    template_name = "store/productslist.html"
    context_object_name = "items"
    paginate_by = 10
    SingleTableView.table_pagination = False
    exclude_columns = ('category', 'quantity', 'expiring_date', 'vendor')

    def get_queryset(self):
        return Item.objects.filter(quantity__lte=5).order_by('quantity')


class ItemSearchListView(ProductListView):
    """
    View class to search and display a filtered list of items.

    Attributes:
    - paginate_by: Number of items per page for pagination.
    """

    paginate_by = 10

    def get_queryset(self):
        result = super(ItemSearchListView, self).get_queryset()

        query = self.request.GET.get("q")
        if query:
            query_list = query.split()
            result = result.filter(
                reduce(
                    operator.and_, (Q(name__icontains=q) for q in query_list)
                )
            )
        return result


class ProductDetailView(LoginRequiredMixin, FormMixin, DetailView):
    """
    View class to display detailed information about a product.

    Attributes:
    - model: The model associated with the view.
    - template_name: The HTML template used for rendering the view.
    """

    model = Item
    template_name = "store/productdetail.html"

    def get_success_url(self):
        return reverse("product-detail", kwargs={"slug": self.object.slug})


class ProductCreateView(LoginRequiredMixin, CreateView):
    """
    View class to create a new product.

    Attributes:
    - model: The model associated with the view.
    - template_name: The HTML template used for rendering the view.
    - form_class: The form class used for data input.
    - success_url: The URL to redirect to upon successful form submission.
    """

    model = Item
    template_name = "store/productcreate.html"
    form_class = ItemForm
    success_url = "/products"

    def test_func(self):
        # item = Item.objects.get(id=pk)
        if self.request.POST.get("quantity") < 1:
            return False
        else:
            return True


class ProductUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    """
    View class to update product information.

    Attributes:
    - model: The model associated with the view.
    - template_name: The HTML template used for rendering the view.
    - fields: The fields to be updated.
    - success_url: The URL to redirect to upon successful form submission.
    """

    model = Item
    template_name = "store/productupdate.html"
    form_class = ItemForm
    success_url = "/products"

    def test_func(self):
        if self.request.user.is_superuser:
            return True
        else:
            return False


class ProductDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    """
    View class to delete a product.

    Attributes:
    - model: The model associated with the view.
    - template_name: The HTML template used for rendering the view.
    - success_url: The URL to redirect to upon successful deletion.
    """

    model = Item
    template_name = "store/productdelete.html"
    success_url = "/products"

    def test_func(self):
        if self.request.user.is_superuser:
            return True
        else:
            return False


class DeliveryListView(
    LoginRequiredMixin, ExportMixin, tables.SingleTableView
):
    """
    View class to display a list of deliveries.

    Attributes:
    - model: The model associated with the view.
    - pagination: Number of items per page for pagination.
    - template_name: The HTML template used for rendering the view.
    - context_object_name: The variable name for the context object.
    """

    model = Delivery
    pagination = 10
    template_name = "store/deliveries.html"
    context_object_name = "deliveries"


class DeliverySearchListView(DeliveryListView):
    """
    View class to search and display a filtered list of deliveries.

    Attributes:
    - paginate_by: Number of items per page for pagination.
    """

    paginate_by = 10

    def get_queryset(self):
        result = super(DeliverySearchListView, self).get_queryset()

        query = self.request.GET.get("q")
        if query:
            query_list = query.split()
            result = result.filter(
                reduce(
                    operator.
                    and_, (Q(customer_name__icontains=q) for q in query_list)
                )
            )
        return result


class DeliveryDetailView(LoginRequiredMixin, DetailView):
    """
    View class to display detailed information about a delivery.

    Attributes:
    - model: The model associated with the view.
    - template_name: The HTML template used for rendering the view.
    """

    model = Delivery
    template_name = "store/deliverydetail.html"


@login_required
def DeliveryCreateView(request):
    context = {
        "active_icon": "deliveries",
    }

    if request.method == 'POST':
        if is_ajax(request=request):
            try:
                # Load the JSON data from the request body
                data = json.loads(request.body)
                print(data)
                logger.info(f"Received delivery data: {data}")

                # Validate required fields
                required_fields = [
                    'customer_name', 'phone_number', 'location', 'delivery_date',
                    'sub_total', 'grand_total', 'amount_paid', 'amount_change', 'items'
                ]
                for field in required_fields:
                    if field not in data:
                        raise ValueError(f"Missing required field: {field}")

                # Create delivery attributes
                delivery_attributes = {
                    "customer_name": data['customer_name'],
                    "phone_number": data['phone_number'],
                    "location": data['location'],
                    "delivery_date": data['delivery_date'],
                    "status": 'NOT_DELIVERED',
                    "sub_total": float(data["sub_total"]),
                    "grand_total": float(data["grand_total"]),
                    "tax_amount": float(data.get("tax_amount", 0.0)),
                    "tax_percentage": float(data.get("tax_percentage", 0.0)),
                    "amount_paid": float(data["amount_paid"]),
                    "amount_change": float(data["amount_change"]),
                }

                print(delivery_attributes)

                # Use a transaction to ensure atomicity
                with transaction.atomic():
                    # Create the delivery
                    new_delivery = Delivery.objects.create(**delivery_attributes)
                    logger.info(f"Delivery created: {new_delivery}")

                    # Create delivery details WITHOUT updating item quantities
                    items = data["items"]
                    if not isinstance(items, list):
                        raise ValueError("Items should be a list")

                    for item in items:
                        if not all(
                                k in item for k in [
                                    "id", "price", "quantity", "total_item"
                                ]
                        ):
                            raise ValueError("Item is missing required fields")

                        item_instance = Item.objects.get(id=int(item["id"]))
                        
                        # Check if enough stock is available but don't update yet
                        if item_instance.quantity < int(item["quantity"]):
                            raise ValueError(f"Not enough stock for item: {item_instance.name}")

                        detail_attributes = {
                            "delivery": new_delivery,
                            "item": item_instance,
                            "price": float(item["price"]),
                            "quantity": int(item["quantity"]),
                            "total_detail": float(item["total_item"])
                        }
                        DeliveryDetail.objects.create(**detail_attributes)
                        logger.info(f"Delivery detail created: {detail_attributes}")

                context = {
                    'delivery': new_delivery,
                    'settings': settings,
                }

                pdf_data = generate_pdf(request, 'store/delivery_receipt.html', context)

                # Send it to printer
                print_document(pdf_data)

                return JsonResponse(
                    {
                        'status': 'success',
                        'message': 'Delivery created successfully!',
                        'redirect': '/deliveries/'
                    }
                )

            except json.JSONDecodeError:
                return JsonResponse(
                    {
                        'status': 'error',
                        'message': 'Invalid JSON format in request body!'
                    }, status=400)
            except Item.DoesNotExist:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Item does not exist!'
                }, status=400)
            except ValueError as ve:
                return JsonResponse({
                    'status': 'error',
                    'message': f'Value error: {str(ve)}'
                }, status=400)
            except TypeError as te:
                return JsonResponse({
                    'status': 'error',
                    'message': f'Type error: {str(te)}'
                }, status=400)
            except Exception as e:
                logger.error(f"Exception during delivery creation: {e}")
                return JsonResponse(
                    {
                        'status': 'error',
                        'message': (
                            f'There was an error during the creation: {str(e)}'
                        )
                    }, status=500)

    return render(request, "store/delivery_create.html", context=context)


class DeliveryUpdateView(LoginRequiredMixin, UpdateView):
    """
    View class to update delivery information.

    Attributes:
    - model: The model associated with the view.
    - fields: The fields to be updated.
    - template_name: The HTML template used for rendering the view.
    - success_url: The URL to redirect to upon successful form submission.
    """

    model = Delivery
    form_class = DeliveryForm
    template_name = "store/delivery_form.html"
    success_url = "/deliveries"


class DeliveryDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    """
    View class to delete a delivery.

    Attributes:
    - model: The model associated with the view.
    - template_name: The HTML template used for rendering the view.
    - success_url: The URL to redirect to upon successful deletion.
    """

    model = Delivery
    template_name = "store/productdelete.html"
    success_url = "/deliveries"

    def test_func(self):
        if self.request.user.is_superuser:
            return True
        else:
            return False


class CategoryListView(LoginRequiredMixin, ListView):
    model = Category
    template_name = 'store/category_list.html'
    context_object_name = 'categories'
    paginate_by = 10
    login_url = 'login'


class CategoryDetailView(LoginRequiredMixin, DetailView):
    model = Category
    template_name = 'store/category_detail.html'
    context_object_name = 'category'
    login_url = 'login'


class CategoryCreateView(LoginRequiredMixin, CreateView):
    model = Category
    template_name = 'store/category_form.html'
    form_class = CategoryForm
    login_url = 'login'

    def get_success_url(self):
        return reverse_lazy('category-detail', kwargs={'pk': self.object.pk})


class CategoryUpdateView(LoginRequiredMixin, UpdateView):
    model = Category
    template_name = 'store/category_form.html'
    form_class = CategoryForm
    login_url = 'login'

    def get_success_url(self):
        return reverse_lazy('category-detail', kwargs={'pk': self.object.pk})


class CategoryDeleteView(LoginRequiredMixin, DeleteView):
    model = Category
    template_name = 'store/category_confirm_delete.html'
    context_object_name = 'category'
    success_url = reverse_lazy('category-list')
    login_url = 'login'


def is_ajax(request):
    return request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest'


@csrf_exempt
@require_POST
@login_required
def get_items_ajax_view(request):
    if is_ajax(request):
        try:
            term = request.POST.get("term", "")
            data = []

            items = Item.objects.filter(name__icontains=term)
            for item in items[:10]:
                data.append(item.to_json())

            return JsonResponse(data, safe=False)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Not an AJAX request'}, status=400)


@csrf_exempt
@require_POST
@login_required
def update_delivery_status(request, delivery_id):
    """
    AJAX endpoint to update delivery status from NOT_DELIVERED to DELIVERED
    """
    if is_ajax(request):
        try:
            delivery = Delivery.objects.get(id=delivery_id)
            
            if delivery.status == 'DELIVERED':
                return JsonResponse({
                    'status': 'error',
                    'message': 'Delivery is already marked as delivered!'
                }, status=400)
            
            # Use a transaction to ensure atomicity
            with transaction.atomic():
                # Update delivery status
                delivery.status = 'DELIVERED'
                delivery.save()
                
                # Create SaleDetail records and update stock
                for delivery_detail in delivery.deliverydetail_set.all():
                    item = delivery_detail.item
                    
                    # Check if enough stock is available
                    if item.quantity < delivery_detail.quantity:
                        raise ValueError(f"Not enough stock for item: {item.name}")
                    
                    # Update item quantity
                    item.quantity -= delivery_detail.quantity
                    item.save()
                    
                    # Create corresponding SaleDetail record
                    # First, we need to create a Sale record
                    
                    # Try to find a customer or create a default one
                    customer, created = Customer.objects.get_or_create(
                        phone=delivery.phone_number,
                        defaults={
                            'first_name': delivery.customer_name.split()[0] if delivery.customer_name.split() else delivery.customer_name,
                            'last_name': ' '.join(delivery.customer_name.split()[1:]) if len(delivery.customer_name.split()) > 1 else '',
                            'address': delivery.location
                        }
                    )
                    
                    # Create a Sale record for this delivery
                    sale, created = Sale.objects.get_or_create(
                        customer=customer,
                        sub_total=delivery.sub_total,
                        grand_total=delivery.grand_total,
                        tax_amount=delivery.tax_amount,
                        tax_percentage=delivery.tax_percentage,
                        amount_paid=delivery.amount_paid,
                        amount_change=delivery.amount_change,
                        defaults={'date_added': delivery.date_added}
                    )
                    
                    # Create SaleDetail record
                    SaleDetail.objects.create(
                        sale=sale,
                        item=delivery_detail.item,
                        price=delivery_detail.price,
                        quantity=delivery_detail.quantity,
                        total_detail=delivery_detail.total_detail
                    )
                
                # Generate delivery confirmation receipt
                context = {
                    'delivery': delivery,
                    'settings': settings,
                }
                
                pdf_data = generate_pdf(request, 'store/delivery_receipt.html', context)
                print_document(pdf_data)
                
                return JsonResponse({
                    'status': 'success',
                    'message': 'Delivery status updated successfully! Receipt printed.'
                })
                
        except Delivery.DoesNotExist:
            return JsonResponse({
                'status': 'error',
                'message': 'Delivery not found!'
            }, status=404)
        except ValueError as ve:
            return JsonResponse({
                'status': 'error',
                'message': f'Error: {str(ve)}'
            }, status=400)
        except Exception as e:
            logger.error(f"Exception during delivery status update: {e}")
            return JsonResponse({
                'status': 'error',
                'message': f'There was an error: {str(e)}'
            }, status=500)
    
    return JsonResponse({'error': 'Not an AJAX request'}, status=400)

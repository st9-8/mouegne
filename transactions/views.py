# Standard library imports
import json
import logging

# Django core imports
from django.db.models import Sum
from django.http import JsonResponse, HttpResponse
from django.urls import reverse
from django.shortcuts import render
from django.db import transaction
from django.utils import timezone

# Class-based views
from django.views.generic import DetailView, ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView

# Authentication and permissions
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin

# Third-party packages
from openpyxl import Workbook
from traceback_with_variables import format_exc

# Local app imports
from store.models import Item
from accounts.models import Customer
from accounts.models import Settings
from transactions.models import Sale, Purchase, SaleDetail
from transactions.forms import PurchaseForm
from transactions.utils import generate_pdf, print_document

logger = logging.getLogger(__name__)
settings = Settings.load()


def is_ajax(request):
    return request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest'


def export_sales_to_excel(request):
    # Create a workbook and select the active worksheet.
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = 'Sales'

    # Define the column headers
    columns = [
        'ID', 'Date', 'Customer', 'Sub Total',
        'Grand Total', 'Tax Amount', 'Tax Percentage',
        'Amount Paid', 'Amount Change'
    ]
    worksheet.append(columns)

    # Fetch sales data
    sales = Sale.objects.all()

    for sale in sales:
        # Convert timezone-aware datetime to naive datetime
        if sale.date_added.tzinfo is not None:
            date_added = sale.date_added.replace(tzinfo=None)
        else:
            date_added = sale.date_added

        worksheet.append([
            sale.id,
            date_added,
            sale.customer.phone,
            sale.sub_total,
            sale.grand_total,
            sale.tax_amount,
            sale.tax_percentage,
            sale.amount_paid,
            sale.amount_change
        ])

    # Set up the response to send the file
    response = HttpResponse(
        content_type=(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    )
    response['Content-Disposition'] = 'attachment; filename=sales.xlsx'
    workbook.save(response)

    return response


def export_purchases_to_excel(request):
    # Create a workbook and select the active worksheet.
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = 'Purchases'

    # Define the column headers
    columns = [
        'ID', 'Item', 'Description', 'Vendor', 'Order Date',
        'Delivery Date', 'Quantity', 'Delivery Status',
        'Price per item (Ksh)', 'Total Value'
    ]
    worksheet.append(columns)

    # Fetch purchases data
    purchases = Purchase.objects.all()

    for purchase in purchases:
        # Convert timezone-aware datetime to naive datetime
        delivery_tzinfo = purchase.delivery_date.tzinfo
        order_tzinfo = purchase.order_date.tzinfo

        if delivery_tzinfo or order_tzinfo is not None:
            delivery_date = purchase.delivery_date.replace(tzinfo=None)
            order_date = purchase.order_date.replace(tzinfo=None)
        else:
            delivery_date = purchase.delivery_date
            order_date = purchase.order_date
        worksheet.append([
            purchase.id,
            purchase.item.name,
            purchase.description,
            purchase.vendor.name,
            order_date,
            delivery_date,
            purchase.quantity,
            purchase.get_delivery_status_display(),
            purchase.price,
            purchase.total_value
        ])

    # Set up the response to send the file
    response = HttpResponse(
        content_type=(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    )
    response['Content-Disposition'] = 'attachment; filename=purchases.xlsx'
    workbook.save(response)

    return response


@login_required
@require_POST
def print_sale_receipt(request, pk):
    """
    View to print a sale receipt
    """
    try:
        # Get the sale object
        sale = Sale.objects.get(pk=pk)
        printer_name = request.POST.get('printer_name')

        # Generate PDF using the receipt template
        context = {
            'sale': sale,
            'settings': settings
        }

        pdf_data = generate_pdf(request, 'transactions/receipt.html', context)

        # Send it to printer
        success = print_document(pdf_data, printer_name)

        if success:
            return JsonResponse({'status': 'success', 'message': 'Receipt sent to printer'})
        else:
            return JsonResponse({'status': 'error', 'message': 'Failed to print receipt'}, status=500)

    except Sale.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Sale not found'}, status=404)
    except Exception as e:
        print(format_exc(e))
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


# Add a view to download the PDF without printing
@login_required
def download_sale_receipt(request, pk):
    """
    View to download a sale receipt as PDF
    """
    try:
        # Get the sale object
        sale = Sale.objects.get(pk=pk)

        # Generate PDF using the receipt template
        context = {
            'sale': sale,
            'settings': settings,
        }

        pdf_data = generate_pdf(request, 'transactions/receipt.html', context)

        # Create a response with PDF
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="receipt-{sale.id}.pdf"'
        return response

    except Sale.DoesNotExist:
        return HttpResponse('Sale not found', status=404)


@login_required
def get_printers(request):
    """
    API endpoint to get available printers
    """
    try:
        from transactions.utils import get_available_printers
        printers = get_available_printers()
        return JsonResponse({'status': 'success', 'printers': printers})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


class SaleListView(LoginRequiredMixin, ListView):
    """
    View to list all sales with pagination.
    """

    model = Sale
    template_name = "transactions/sales_list.html"
    context_object_name = "sales"
    paginate_by = 10
    ordering = ['date_added']

    def get_queryset(self):
        today = timezone.now().date()
        return Sale.objects.filter(date_added__date=today).order_by('-date_added')

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        # aggregate the grand_total of the same queryset
        totals = self.get_queryset().aggregate(total=Sum('grand_total'))
        # if there are no sales, Sum will be None
        ctx['total_sales'] = totals['total'] or 0
        return ctx


class SaleDetailView(LoginRequiredMixin, DetailView):
    """
    View to display details of a specific sale.
    """

    model = Sale
    template_name = "transactions/saledetail.html"


@login_required
def SaleCreateView(request):
    context = {
        "active_icon": "sales",
        "default_client": Customer.objects.first(),
        "customers": [c.to_select2() for c in Customer.objects.all()]
    }

    if request.method == 'POST':
        if is_ajax(request=request):
            try:
                # Load the JSON data from the request body
                data = json.loads(request.body)
                print(data)
                logger.info(f"Received data: {data}")

                # Validate required fields
                required_fields = [
                    'customer', 'sub_total', 'grand_total',
                    'amount_paid', 'amount_change', 'items'
                ]
                for field in required_fields:
                    if field not in data:
                        raise ValueError(f"Missing required field: {field}")

                # Create sale attributes
                sale_attributes = {
                    "customer": Customer.objects.get(id=int(data['customer'])),
                    "sub_total": float(data["sub_total"]),
                    "grand_total": float(data["grand_total"]),
                    "tax_amount": float(data.get("tax_amount", 0.0)),
                    "tax_percentage": float(data.get("tax_percentage", 0.0)),
                    "amount_paid": float(data["amount_paid"]),
                    "amount_change": float(data["amount_change"]),
                    "has_sav": data['has_sav']
                }

                print(sale_attributes)

                # Use a transaction to ensure atomicity
                with transaction.atomic():
                    # Create the sale
                    new_sale = Sale.objects.create(**sale_attributes)
                    logger.info(f"Sale created: {new_sale}")

                    # Create sale details and update item quantities
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
                        if item_instance.quantity < int(item["quantity"]):
                            raise ValueError(f"Quantité en stock insuffisante pour: {item_instance.name}")

                        detail_attributes = {
                            "sale": new_sale,
                            "item": item_instance,
                            "price": float(item["price"]),
                            "quantity": int(item["quantity"]),
                            "total_detail": float(item["total_item"])
                        }
                        SaleDetail.objects.create(**detail_attributes)
                        logger.info(f"Sale detail created: {detail_attributes}")

                        # Reduce item quantity
                        item_instance.quantity -= int(item["quantity"])
                        item_instance.save()

                context = {
                    'sale': new_sale,
                    'settings': settings,
                }

                pdf_data = generate_pdf(request, 'transactions/receipt.html', context)

                # Send it to printer
                print_document(pdf_data)

                return JsonResponse(
                    {
                        'status': 'success',
                        'message': 'Sale created successfully!',
                        'redirect': '/transactions/sales/'
                    }
                )

            except json.JSONDecodeError:
                return JsonResponse(
                    {
                        'status': 'error',
                        'message': 'Invalid JSON format in request body!'
                    }, status=400)
            except Customer.DoesNotExist:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Customer does not exist!'
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
                logger.error(f"Exception during sale creation: {e}")
                return JsonResponse(
                    {
                        'status': 'error',
                        'message': (
                            f'There was an error during the creation: {str(e)}'
                        )
                    }, status=500)

    return render(request, "transactions/sale_create.html", context=context)


class SaleDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    """
    View to delete a sale.
    """

    model = Sale
    template_name = "transactions/saledelete.html"

    def get_success_url(self):
        """
        Redirect to the sales list after successful deletion.
        """
        return reverse("saleslist")

    def test_func(self):
        """
        Allow deletion only for superusers.
        """
        return self.request.user.is_superuser


class PurchaseListView(LoginRequiredMixin, ListView):
    """
    View to list all purchases with pagination.
    """

    model = Purchase
    template_name = "transactions/purchases_list.html"
    context_object_name = "purchases"
    paginate_by = 10


class PurchaseDetailView(LoginRequiredMixin, DetailView):
    """
    View to display details of a specific purchase.
    """

    model = Purchase
    template_name = "transactions/purchasedetail.html"


class PurchaseCreateView(LoginRequiredMixin, CreateView):
    """
    View to create a new purchase.
    """

    model = Purchase
    form_class = PurchaseForm
    template_name = "transactions/purchases_form.html"

    def form_valid(self, form):
        """
        Set default values before saving the form.
        """
        purchase = form.save(commit=False)
        # Set delivery date to today
        purchase.delivery_date = timezone.now()
        # Set delivery status to 'S' (Livré)
        purchase.delivery_status = 'S'
        # Set price from item's purchase_price
        purchase.price = purchase.item.purchase_price
        # Set vendor from item if available
        if purchase.item.vendor:
            purchase.vendor = purchase.item.vendor
        return super().form_valid(form)

    def get_success_url(self):
        """
        Redirect to the purchases list after successful form submission.
        """
        return reverse("purchaseslist")


class PurchaseUpdateView(LoginRequiredMixin, UpdateView):
    """
    View to update an existing purchase.
    """

    model = Purchase
    form_class = PurchaseForm
    template_name = "transactions/purchases_form.html"

    def form_valid(self, form):
        """
        Set default values before saving the form.
        """
        purchase = form.save(commit=False)
        # Update price from item's purchase_price
        purchase.price = purchase.item.purchase_price
        # Update vendor from item if available and not already set
        if not purchase.vendor and purchase.item.vendor:
            purchase.vendor = purchase.item.vendor
        return super().form_valid(form)

    def get_success_url(self):
        """
        Redirect to the purchases list after successful form submission.
        """
        return reverse("purchaseslist")


class PurchaseDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    """
    View to delete a purchase.
    """

    model = Purchase
    template_name = "transactions/purchasedelete.html"

    def get_success_url(self):
        """
        Redirect to the purchases list after successful deletion.
        """
        return reverse("purchaseslist")

    def test_func(self):
        """
        Allow deletion only for superusers.
        """
        return self.request.user.is_superuser

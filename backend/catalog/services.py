from django.db import transaction

from catalog.models import Item
from catalog.models import Category

from catalog.models import ItemImage, MAX_IMAGES_PER_ITEM

DEFAULT_CATEGORY_NAME = "Divers"


def get_or_create_default_category(*, merchant):
    category, _ = Category.objects.get_or_create(merchant=merchant, name=DEFAULT_CATEGORY_NAME)
    return category


@transaction.atomic
def quick_create_item(*, shop, name, price, quantity=1):
    """
        Création rapide depuis l'écran de vente — accessible à tout membre de la
        boutique, y compris CASHIER. Pas de choix de catégorie (assignée
        automatiquement) ni de fournisseur, pour rester dans l'esprit
        "vente en 15 secondes".
    """
    category = get_or_create_default_category(merchant=shop.owner)
    return Item.objects.create(
        shop=shop,
        category=category,
        name=name,
        price=price,
        purchase_price=price,
        quantity=quantity,
    )


@transaction.atomic
def create_item(*, shop, category, vendor=None, **fields):
    if category.merchant_id != shop.owner_id:
        raise ValueError("Cette catégorie n'appartient pas à votre commerce.")
    if vendor and vendor.merchant_id != shop.owner_id:
        raise ValueError("Ce fournisseur n'appartient pas à votre commerce.")

    return Item.objects.create(shop=shop, category=category, vendor=vendor, **fields)


def _rewrite_positions(images):
    """
    images : ItemImage d'un même article, dans l'ordre final voulu -> positions 1..n.
    Deux passes : la contrainte unique (item, position) est vérifiée ligne par ligne, donc échanger
    deux photos est impossible en écrivant directement les valeurs finales.
    """
    for img in images:
        img.position += MAX_IMAGES_PER_ITEM
    ItemImage.objects.bulk_update(images, ["position"])
    for new_position, img in enumerate(images, start=1):
        img.position = new_position
    ItemImage.objects.bulk_update(images, ["position"])


def _lock_item(item):
    return Item.objects.select_for_update().get(pk=item.pk)  # sérialise les opérations concurrentes


@transaction.atomic
def add_item_image(*, item, file):
    item = _lock_item(item)
    count = item.images.count()
    if count >= MAX_IMAGES_PER_ITEM:
        raise ValueError(f"Un article ne peut pas avoir plus de {MAX_IMAGES_PER_ITEM} photos.")
    return ItemImage.objects.create(shop_id=item.shop_id, item=item, image=file, position=count + 1)


@transaction.atomic
def reorder_item_images(*, item, ordered_ids):
    item = _lock_item(item)
    by_id = {str(img.id): img for img in item.images.all()}
    ordered_ids = [str(i) for i in ordered_ids]
    if len(ordered_ids) != len(by_id) or set(ordered_ids) != set(by_id):
        raise ValueError("La liste doit contenir exactement les photos de cet article, une fois chacune.")
    _rewrite_positions([by_id[i] for i in ordered_ids])


@transaction.atomic
def delete_item_image(*, item, image_id):
    item = _lock_item(item)
    try:
        image = item.images.get(pk=image_id)
    except ItemImage.DoesNotExist:
        raise ValueError("Photo introuvable pour cet article.")
    image.delete()
    _rewrite_positions(list(item.images.order_by("position")))  # si la photo 1 part, la 2 devient l'aperçu


def thumbnail_urls_for_items(item_ids, request):
    """{item_id: url absolue de la miniature} en UNE requête, pour les payloads sans objets Item."""
    images = ItemImage.objects.filter(item_id__in=list(item_ids), position=1)
    return {str(img.item_id): request.build_absolute_uri(img.thumbnail.url) for img in images}

from drf_spectacular.utils import OpenApiParameter, extend_schema_view, extend_schema

SHOP_PK_PARAMETER = OpenApiParameter(
    name='shop_pk',
    type=str,
    location=OpenApiParameter.PATH,
    description='Identifiant UUID de la boutique'
)


def shop_scoped_schema(cls):
    """
    Décorateur de classe à appliquer sur tout ViewSet nesté sous /shops/{shop_pk}/...
    Ajoute automatiquement le paramètre de chemin shop_pk à toutes les actions
    CRUD standard, sans avoir à le répéter manuellement sur chaque viewset.

    Usage:
        @shop_scoped_schema
        class ItemViewSet(viewsets.ModelViewSet):
            ...
    """
    actions = {}
    for action_name in ["list", "retrieve", "create", "update", "partial_update", "destroy"]:
        if hasattr(cls, action_name):
            actions[action_name] = extend_schema(parameters=[SHOP_PK_PARAMETER])

    return extend_schema_view(**actions)(cls)

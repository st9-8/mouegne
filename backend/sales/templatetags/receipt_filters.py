from django import template

register = template.Library()


@register.filter
def currency_format(value, with_currency=True):
    try:
        amount = float(value)
    except (TypeError, ValueError):
        amount = 0
    formatted = "{:,.0f}".format(amount).replace(",", " ")
    return f"{formatted} FCFA" if with_currency else formatted

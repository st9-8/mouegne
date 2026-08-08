from django import template

register = template.Library()


@register.filter
def currency_format(value, show_currency=True):
    """
    Format a number with thousand separators and optionally add FCFA currency.
    Example: 1000000, True -> 1 000 000 FCFA
             1000000, False -> 1 000 000

    Args:
        value: The number to format
        show_currency: Boolean indicating whether to append 'FCFA' (default: True)
    """
    try:
        # Format with thousand separator
        formatted_value = '{:,}'.format(float(value)).replace(',', ' ')

        if show_currency:
            return f"{formatted_value} FCFA"
        else:
            return formatted_value
    except (ValueError, TypeError):
        return value
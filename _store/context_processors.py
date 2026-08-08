from accounts.models import Settings


def company_settings(request):
    """
    Add company settings to context for all templates
    """
    try:
        settings = Settings.load()
        return {'settings': settings}
    except:
        return {'settings': None}

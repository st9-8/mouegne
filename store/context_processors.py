from accounts.models import Setting


def company_settings(request):
    """
    Add company settings to context for all templates
    """
    try:
        settings = Setting.load()
        return {'settings': settings}
    except:
        return {'settings': None}

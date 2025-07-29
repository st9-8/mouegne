import os
import tempfile
import win32api
import win32print
import subprocess
from traceback_with_variables import format_exc
from django.template.loader import render_to_string
from weasyprint import HTML


def generate_pdf(request, template_src, context_dict):
    """
    Generate a PDF file from a template and context for 80mm receipt centered on a standard page
    """
    context = {**context_dict, 'request': request}

    # Render the HTML template with context
    html_string = render_to_string(template_src, context)

    # Create a PDF from the HTML with standard page size but preserving the receipt width
    pdf_file = HTML(string=html_string, base_url=request.build_absolute_uri('/')).write_pdf(
        stylesheets=[],
        presentational_hints=True
    )
    return pdf_file


def print_pdf_windows(path, printer_name=None):
    # 1) Optionally switch the default printer for this session
    if printer_name:
        win32print.SetDefaultPrinter(printer_name)

    # 2) Tell Windows to “print” via the file association
    #    (this will launch the registered PDF handler in invisible mode)
    win32api.ShellExecute(
        0,
        "print",         # verb
        path,            # file to print
        None,            # no extra args
        ".",             # working directory
        0                # SW_HIDE
    )

def print_document(pdf_data, printer_name=None):
    """
    Send PDF data directly to a printer

    Args:
        pdf_data: The PDF data to print
        printer_name: Optional name of the printer to use (uses default if None)

    Returns:
        bool: True if printing was successful, False otherwise
    """
    try:
        # Create a temporary file to store the PDF
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_filename = temp_file.name
            temp_file.write(pdf_data)

        # Print the PDF using system's printer
        if os.name == 'nt':  # Windows
            print_pdf_windows(temp_filename, printer_name)
        else:  # Unix/Linux/Mac
            if printer_name:
                subprocess.call(['lp', '-o', 'media=X80mmY297mm', '-d', printer_name, temp_filename])
            else:
                subprocess.call(['lp', '-o', 'media=X80mmY297mm', temp_filename])

        # Clean up the temporary file
        # os.unlink(temp_filename)
        return True
    except Exception as e:
        # Log the error
        import logging
        logging.error(f"Printing error: {format_exc(e)}")
        return False


def get_available_printers():
    """
    Get a list of available printers on the system

    Returns:
        list: List of printer names
    """
    try:
        if os.name == 'nt':  # Windows
            import win32print
            printers = []
            for printer in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL):
                printers.append(printer[2])
            return printers
        else:  # Unix/Linux/Mac
            import subprocess
            result = subprocess.run(['lpstat', '-a'], capture_output=True, text=True)
            printers = []
            for line in result.stdout.splitlines():
                if line:
                    printers.append(line.split()[0])
            return printers
    except Exception as e:
        import logging
        logging.error(f"Error getting printers: {str(e)}")
        return []


def generate_receipt_pdf(template_src, context_dict, receipt_only=False):
    """
    Generate a PDF file from a template and context, optionally extracting only the receipt section

    Args:
        template_src: The template source
        context_dict: The context dictionary
        receipt_only: If True, only the receipt section will be included

    Returns:
        bytes: The PDF data
    """
    from django.conf import settings

    # Add a flag to the context to indicate we're generating a receipt-only PDF
    if receipt_only:
        context_dict['receipt_only'] = True

    # Render the HTML template with context
    html_string = render_to_string(template_src, context_dict)

    # If receipt_only is True, extract only the receipt section
    if receipt_only:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_string, 'html.parser')
        receipt_section = soup.select_one('section.receipt')

        if receipt_section:
            # Get all style tags from the document
            style_content = ""
            for style_tag in soup.find_all('style'):
                if style_tag.string:
                    style_content += style_tag.string

            # Create a new HTML document with just the receipt and all styles
            new_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Receipt</title>
                <!-- Bootstrap CSS -->
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
                <!-- Font Awesome for icons -->
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
                <style>
                    @page {{
                        size: 80mm auto;
                        margin: 0mm;
                    }}
                    body {{
                        margin: 0;
                        padding: 0;
                        width: 80mm;
                    }}
                    {style_content}
                </style>
            </head>
            <body>
                {str(receipt_section)}
            </body>
            </html>
            """
            html_string = new_html

    # Create a PDF from the HTML
    base_url = getattr(settings, 'BASE_URL', None)
    pdf_file = HTML(string=html_string, base_url=base_url).write_pdf()
    return pdf_file

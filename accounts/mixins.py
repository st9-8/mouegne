from django.shortcuts import redirect
from django.contrib import messages
from django.contrib.auth.mixins import UserPassesTestMixin


class StaffRequiredMixin(UserPassesTestMixin):
    """
        Mixin that requires the user to be staff to access the view.
    """
    permission_denied_message = "You don't have permission to access this page."

    def test_func(self):
        return self.request.user.is_authenticated and self.request.user.is_staff

    def handle_no_permission(self):
        messages.error(self.request, self.permission_denied_message)
        return redirect('saleslist')


class SalesPermissionMixin(UserPassesTestMixin):
    """
        Mixin that allows staff users full access to sales features
        but restricts regular users to only viewing and creating sales.
    """
    permission_denied_message = "You don't have permission to perform this action."

    def test_func(self):
        # Staff can do anything
        if self.request.user.is_staff:
            return True

        # For non-staff users, check if this is a create or list view
        # The actual implementation depends on the view class
        if hasattr(self, 'is_create_or_list_view'):
            return self.is_create_or_list_view()

        # Default to denying access for non-staff users
        return False

    def handle_no_permission(self):
        messages.error(self.request, self.permission_denied_message)
        return redirect('saleslist')

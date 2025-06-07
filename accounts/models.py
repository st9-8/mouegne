from django.db import models
from django.core.cache import cache
from django.db.utils import OperationalError
from django.db.utils import ProgrammingError
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from imagekit.processors import ResizeToFill
from imagekit.models import ProcessedImageField
from django_extensions.db.fields import AutoSlugField
from phonenumber_field.modelfields import PhoneNumberField

from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    profile_picture = ProcessedImageField(
        default='profile_pics/default.jpg',
        upload_to='profile_pics',
        format='JPEG',
        processors=[ResizeToFill(150, 150)],
        options={'quality': 100}
    )
    telephone = PhoneNumberField(
        null=True, blank=True, verbose_name='Telephone'
    )

    @property
    def image_url(self):
        """
            Returns the URL of the profile picture.
            Returns an empty string if the image is not available.
        """
        try:
            return self.profile_picture.url
        except AttributeError:
            return ''


class Vendor(models.Model):
    """
    Represents a vendor with contact and address information.
    """
    name = models.CharField(max_length=50, verbose_name='Name')
    slug = AutoSlugField(
        unique=True,
        populate_from='name',
        verbose_name='Slug'
    )
    phone_number = models.BigIntegerField(
        blank=True, null=True, verbose_name='Phone Number'
    )
    address = models.CharField(
        max_length=50, blank=True, null=True, verbose_name='Address'
    )

    def __str__(self):
        """
        Returns a string representation of the vendor.
        """
        return self.name

    class Meta:
        """Meta options for the Vendor model."""
        verbose_name = 'Vendor'
        verbose_name_plural = 'Vendors'


class Customer(models.Model):
    first_name = models.CharField(max_length=256)
    last_name = models.CharField(max_length=256, blank=True, null=True)
    address = models.TextField(max_length=256, blank=True, null=True)
    email = models.EmailField(max_length=256, blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    loyalty_points = models.IntegerField(default=0)

    class Meta:
        db_table = 'Customers'

    def __str__(self) -> str:
        return self.first_name + " " + self.last_name

    def get_full_name(self):
        return self.first_name + " " + self.last_name

    def to_select2(self):
        item = {
            "label": self.get_full_name(),
            "value": self.id
        }
        return item


class Singleton(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.pk = 1
        super(Singleton, self).save(*args, **kwargs)
        self.set_cache()

    def delete(self, using=None, keep_parents=False):
        raise ValidationError(_('Unable to delete this model'))

    def set_cache(self):
        cache.set(self.__class__.__name__, self)

    @classmethod
    def load(cls):
        from django.db import connection
        if 'accounts_settings' not in connection.introspection.table_names():
            return

        try:
            if cache.get(cls.__name__) is None:
                unique_instance, created = cls.objects.get_or_create(pk=1)
                if not created:
                    unique_instance.set_cache()
        except (ProgrammingError, OperationalError):
            pass

        return cache.get(cls.__name__)


class Settings(Singleton):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone_number = models.CharField(max_length=13)
    address = models.CharField(max_length=255)
    tax_number = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='logos/')

    def __str__(self):
        return self.name

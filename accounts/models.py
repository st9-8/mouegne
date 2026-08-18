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

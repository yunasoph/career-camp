# CareerCampus API runtime — PHP 8.3 + FPM.
# Dependencies are installed at runtime, not baked in:
#   docker compose run --rm php composer install
FROM php:8.3-fpm

# System deps + extensions:
#  - pdo_pgsql: Postgres 16 (app database)
#  - pdo_sqlite: in-memory PDO for PHPUnit smoke tests (no live DB needed)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev libsqlite3-dev git unzip \
    && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-install pdo_pgsql pdo_sqlite opcache bcmath

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /app

CMD ["php-fpm"]

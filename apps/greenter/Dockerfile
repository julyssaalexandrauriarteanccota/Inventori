FROM php:8.3-cli-alpine

WORKDIR /app
RUN apk add --no-cache curl-dev git libxml2-dev libzip-dev unzip zlib-dev \
  && docker-php-ext-install curl soap zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY composer.json ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader

COPY . /app

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]

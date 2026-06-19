FROM mysql:8.0
COPY product.sql /docker-entrypoint-initdb.d/init.sql

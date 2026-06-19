FROM mysql:8.0
COPY warehouse.sql /docker-entrypoint-initdb.d/init.sql

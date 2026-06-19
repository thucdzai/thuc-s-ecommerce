FROM mysql:8.0
COPY shipping.sql /docker-entrypoint-initdb.d/init.sql

FROM mysql:8.0
COPY order.sql /docker-entrypoint-initdb.d/init.sql

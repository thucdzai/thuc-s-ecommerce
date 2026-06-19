FROM mysql:8.0
COPY cart.sql /docker-entrypoint-initdb.d/init.sql

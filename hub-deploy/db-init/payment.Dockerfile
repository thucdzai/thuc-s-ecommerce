FROM mysql:8.0
COPY payment.sql /docker-entrypoint-initdb.d/init.sql

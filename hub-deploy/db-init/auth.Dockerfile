FROM mysql:8.0
COPY auth.sql /docker-entrypoint-initdb.d/init.sql

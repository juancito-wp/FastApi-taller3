FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# En Railway el contexto de build suele ser la RAÍZ del repo y no la carpeta del
# servicio (Modelos_ML/RegresionLineal/front), así que copiamos todo el contexto
# y localizamos el proyecto de Django en cualquiera de los dos casos:
#   - build desde esta carpeta        -> /src/manage.py
#   - build desde la raíz del repo    -> /src/Modelos_ML/RegresionLineal/front/manage.py
COPY . /src

RUN set -eux; \
    if [ -f /src/manage.py ]; then \
        APP_DIR=/src; \
    else \
        APP_DIR=/src/Modelos_ML/RegresionLineal/front; \
    fi; \
    cp -a "$APP_DIR"/. /app/; \
    rm -rf /src; \
    pip install --no-cache-dir --upgrade pip; \
    pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

# Aplica migraciones y arranca Gunicorn en el puerto que Railway inyecta en $PORT.
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}"]

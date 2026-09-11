# Tasador de Viviendas con Regresión Lineal

Aplicación web que estima el precio de una vivienda (en COP) a partir de su superficie en metros cuadrados, usando un modelo de **regresión lineal** entrenado con scikit-learn.

El sistema está dividido en dos servicios independientes:

- **`back/`** — API REST con FastAPI que carga el modelo y expone las predicciones.
- **`front/`** — Interfaz web en Django con un formulario que consume esa API.

---

## Arquitectura

```
┌─────────────────┐        POST /predict          ┌──────────────────┐
│   front (Django)│  ── {"area_m2": 85.5} ──►     │   back (FastAPI) │
│   puerto 8001   │  ◄── {"predicted_price"} ──   │   puerto 8000    │
└─────────────────┘                               └──────────────────┘
        │                                                  │
   index.html                                       linear_model.joblib
   (tema oscuro neón)                               (scikit-learn)
```

El usuario envía el área desde el formulario, Django hace la petición HTTP al back y muestra el precio con una animación de conteo.

> Esos son los puertos en local. Dentro de Docker cada servicio escucha en la variable `$PORT` (8000 por defecto).

---

## Estructura

```
RegresionLineal/
├── back/
│   ├── Dockerfile
│   ├── main.py                     # API FastAPI (/, /predict)
│   ├── train.py                    # entrena y guarda el modelo
│   ├── requirements.txt
│   └── models/                     # linear_model.joblib (generado, no versionado)
└── front/
    ├── Dockerfile
    ├── .dockerignore
    ├── manage.py
    ├── requirements.txt
    ├── app_prediccion/
    │   ├── urls.py
    │   ├── views.py                # llama a la API del back
    │   └── templates/index.html    # interfaz con tema oscuro neón
    └── config/
        ├── settings.py             # ALLOWED_HOSTS, CSRF y DEBUG configurables por entorno
        └── urls.py
```

---

## Requisitos

- **Back:** Python 3.10 o superior
- **Front:** Python 3.12 o superior (Django 6.x no soporta versiones anteriores)
- Docker (opcional, para levantar los contenedores)

---

## Ejecución local

### 1. Back (API)

```bash
cd back

# Crear e instalar el entorno
python -m venv venv
source venv/Scripts/activate     # Windows (Git Bash)  |  macOS/Linux: source venv/bin/activate
pip install -r requirements.txt

# Entrenar el modelo (genera models/linear_model.joblib)
python train.py

# Levantar la API
uvicorn main:app --reload --port 8000
```

La API queda en `http://127.0.0.1:8000`. Documentación interactiva en `http://127.0.0.1:8000/docs`.

### 2. Front (interfaz web)

En **otra terminal**:

```bash
cd front

python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt

# Apuntar al back local (si no, usa este valor por defecto)
export API_URL=http://127.0.0.1:8000/predict

python manage.py migrate
python manage.py runserver 8001
```

Abre `http://127.0.0.1:8001`, escribe un área en m² y pulsa **Calcular Precio**.

> El front corre en el **8001** para no chocar con el back, que ocupa el 8000.

### Panel de administración (opcional)

```bash
python manage.py createsuperuser
```

Luego entra en `http://127.0.0.1:8001/admin/`.

---

## API del back

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/` | Health check. Devuelve `model_loaded` para saber si el modelo se cargó |
| `POST` | `/predict` | Recibe un área y devuelve el precio estimado |

**Ejemplo de petición:**

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"area_m2": 85.5}'
```

**Respuesta:**

```json
{
  "area_m2": 85.5,
  "predicted_price": 496094594.59
}
```

Si el modelo no está disponible, `/predict` responde `502` con un mensaje de error.

---

## Modelo

`train.py` entrena una `LinearRegression` de scikit-learn con seis puntos de datos de superficie frente a precio, y guarda el resultado en `models/linear_model.joblib`.

La recta que aprende es aproximadamente:

```
precio ≈ 5.972.973 × area_m2 − 14.594.595   (COP)
```

La carpeta `models/` está en `.gitignore` (los `*.joblib` no se versionan), así que:

- En local hay que ejecutar `python train.py` una vez.
- En el contenedor, el `Dockerfile` del back ejecuta `python train.py` durante el build.

---

## Despliegue en Railway

El repo es un **monorepo**: `front/` y `back/` son servicios distintos que se despliegan desde el mismo repositorio de GitHub. Por eso cada servicio necesita su propio **Root Directory**.

### Servicio 1 — back

| Ajuste | Valor |
|---|---|
| Root Directory | `Modelos_ML/RegresionLineal/back` |
| Variables | `PORT=8000` |
| Target port del dominio | `8000` |

Verifica en los **Deploy Logs** que aparezca:

```
Uvicorn running on http://0.0.0.0:8000
```

Prueba el health check abriendo `https://<dominio-del-back>/`:

```json
{"status":"OK","message":"...","model_loaded":true}
```

### Servicio 2 — front

| Ajuste | Valor |
|---|---|
| Root Directory | `Modelos_ML/RegresionLineal/front` |
| Variables | `API_URL=https://<dominio-del-back>/predict` |
| Target port del dominio | `8000` |

### Problemas típicos

- **`502` al abrir el dominio** → el target port del dominio no coincide con el puerto en el que escucha la app. Ajusta el puerto del dominio con el ícono de lápiz, o fija `PORT=8000` en las Variables del servicio.
- **`400 Bad Request` / `DisallowedHost`** → falta el dominio en `ALLOWED_HOSTS` (por defecto ya acepta `*.up.railway.app`).
- **"No se pudo conectar con la API"** en el front → `API_URL` mal configurada. Debe ser la URL pública del back **con `/predict` al final y sin puerto**.
- **El formulario da 403** → revisa `CSRF_TRUSTED_ORIGINS` si usas un dominio propio.

---

## Variables de entorno

| Variable | Servicio | Por defecto | Descripción |
|---|---|---|---|
| `API_URL` | front | `http://127.0.0.1:8000/predict` | Endpoint del back al que se envían las predicciones |
| `PORT` | ambos | `8000` | Puerto interno en el que escucha el contenedor |
| `DJANGO_DEBUG` | front | `True` en local, `False` si existe `PORT` | Fuerza el modo depuración |
| `DJANGO_SECRET_KEY` | front | clave de desarrollo | Clave secreta de Django |
| `ALLOWED_HOSTS` | front | — | Hosts extra separados por comas |
| `CSRF_TRUSTED_ORIGINS` | front | — | Orígenes de confianza extra, separados por comas |

---

## Tecnologías

**Back:** Python · FastAPI · Uvicorn · scikit-learn · joblib · NumPy · Pydantic
**Front:** Python · Django · Gunicorn · Bootstrap Icons · HTML/CSS/JS
**Despliegue:** Docker · Railway

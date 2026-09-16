# 📷 py_img — Detección de rostros en imágenes y en tiempo real

Aplicación web para detectar rostros con **Python + OpenCV**. Permite subir una imagen o usar la cámara web en vivo; el resultado se devuelve con los rostros enmarcados en verde y el conteo de cuántos se detectaron.

> **Ruta del proyecto en esta máquina**
>
> ```
> C:\Users\Valeria\Desktop\taller3_pyml\Modelos_ML\py_img\py_img-main
> ```

---

## 📋 Tabla de contenido

- [Características](#-características)
- [Stack tecnológico](#-stack-tecnológico)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Instalación y ejecución local](#-instalación-y-ejecución-local)
- [Cómo usarlo](#-cómo-usarlo)
- [Referencia de la API](#-referencia-de-la-api)
- [Cómo funciona](#-cómo-funciona)
- [Despliegue en Vercel](#-despliegue-en-vercel)
- [Problemas comunes](#-problemas-comunes)
- [Autor](#-autor)

---

## ✨ Características

- **Dos modos de entrada**: subir una archivo de imagen o usar la cámara web.
- **Detección en vivo**: procesa un frame cada 600 ms desde la cámara.
- **Arrastrar y soltar** para cargar imágenes, además del selector clásico.
- **Rostros enmarcados**: OpenCV dibuja los recuadros verdes sobre la imagen.
- **Conteo de rostros**: contador de la escena actual y acumulado en el encabezado.
- **Interfaz oscura tipo HUD** con fondo animado, paneles de cristal y microanimaciones (sin frameworks CSS).
- **Cambio de cámara** frontal / trasera en dispositivos que la tengan.
- **Diagnóstico integrado**: si el backend falla, la interfaz lo dice en pantalla en vez de quedarse muda.

---

## 🧰 Stack tecnológico

| Capa | Tecnología |
| :--- | :--- |
| Backend | Python + Flask (aplicación WSGI) |
| Visión por computador | OpenCV (`opencv-python-headless`) |
| Clasificador | Haar Cascade `haarcascade_frontalface_default.xml` |
| Datos | NumPy |
| Frontend | HTML, CSS y JavaScript puros (sin dependencias) |
| Despliegue | Vercel (el backend Flask se publica como Vercel Function) |

---

## 📁 Estructura del proyecto

```plaintext
py_img-main/
│
├── app.py                               # Backend Flask: detección y diagnóstico
│
├── public/
│   ├── index.html                       # Interfaz del frontend
│   ├── style.css                        # Tema visual (oscuro / HUD)
│   ├── script.js                        # Lógica del cliente y llamadas a la API
│   └── logosena.png                     # Logotipo y favicon
│
├── haarcascade_frontalface_default.xml  # Clasificador de rostros de OpenCV
├── requirements.txt                     # Dependencias para Vercel
├── vercel.json                          # Configuración de despliegue
├── .gitignore                           # Cachés y entornos virtuales fuera del repo
└── README.md
```

---

## ⚙️ Instalación y ejecución local

### 1. Ir a la raíz del proyecto

```bash
cd "C:/Users/Valeria/Desktop/taller3_pyml/Modelos_ML/py_img/py_img-main"
```

### 2. Instalar dependencias

Para correr el servidor en local solo hace falta **Flask**:

```bash
python -m pip install flask
```

> ⚠️ **No ejecutes `pip install -r requirements.txt` en tu Python local.** Ese archivo está fijado para el runtime de Vercel (Python 3.12). En un Python más nuevo (3.13/3.14) `numpy==1.26.4` y `opencv-python-headless==4.9.0.80` no tienen wheels y la instalación falla.
>
> Si prefieres un entorno aislado, crea un virtualenv e instala las versiones sin fijar:
>
> ```bash
> python -m venv .venv
> source .venv/Scripts/activate     # PowerShell: .venv\Scripts\Activate.ps1
> pip install flask opencv-python-headless numpy
> ```

### 3. Arrancar el servidor

```bash
python app.py
```

Verás algo así:

```plaintext
[py_img] Clasificador Haar cargado desde: ...\haarcascade_frontalface_default.xml
 * Running on http://127.0.0.1:5000
```

### 4. Abrir la aplicación

Entra a **<http://localhost:5000>** en el navegador.

> 🚫 **No abras `public/index.html` con doble clic ni uses Live Server.** Esos servidores solo reparten archivos estáticos: no ejecutan Python, así que `/api/detect` no existe, la detección nunca responde y el panel "Resultado del servidor" se queda vacío. Flask sirve en el mismo puerto el frontend y la API, así que todo debe abrirse desde `http://localhost:5000`.

El servidor arranca con recarga automática (`debug=True`): al guardar cambios se reinicia solo. Para detenerlo usa `Ctrl+C`.

---

## 🖱 Cómo usarlo

1. Abre la aplicación en <http://localhost:5000>.
2. Elige el modo en el selector superior:
   - **Subir archivo**: arrastra una imagen a la zona de carga (o haz clic para buscarla) y pulsa **Procesar imagen**.
   - **Usar cámara**: pulsa **Encender cámara** y autoriza el permiso del navegador. Con **Cambiar cámara** alternas entre frontal y trasera, y con **Apagar cámara** detienes el flujo.
3. Mira el panel de la derecha: **Vista previa / origen** muestra la imagen original y **Resultado del servidor** la imagen con los rostros enmarcados.
4. El contador **Rostros detectados en la escena** aparece sobre el panel de resultados; el encabezado acumula detecciones y frames analizados durante la sesión.

> La cámara solo funciona en un contexto seguro: `localhost` o HTTPS. Si abres la página desde `file://`, el navegador niega el acceso a la cámara.

---

## 🔌 Referencia de la API

### `POST /api/detect` — Detectar rostros

Recibe la imagen como `multipart/form-data` en el campo `image`.

```bash
curl -X POST -F "image=@public/logosena.png" http://localhost:5000/api/detect
```

**Respuesta `200`:**

```json
{
  "success": true,
  "faces_detected": 2,
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

| Campo | Descripción |
| :--- | :--- |
| `success` | `true` si la imagen se procesó correctamente. |
| `faces_detected` | Número de rostros encontrados en esa imagen o frame. |
| `image` | Imagen resultante en base64, con los recuadros verdes pintados por OpenCV. |

**Errores:**

| Código | Cuándo |
| :--- | :--- |
| `400` | No se envió el campo `image`, o el archivo no es una imagen válida. |
| `500` | Error inesperado. La respuesta incluye un objeto `diagnostico` con el detalle. |

### `GET /api/detect` — Diagnóstico del servidor

Devuelve el estado del backend en JSON: si el clasificador Haar cargó y desde dónde, las rutas que se probaron, y las versiones de Python, OpenCV y NumPy.

```bash
curl http://localhost:5000/api/detect
```

Es la forma más rápida de comprobar un despliegue: abre la URL en el navegador y busca `"cascade_ok": true`.

### Rutas del frontend

| Ruta | Descripción |
| :--- | :--- |
| `GET /` | Sirve `public/index.html`. |
| `GET /<path>` | Sirve el resto de archivos estáticos de `public/` (`style.css`, `script.js`, `logosena.png`). |

---

## 🧠 Cómo funciona

1. El usuario sube una imagen o el navegador captura un frame de la cámara cada 600 ms (se dibuja en un `<canvas>` y se exporta como JPEG con calidad 0.7).
2. El frontend envía ese archivo por `FormData` al endpoint `/api/detect`.
3. Flask decodifica los bytes con `cv2.imdecode`, pasa la imagen a escala de grises y busca rostros con `CascadeClassifier.detectMultiScale(scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))`.
4. Cada rostro encontrado se enmarca con `cv2.rectangle` en verde sobre una copia de la imagen original.
5. La imagen con los recuadros se comprime a JPEG, se codifica en base64 y se devuelve al navegador, que la muestra en el panel de resultados y actualiza el contador.

---

## ☁️ Despliegue en Vercel

El proyecto ya incluye `vercel.json` con la configuración actual:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "app.py": {
      "includeFiles": "haarcascade_frontalface_default.xml",
      "maxDuration": 30
    }
  }
}
```

**Puntos importantes al desplegar:**

1. **Ubicación del backend — el punto más delicado.** El runtime de Python de Vercel solo reconoce como entrypoint a `app.py`, `index.py`, `server.py`, `main.py`, `wsgi.py` o `asgi.py`, y solo si están en la **raíz** del proyecto o dentro de `src/` o `app/`. Por eso el backend vive en la raíz como `app.py`, y no en una carpeta `api/`. Si lo mueves a otra ubicación, tendrás que declararlo a mano en `pyproject.toml`:

   ```toml
   [tool.vercel]
   entrypoint = "mi_carpeta.app:app"
   ```
2. **No fuerces un preset de frontend** (Next.js, Vite, etc.) en el dashboard del proyecto. Vercel detecta Flask automáticamente al encontrar la dependencia en `requirements.txt`, y enruta todas las peticiones al backend.
3. Al ser un preset de Python, **todo el tráfico pasa por la función Flask**, incluidos `style.css`, `script.js` y las imágenes: Flask los sirve desde `public/`. Por eso no se usa `outputDirectory`.
4. **No crees un archivo `.python-version`**: el proyecto debe quedarse en el Python por defecto de Vercel (3.12), que es el que tiene wheels para las versiones fijadas en `requirements.txt`.
5. `includeFiles` garantiza que el `.xml` del clasificador viaje dentro de la función. Aun así, el backend lo busca en varias rutas y como último recurso usa la copia que viene incluida en `opencv-python-headless`, así que la detección funciona incluso si el archivo no se empaqueta.
6. `maxDuration: 30` da margen suficiente al *cold start* de OpenCV en la primera petición.
7. **Verifica después de desplegar**: abre `https://TU-APP.vercel.app/api/detect` en el navegador. Debe responder con `"cascade_ok": true` y la ruta desde donde cargó el clasificador.
8. Recuerda que un cambio en el backend requiere **volver a desplegar**; el sitio publicado no se actualiza solo.

> ⚠️ **Límite de tamaño**: Vercel rechaza los cuerpos de petición mayores a **4.5 MB**. Una fotografía de celular puede superar ese tamaño y devolver un error `413` antes de llegar a Flask. Si pasa, conviene redimensionar la imagen en el navegador antes de enviarla.

---

## 🩺 Problemas comunes

| Síntoma | Causa y solución |
| :--- | :--- |
| El panel "Resultado del servidor" se queda vacío y no aparece el conteo | El backend no está atendiendo `/api/detect`. Abre la app desde <http://localhost:5000> con `python app.py` corriendo; no uses Live Server ni abras el HTML directo. |
| Aviso rojo con `404` en `/api/detect` | La ruta no existe en el servidor actual. Arranca Flask (`python app.py`) y entra por `http://localhost:5000`. |
| Vercel: `No python entrypoint found in default locations` | El backend no está en una ubicación que Vercel reconozca. Debe llamarse `app.py` (o `index.py`, `server.py`, `main.py`, `wsgi.py`, `asgi.py`) y estar en la raíz, en `src/` o en `app/`; si no, declara el entrypoint en `pyproject.toml`. |
| `500` con `(-215:Assertion failed) !empty()` | El clasificador Haar cargó vacío porque no encontró el `.xml`. Revisa `GET /api/detect`: debe aparecer `"cascade_ok": true`. |
| La cámara no enciende o da error de permisos | `getUserMedia` solo funciona en `localhost` o HTTPS, nunca desde `file://`. Usa `http://localhost:5000`. |
| `ModuleNotFoundError: No module named 'flask'` | Falta Flask en el intérprete con el que ejecutas: `python -m pip install flask`. |
| `413` o "la imagen es demasiado grande" | La imagen supera el límite de 4.5 MB del servidor. Usa una imagen más liviana. |
| El aviso rojo dice que se detuvo la cámara | El modo cámara se detiene solo tras 3 fallos seguidos del backend, para no seguir enviando frames. Revisa el servidor y vuelve a encenderla. |

---

## 👤 Autor

**Juan Miguel Gallego**

Proyecto de Python y Machine Learning — © 2026

from flask import Flask, request, jsonify, send_from_directory
import cv2
import numpy as np
import base64
import os
import platform
import sys

# ==========================================================================
# RUTAS DEL PROYECTO
# ==========================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CASCADE_FILENAME = "haarcascade_frontalface_default.xml"


# La carpeta public/ se busca en varias ubicaciones para que el mismo archivo
# funcione tanto en la raíz del proyecto (app.py) como dentro de api/.
def _public_dir():
    candidatos = [
        os.path.join(BASE_DIR, "public"),  # backend en la raíz del proyecto
        os.path.join(os.path.dirname(BASE_DIR), "public"),  # backend dentro de api/
        os.path.join(os.getcwd(), "public"),
        os.path.join("/var/task", "public"),  # bundle de Vercel
    ]

    for path in candidatos:
        if os.path.isdir(path):
            return path

    return candidatos[0]


PUBLIC_DIR = _public_dir()

app = Flask(__name__, static_folder=PUBLIC_DIR)


# ==========================================================================
# CARGA DEL CLASIFICADOR DE ROSTROS (Haar Cascade)
# ==========================================================================
# El .xml no siempre viaja dentro del bundle del servidor: en despliegues
# serverless solo se empaqueta lo que el build puede resolver. Por eso se
# busca en varias ubicaciones posibles y, como última opción, se usa la copia
# que ya viene incluida en opencv-python-headless.
def _cascade_paths():
    roots = [
        BASE_DIR,  # api/ (layout clásico con vercel.json builds)
        os.path.dirname(BASE_DIR),  # raíz del proyecto
        os.getcwd(),  # base del proyecto en Vercel
        "/var/task",  # raíz del bundle en Vercel
    ]

    paths = [os.path.join(root, CASCADE_FILENAME) for root in roots]

    try:
        import cv2.data  # incluido en opencv-python-headless

        paths.append(os.path.join(cv2.data.haarcascades, CASCADE_FILENAME))
    except Exception:
        pass

    # Sin duplicados y conservando el orden de prioridad
    return list(dict.fromkeys(os.path.normpath(p) for p in paths))


_face_classifier = None
_classifier_path = None


def get_face_classifier():
    """Carga el clasificador una sola vez (lazy) con un error claro si falla."""
    global _face_classifier, _classifier_path

    if _face_classifier is not None:
        return _face_classifier

    for path in _cascade_paths():
        if not os.path.exists(path):
            continue

        classifier = cv2.CascadeClassifier(path)
        if not classifier.empty():
            _face_classifier = classifier
            _classifier_path = path
            print(f"[py_img] Clasificador Haar cargado desde: {path}")
            return _face_classifier

    probadas = "\n".join(f"  - {p}" for p in _cascade_paths())
    raise RuntimeError(
        "No se pudo cargar "
        f"{CASCADE_FILENAME}. Rutas probadas:\n{probadas}"
    )


# ==========================================================================
# DIAGNÓSTICO DEL DESPLIEGUE
# ==========================================================================
def _diagnostico():
    try:
        get_face_classifier()
        cascade_ok, cascade_error = True, None
    except Exception as e:
        cascade_ok, cascade_error = False, str(e)

    return {
        "cascade_ok": cascade_ok,
        "cascade_path": _classifier_path,
        "cascade_error": cascade_error,
        "cascade_candidates": {
            p: os.path.exists(p) for p in _cascade_paths()
        },
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "cv2": cv2.__version__,
        "numpy": np.__version__,
        "cwd": os.getcwd(),
        "cwd_files": sorted(os.listdir(os.getcwd()))[:40]
        if os.path.isdir(os.getcwd())
        else [],
        "base_dir": BASE_DIR,
    }


@app.route("/api/health")
def health():
    data = _diagnostico()
    status = 200 if data["cascade_ok"] else 500
    return jsonify(data), status


# ==========================================================================
# FRONTEND ESTÁTICO (public/)
# ==========================================================================
@app.route("/")
def serve_index():
    return send_from_directory(PUBLIC_DIR, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(PUBLIC_DIR, path)


# ==========================================================================
# DETECCIÓN DE ROSTROS
# ==========================================================================
@app.route("/api/detect", methods=["GET", "POST"])
@app.route("/api/index", methods=["GET", "POST"])  # alias por si el runtime enruta por nombre
def detect_faces():
    # GET /api/detect -> diagnóstico: permite verificar el despliegue desde el navegador
    if request.method == "GET":
        data = _diagnostico()
        return jsonify(data), (200 if data["cascade_ok"] else 500)

    if "image" not in request.files:
        return jsonify({"error": "No se proporcionó ninguna imagen"}), 400

    file = request.files["image"]

    try:
        face_classifier = get_face_classifier()

        filestr = file.read()
        npimg = np.frombuffer(filestr, np.uint8)
        img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({"error": "Formato de imagen inválido"}), 400

        # 1. Crear una copia explícita para pintar el resultado y no perder la referencia
        output_img = img.copy()

        # Convertir a escala de grises para el clasificador
        gray_image = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        faces = face_classifier.detectMultiScale(
            gray_image, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40)
        )

        # 2. Dibujar los rectángulos directamente sobre la copia de salida
        for x, y, w, h in faces:
            # Color BGR: (0, 255, 0) es Verde Puro. Grosor: 3px
            cv2.rectangle(output_img, (x, y), (x + w, y + h), (0, 255, 0), 3)

        # 3. CRUCIAL: Codificar la imagen "output_img" (la que tiene los recuadros)
        _, buffer = cv2.imencode(".jpg", output_img)

        encoded_image = base64.b64encode(buffer).decode("utf-8")

        return jsonify(
            {
                "success": True,
                "faces_detected": len(faces),
                "image": f"data:image/jpeg;base64,{encoded_image}",
            }
        )

    except Exception as e:
        # Se devuelve el diagnóstico para poder resolver fallos en producción
        return jsonify({"error": str(e), "diagnostico": _diagnostico()}), 500


# Requerido para Vercel Serverless
app.debug = False


if __name__ == "__main__":
    # Servidor de desarrollo local:  python app.py  ->  http://localhost:5000
    app.run(host="0.0.0.0", port=5000, debug=True)

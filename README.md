# Taller 3 — Python y Machine Learning

Repositorio del taller con ejercicios de **carga y preparación de datos** y dos **modelos de Machine Learning** desplegados como aplicaciones web.

---

## Contenido

| Carpeta | Qué contiene | Tecnología | Despliegue |
|---|---|---|---|
| [`Carga_datos/`](Carga_datos/) | Notebooks de carga de datos (CSV, Excel, API, Web Scraping) | Pandas · Jupyter | — |
| [`Modelos_ML/RandomForest/`](Modelos_ML/RandomForest/) | Diagnóstico clínico a partir de 34 variables médicas | scikit-learn · Streamlit | [modelosml.streamlit.app](https://modelosml.streamlit.app/) |
| [`Modelos_ML/RegresionLineal/`](Modelos_ML/RegresionLineal/) | Tasador de precios de vivienda según m² (API + web) | scikit-learn · FastAPI · Django | Railway |

---

## 1. Carga de datos

Cuatro notebooks que muestran distintas fuentes de datos y las tareas típicas de limpieza con Pandas (valores nulos, duplicados, variables categóricas).

| Notebook | Fuente | Qué se practica |
|---|---|---|
| `1.csv_carga_datos.ipynb` | `dataset_ventas.csv` | Lectura de CSV, valores nulos y duplicados, LabelEncoder y One-Hot Encoding |
| `2.excel_carga_datos.ipynb` | `dataset_ventas.xlsx` | Lectura de Excel con `openpyxl` y la misma limpieza |
| `3.api_carga_datos.ipynb` | API pública (Rick and Morty) | Consumir una API REST con `requests` y convertirla en DataFrame |
| `4.webscraping_carga_datos.ipynb` | Wikipedia | Extraer una tabla HTML con `requests` + `StringIO` |

### Ejecutar

```bash
cd Carga_datos
pip install pandas numpy openpyxl requests jupyter
jupyter notebook
```

> Los notebooks leen los archivos por nombre relativo, así que **hay que abrirlos desde la carpeta `Carga_datos/`**.

---

## 2. Random Forest — Diagnóstico clínico

Sistema que estima un diagnóstico entre **cinco enfermedades** (infarto, neumonía, gripe, ansiedad y gastroenteritis) a partir de **34 variables clínicas**: signos vitales, factores de riesgo y síntomas.

El pipeline son tres scripts encadenados:

| Script | Qué hace |
|---|---|
| `1.Crear_dataset.py` | Genera un dataset sintético de 5000 pacientes con distribuciones realistas por enfermedad |
| `2.Entrenar_modelo.py` | Entrena un `RandomForestClassifier` (200 árboles, split 70/30) y muestra accuracy, reporte de clasificación e importancia de variables |
| `3.Predecir_enfermedad.py` | App de Streamlit con formulario por pestañas, probabilidades por enfermedad y gráfico comparativo |

### Ejecutar

```bash
# Desde la RAÍZ del repositorio
pip install -r Modelos_ML/RandomForest/requirements.txt

python Modelos_ML/RandomForest/1.Crear_dataset.py
python Modelos_ML/RandomForest/2.Entrenar_modelo.py
streamlit run Modelos_ML/RandomForest/3.Predecir_enfermedad.py
```

> Los scripts usan rutas relativas a la raíz (`Modelos_ML/RandomForest/...`), así que **deben ejecutarse desde la raíz del repositorio**, no desde su carpeta.

**App en vivo:** https://fastapi-taller3-onqn7nokbdwvmokaww8usc.streamlit.app//

---

## 3. Regresión Lineal — Tasador de viviendas

Aplicación cliente-servidor que estima el precio de una vivienda (en COP) a partir de su superficie en metros cuadrados. Es el único proyecto del taller separado en **dos servicios independientes**:

- **`back/`** — API REST con FastAPI que expone `/predict`.
- **`front/`** — Interfaz web en Django con tema oscuro neón.

### Ejecutar

```bash
# Terminal 1 — API
cd Modelos_ML/RegresionLineal/back
python -m venv venv && source venv/Scripts/activate
pip install -r requirements.txt
python train.py
uvicorn main:app --reload --port 8000

# Terminal 2 — web
cd Modelos_ML/RegresionLineal/front
python -m venv venv && source venv/Scripts/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001
```

📖 **Instrucciones completas, API y despliegue en Railway:** [`Modelos_ML/RegresionLineal/README.md`](Modelos_ML/RegresionLineal/README.md)

---

## Despliegues

| Proyecto | Plataforma | Enlace |
|---|---|---|
| Random Forest | Streamlit Cloud | https://fastapi-taller3-onqn7nokbdwvmokaww8usc.streamlit.app/ |
| Regresión Lineal — front | Railway | `https://front-production-a972.up.railway.app/` |
| Regresión Lineal — back | Railway | `https://fastapi-taller3-production.up.railway.app/` |
| Py_img - Desplegado en Vercel     | `https://pyimg-main.vercel.app/`

---

## Requisitos

- **Python 3.12 o superior** para el proyecto de Regresión Lineal (Django 6.x). El resto funciona desde 3.10.
- `pip` y, opcionalmente, `jupyter` para los notebooks.

Cada subproyecto tiene su propio `requirements.txt`; conviene usar un **entorno virtual por proyecto** para evitar conflictos de versiones entre ellos.

---

## Estructura del repositorio

```
taller3_pyml/
├── Carga_datos/                    # Notebooks de carga y limpieza de datos
├── Modelos_ML/
│   ├── RandomForest/               # Diagnóstico clínico (Streamlit)
│   └── RegresionLineal/
│       ├── back/                   # API FastAPI
│       └── front/                  # Web Django
└── README.md
```

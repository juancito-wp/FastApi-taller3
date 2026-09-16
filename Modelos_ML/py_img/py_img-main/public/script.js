// ==========================================
// 1. REFERENCIAS A ELEMENTOS COMUNES
// ==========================================
const loader = document.getElementById("loader");
const imgResult = document.getElementById("imgResult");
const metricsZone = document.getElementById("metricsZone");
const faceCount = document.getElementById("faceCount");
const emptyResult = document.getElementById("emptyResult");
const statFaces = document.getElementById("statFaces");
const statFrames = document.getElementById("statFrames");
const errorZone = document.getElementById("errorZone");
const errorText = document.getElementById("errorText");

// ==========================================
// 2. REFERENCIAS MODO ARCHIVO (UPLOAD)
// ==========================================
const sectionUpload = document.getElementById("sectionUpload");
const btnModeUpload = document.getElementById("btnModeUpload");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const btnProcess = document.getElementById("btnProcess");
const imgOriginal = document.getElementById("imgOriginal");
const boxOriginal = document.getElementById("boxOriginal");
const emptyOriginal = document.getElementById("emptyOriginal");

// ==========================================
// 3. REFERENCIAS MODO CÁMARA (WEBCAM)
// ==========================================
const sectionCamera = document.getElementById("sectionCamera");
const btnModeCamera = document.getElementById("btnModeCamera");
const video = document.getElementById("webcam");
const canvas = document.getElementById("canvasFrame");
const btnStartCamera = document.getElementById("btnStartCamera");
const btnStopCamera = document.getElementById("btnStopCamera");
const btnToggleCamera = document.getElementById("btnToggleCamera");

// ==========================================
// 4. REFERENCIAS DE LA INTERFAZ DINÁMICA
// ==========================================
const modeSelector = document.getElementById("modeSelector");
const viewport = document.getElementById("viewport");
const cursorGlow = document.getElementById("cursorGlow");

// ==========================================
// 5. VARIABLES DE ESTADO
// ==========================================
let selectedFile = null;
let streamInstance = null;
let streamInterval = null;
let isStreaming = false;
let currentFacingMode = "user"; // "user" = frontal | "environment" = trasera
let totalFacesDetected = 0;
let framesAnalyzed = 0;

// ==========================================
// 6. EFECTOS DINÁMICOS (CURSOR Y CONTADORES)
// ==========================================
if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  window.addEventListener("pointermove", (e) => {
    const half = cursorGlow.offsetWidth / 2;
    cursorGlow.style.setProperty("--mx", `${e.clientX - half}px`);
    cursorGlow.style.setProperty("--my", `${e.clientY - half}px`);
    cursorGlow.classList.add("is-visible");
  });

  document.addEventListener("pointerleave", () => {
    cursorGlow.classList.remove("is-visible");
  });
}

// Reinicia una animación CSS para "rebotar" el número cuando cambia
function popNumber(element) {
  element.classList.remove("is-pop");
  void element.offsetWidth;
  element.classList.add("is-pop");
}

// ==========================================
// 7. CONTROL DE INTERFAZ (CONMUTACIÓN DE MODOS)
// ==========================================
btnModeUpload.addEventListener("click", () => switchMode("upload"));
btnModeCamera.addEventListener("click", () => switchMode("camera"));

function switchMode(mode) {
  const isUpload = mode === "upload";

  // El indicador deslizante se mueve solo con el atributo data-mode
  modeSelector.dataset.mode = mode;

  // Estilos de botones activos
  btnModeUpload.classList.toggle("is-active", isUpload);
  btnModeCamera.classList.toggle("is-active", !isUpload);
  btnModeUpload.setAttribute("aria-selected", String(isUpload));
  btnModeCamera.setAttribute("aria-selected", String(!isUpload));

  // Mostrar / ocultar secciones
  sectionUpload.classList.toggle("is-hidden", !isUpload);
  sectionCamera.classList.toggle("is-hidden", isUpload);
  boxOriginal.classList.toggle("is-hidden", !isUpload); // En cámara el resultado se centra

  if (isUpload) {
    // Detener flujos activos de cámara
    stopCameraFlow();
  } else {
    // Limpiar vistas de análisis anteriores
    imgResult.classList.add("is-hidden");
    metricsZone.classList.add("is-hidden");
    emptyResult.classList.remove("is-hidden");
  }
}

// ==========================================
// 8. LÓGICA MODO ARCHIVO (DRAG & DROP)
// ==========================================
["dragenter", "dragover"].forEach((name) => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((name) => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
});

dropZone.addEventListener("drop", (e) => {
  handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener("change", (e) => {
  handleFile(e.target.files[0]);
});

function handleFile(file) {
  if (file && file.type.startsWith("image/")) {
    selectedFile = file;
    btnProcess.disabled = false;

    const reader = new FileReader();
    reader.onload = (e) => {
      imgOriginal.src = e.target.result;
      clearError();
      imgOriginal.classList.remove("is-hidden");
      emptyOriginal.classList.add("is-hidden");
      imgResult.classList.add("is-hidden");
      emptyResult.classList.remove("is-hidden");
      metricsZone.classList.add("is-hidden");
    };
    reader.readAsDataURL(file);
  }
}

btnProcess.addEventListener("click", async () => {
  if (!selectedFile) return;
  const formData = new FormData();
  formData.append("image", selectedFile);

  // Mostrar estado de carga antes de la petición
  loader.classList.remove("is-hidden");
  imgResult.classList.add("is-hidden");

  await sendFrameToBackend(formData);
  loader.classList.add("is-hidden");
});

// ==========================================
// 9. LÓGICA MODO CÁMARA (FLUJO EN TIEMPO REAL)
// ==========================================
btnStartCamera.addEventListener("click", async () => {
  await initCamera();
  btnStartCamera.disabled = true;
  btnStopCamera.disabled = false;
  btnToggleCamera.classList.remove("is-hidden");
});

btnToggleCamera.addEventListener("click", async () => {
  currentFacingMode = currentFacingMode === "user" ? "environment" : "user";

  if (isStreaming) {
    clearInterval(streamInterval);
    if (streamInstance) {
      streamInstance.getTracks().forEach((track) => track.stop());
    }
    viewport.classList.remove("is-live");
    await initCamera();
  }
});

async function initCamera() {
  try {
    streamInstance = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 400 },
        height: { ideal: 300 },
        facingMode: currentFacingMode,
      },
      audio: false,
    });

    video.srcObject = streamInstance;
    isStreaming = true;
    clearError();
    imgResult.classList.remove("is-hidden");
    emptyResult.classList.add("is-hidden");
    viewport.classList.add("is-live");

    // Iniciar el intervalo de procesamiento (Cada 600ms)
    streamInterval = setInterval(processCameraFrame, 600);
  } catch (err) {
    console.error("Error al acceder a la cámara:", err);
    alert("No se pudo acceder a la cámara seleccionada.");
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
  }
}

btnStopCamera.addEventListener("click", stopCameraFlow);

function stopCameraFlow() {
  clearInterval(streamInterval);
  isStreaming = false;

  if (streamInstance) {
    streamInstance.getTracks().forEach((track) => track.stop());
  }

  video.srcObject = null;
  viewport.classList.remove("is-live");
  btnStartCamera.disabled = false;
  btnStopCamera.disabled = true;
  btnToggleCamera.classList.add("is-hidden");
  loader.classList.add("is-hidden");
}

async function processCameraFrame() {
  if (!isStreaming) return;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(
    async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append("image", blob, "frame.jpg");

      await sendFrameToBackend(formData);
    },
    "image/jpeg",
    0.7,
  );
}

// ==========================================
// 10. AVISOS DE ERROR EN LA INTERFAZ
// ==========================================
// Sin esto, cualquier fallo del backend se ve igual que "no hizo nada".
let ultimoError = "";
let erroresSeguidos = 0;

function describeFailure(status) {
  if (status === 404) {
    return "El backend no responde en /api/detect (404). Arranca el servidor con: python api/detect.py";
  }
  if (status === 413) {
    return "La imagen es demasiado grande para el servidor (límite ~4.5 MB).";
  }
  if (status === 408 || status === 504) {
    return "El servidor tardó demasiado en responder. Prueba con una imagen más pequeña.";
  }
  if (status >= 500) {
    return `El servidor falló con un error ${status}. Abre /api/detect en el navegador para ver el diagnóstico.`;
  }
  return `El servidor respondió ${status}.`;
}

function showError(message) {
  erroresSeguidos += 1;

  // En modo cámara esto se ejecuta cada 600 ms: no repetimos el mismo aviso
  if (message !== ultimoError) {
    ultimoError = message;
    errorText.textContent = message;
  }

  errorZone.classList.remove("is-hidden");

  // Si el backend no contesta, no tiene sentido seguir mandando frames
  if (erroresSeguidos === 3 && isStreaming) {
    stopCameraFlow();
    errorText.textContent = `${message} Se detuvo la cámara para no seguir enviando frames.`;
  }
}

function clearError() {
  ultimoError = "";
  erroresSeguidos = 0;
  errorZone.classList.add("is-hidden");
}

// ==========================================
// 11. COMUNICACIÓN ASÍNCRONA CON VERCEL API
// ==========================================
async function sendFrameToBackend(formData) {
  try {
    const response = await fetch("/api/detect", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      // Intentamos leer el mensaje concreto que devolvió el backend
      let detalle = "";
      try {
        const body = await response.json();
        detalle = body && body.error ? ` Detalle: ${body.error}` : "";
      } catch (e) {
        detalle = "";
      }

      showError(`${describeFailure(response.status)}${detalle}`);
      return;
    }

    const data = await response.json();

    if (data.success) {
      clearError();

      // Asignar el Base64 que contiene los recuadros verdes pintados por OpenCV
      imgResult.src = data.image;

      // Control de visibilidad
      imgResult.classList.remove("is-hidden");
      emptyResult.classList.add("is-hidden");
      metricsZone.classList.remove("is-hidden");

      // Actualizar contador de la escena (con animación)
      const detected = Number(data.faces_detected) || 0;
      faceCount.textContent = detected;
      popNumber(faceCount);

      // Estadísticas acumuladas del hero
      framesAnalyzed += 1;
      totalFacesDetected += detected;

      statFrames.textContent = framesAnalyzed;
      statFaces.textContent = totalFacesDetected;
      popNumber(statFrames);
      popNumber(statFaces);
    } else {
      showError(data.error || "El backend no devolvió ninguna imagen.");
    }
  } catch (error) {
    console.error("Error en la transmisión de datos:", error);
    showError(
      "No se pudo conectar con el backend (/api/detect). Verifica que el servidor Flask esté corriendo.",
    );
  }
}

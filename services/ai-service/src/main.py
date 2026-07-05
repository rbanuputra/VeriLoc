"""GeoFace AI Service — FastAPI + DeepFace.

Menyediakan endpoint untuk face embedding & verifikasi wajah.
Model DeepFace di-import secara lazy supaya proses startup tetap cepat
dan container tidak crash kalau bobot model belum ter-download.
"""

from __future__ import annotations

import io

from fastapi import FastAPI, File, HTTPException, UploadFile

app = FastAPI(title="GeoFace AI Service", version="0.1.0")


@app.get("/")
def root() -> dict:
    return {"service": "ai-service", "docs": "/docs"}


@app.get("/health")
def health() -> dict:
    """Liveness/readiness probe untuk Docker & K8s."""
    return {"status": "ok", "service": "ai-service"}


def _read_image(data: bytes):
    """Decode bytes -> numpy array (BGR) untuk DeepFace/OpenCV."""
    import numpy as np
    from PIL import Image

    try:
        image = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"File bukan gambar valid: {exc}")
    # RGB (PIL) -> BGR (OpenCV/DeepFace)
    return np.array(image)[:, :, ::-1]


@app.post("/embed")
async def embed(file: UploadFile = File(...)) -> dict:
    """Ekstrak face embedding dari sebuah gambar wajah."""
    from deepface import DeepFace

    img = _read_image(await file.read())
    try:
        result = DeepFace.represent(
            img_path=img,
            model_name="Facenet",
            enforce_detection=True,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Wajah tidak terdeteksi: {exc}")

    return {"count": len(result), "embeddings": result}


@app.post("/verify")
async def verify(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
) -> dict:
    """Bandingkan dua wajah, kembalikan apakah orang yang sama."""
    from deepface import DeepFace

    img1 = _read_image(await file1.read())
    img2 = _read_image(await file2.read())
    try:
        result = DeepFace.verify(
            img1_path=img1,
            img2_path=img2,
            model_name="Facenet",
            enforce_detection=True,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Wajah tidak terdeteksi: {exc}")

    return {
        "verified": bool(result["verified"]),
        "distance": result["distance"],
        "threshold": result["threshold"],
        "model": result["model"],
    }

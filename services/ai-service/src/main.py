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


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)) -> dict:
    """Ekstrak teks dari dokumen kontrak (PDF atau gambar).

    Strategi:
      - PDF berlapis teks (digital) → ambil teks langsung (cepat, akurat).
      - PDF hasil scan / gambar → OCR Tesseract (bahasa Indonesia + Inggris).
    """
    data = await file.read()
    name = (file.filename or "").lower()
    content_type = file.content_type or ""

    text = ""
    if name.endswith(".pdf") or "pdf" in content_type:
        text = _extract_pdf_text(data)
        if len(text.strip()) < 30:  # kemungkinan PDF hasil scan → OCR
            text = _ocr_pdf(data)
    else:
        text = _ocr_image(data)

    return {"text": text, "length": len(text)}


def _extract_pdf_text(data: bytes) -> str:
    import fitz  # PyMuPDF

    with fitz.open(stream=data, filetype="pdf") as doc:
        return "\n".join(page.get_text() for page in doc)


def _ocr_pdf(data: bytes) -> str:
    import fitz
    import pytesseract
    from PIL import Image

    out = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            out.append(pytesseract.image_to_string(img, lang="ind+eng"))
    return "\n".join(out)


def _ocr_image(data: bytes) -> str:
    import io

    import pytesseract
    from PIL import Image

    img = Image.open(io.BytesIO(data)).convert("RGB")
    return pytesseract.image_to_string(img, lang="ind+eng")


@app.post("/liveness")
async def liveness(file: UploadFile = File(...)) -> dict:
    """Deteksi liveness / anti-spoofing.

    Menolak wajah palsu (foto layar, cetakan, video). Memakai model
    anti-spoofing bawaan DeepFace (Fasnet). Mengembalikan `is_real` dan
    `antispoof_score` (0..1, makin tinggi makin yakin asli).
    """
    from deepface import DeepFace

    img = _read_image(await file.read())
    try:
        faces = DeepFace.extract_faces(
            img_path=img,
            anti_spoofing=True,
            enforce_detection=True,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Wajah tidak terdeteksi: {exc}")

    if not faces:
        raise HTTPException(status_code=422, detail="Wajah tidak terdeteksi")

    # Ambil wajah dengan area terbesar (wajah utama).
    face = max(faces, key=lambda f: f.get("facial_area", {}).get("w", 0))
    return {
        "is_real": bool(face.get("is_real", False)),
        "antispoof_score": float(face.get("antispoof_score", 0.0)),
    }


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

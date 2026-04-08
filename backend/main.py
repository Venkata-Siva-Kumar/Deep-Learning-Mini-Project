import io
import os
import uuid
import zipfile
from datetime import datetime, timezone
from threading import Lock

os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")

import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from model import Hybrid

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def resolve_path(path_value: str) -> str:
    if os.path.isabs(path_value):
        return path_value
    return os.path.join(BASE_DIR, path_value)


def parse_cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    if raw_origins.strip() == "*":
        return ["*"]
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


UPLOAD_DIR = resolve_path(os.getenv("UPLOAD_DIR", "uploads"))
OUTPUT_DIR = resolve_path(os.getenv("OUTPUT_DIR", "outputs"))
DOWNLOAD_DIR = resolve_path(os.getenv("DOWNLOAD_DIR", "downloads"))
MODEL_PATH = resolve_path(os.getenv("MODEL_PATH", "models/levir_pretrained.pth"))
CORS_ORIGINS = parse_cors_origins()
TARGET_SIZE = int(os.getenv("MODEL_INPUT_SIZE", "512"))

_MODEL = None
_MODEL_LOCK = Lock()

# This must be initialized before routes are registered.
app = FastAPI()

# Allow the deployed frontend to call the API without changing code.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")


def load_checkpoint(path_value: str):
    try:
        return torch.load(path_value, map_location="cpu", weights_only=True)
    except TypeError:
        return torch.load(path_value, map_location="cpu")


def get_model() -> Hybrid:
    global _MODEL

    if _MODEL is not None:
        return _MODEL

    with _MODEL_LOCK:
        if _MODEL is not None:
            return _MODEL

        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

        model = Hybrid()
        model.load_state_dict(load_checkpoint(MODEL_PATH))
        model.eval()
        _MODEL = model
        print(f"Model loaded successfully from {MODEL_PATH}")

    return _MODEL


@app.get("/")
def home():
    return {"message": "Building Change Detection API is running"}


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _MODEL is not None}


@app.post("/warmup")
def warmup():
    get_model()
    return {"status": "ok", "model_loaded": True}


def preprocess(image_path, target_size=TARGET_SIZE):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Unable to read image: {image_path}")

    orig_h, orig_w = img.shape[:2]
    scale = target_size / max(orig_h, orig_w)
    resized_w = int(orig_w * scale)
    resized_h = int(orig_h * scale)

    img_resized = cv2.resize(img, (resized_w, resized_h))
    pad_y = target_size - resized_h
    pad_x = target_size - resized_w
    pad_top = pad_y // 2
    pad_bottom = pad_y - pad_top
    pad_left = pad_x // 2
    pad_right = pad_x - pad_left

    img_padded = cv2.copyMakeBorder(
        img_resized,
        pad_top,
        pad_bottom,
        pad_left,
        pad_right,
        cv2.BORDER_CONSTANT,
        value=(0, 0, 0),
    )

    img_rgb = cv2.cvtColor(img_padded, cv2.COLOR_BGR2RGB)
    img_rgb = np.ascontiguousarray(img_rgb.transpose(2, 0, 1), dtype=np.float32) / 255.0
    img_tensor = torch.from_numpy(img_rgb).unsqueeze(0)

    return img_tensor, (orig_h, orig_w), (pad_top, pad_left), (resized_h, resized_w)


def create_mask(pred, output_path, orig_shape, pad, resized_shape):
    # Amplify logits slightly so subtle change regions are easier to threshold.
    pred = torch.sigmoid(pred * 6)

    mask = pred.squeeze().detach().cpu().numpy()
    mask = (mask > 0.5).astype(np.uint8) * 255

    pad_top, pad_left = pad
    resized_h, resized_w = resized_shape
    mask_cropped = mask[pad_top:pad_top + resized_h, pad_left:pad_left + resized_w]
    mask_resized = cv2.resize(mask_cropped, (orig_shape[1], orig_shape[0]), interpolation=cv2.INTER_NEAREST)

    cv2.imwrite(output_path, mask_resized)
    return mask_resized


def calculate_mask_stats(mask: np.ndarray) -> dict:
    binary_mask = (mask > 127).astype(np.uint8)
    total_pixels = binary_mask.size
    white_pixel_count = int(binary_mask.sum())
    changes_found = round((white_pixel_count / total_pixels) * 100) if total_pixels > 0 else 0

    num_labels, _, component_stats, _ = cv2.connectedComponentsWithStats(binary_mask, connectivity=8)
    buildings_detected = 0
    if num_labels > 1:
        building_areas = component_stats[1:, cv2.CC_STAT_AREA]
        buildings_detected = int(np.count_nonzero(building_areas >= 16))

    normalized_area = white_pixel_count / max(total_pixels, 1)
    confidence_score = (
        40
        if white_pixel_count == 0
        else min(
            100,
            max(
                50,
                round(80 - abs(0.12 - normalized_area) * 100 + min(10, buildings_detected)),
            ),
        )
    )

    return {
        "buildingsDetected": buildings_detected,
        "changesFound": changes_found,
        "confidenceScore": confidence_score,
    }


def make_unique_filename(original_name: str) -> str:
    _, ext = os.path.splitext(original_name)
    if not ext:
        ext = ".png"
    return f"{uuid.uuid4().hex}{ext}"


def create_results_zip(before_path: str, after_path: str, mask_path: str) -> str:
    timestamp = datetime.now(timezone.utc).isoformat()
    archive_name = f"building-change-analysis-{uuid.uuid4().hex}.zip"
    archive_path = os.path.join(DOWNLOAD_DIR, archive_name)

    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_STORED) as zip_file:
        zip_file.write(before_path, f"T1_Image_{os.path.basename(before_path)}")
        zip_file.write(after_path, f"T2_Image_{os.path.basename(after_path)}")
        zip_file.write(mask_path, f"Change_Mask_{os.path.basename(mask_path)}")

        summary_content = f"""Building Change Detection Analysis Summary
Generated on: {timestamp}

Files:
- T1 Image: {os.path.basename(before_path)}
- T2 Image: {os.path.basename(after_path)}
- Change Mask: {os.path.basename(mask_path)}
"""
        zip_file.writestr("analysis_summary.txt", summary_content)

    return archive_name


@app.post("/predict")
async def predict(
    image_before: UploadFile = File(...),
    image_after: UploadFile = File(...),
):
    before_filename = make_unique_filename(image_before.filename or "before.png")
    after_filename = make_unique_filename(image_after.filename or "after.png")
    before_path = os.path.join(UPLOAD_DIR, before_filename)
    after_path = os.path.join(UPLOAD_DIR, after_filename)

    try:
        before_bytes = await image_before.read()
        after_bytes = await image_after.read()

        with open(before_path, "wb") as file_handle:
            file_handle.write(before_bytes)
        with open(after_path, "wb") as file_handle:
            file_handle.write(after_bytes)
    except Exception as exc:
        return {"error": f"Unable to write files: {exc}"}

    try:
        img1, orig_shape, pad, resized_shape = preprocess(before_path)
        img2, _, _, _ = preprocess(after_path)
        model = get_model()

        with torch.inference_mode():
            prediction = model(img1, img2)
    except Exception as exc:
        return {"error": f"Inference failed: {exc}"}

    print("LOGIT MIN:", prediction.min().item())
    print("LOGIT MAX:", prediction.max().item())

    mask_filename = make_unique_filename("mask.png")
    output_path = os.path.join(OUTPUT_DIR, mask_filename)
    mask = create_mask(prediction, output_path, orig_shape, pad, resized_shape)
    stats = calculate_mask_stats(mask)
    download_filename = create_results_zip(before_path, after_path, output_path)

    return {
        "before_image": f"uploads/{before_filename}",
        "after_image": f"uploads/{after_filename}",
        "mask": f"outputs/{mask_filename}",
        "download": f"download/{download_filename}",
        "stats": stats,
    }


@app.get("/download/{archive_name}")
def download_archive(archive_name: str):
    safe_name = os.path.basename(archive_name)
    archive_path = os.path.join(DOWNLOAD_DIR, safe_name)

    if not os.path.exists(archive_path):
        raise HTTPException(status_code=404, detail="Download archive not found")

    return FileResponse(
        archive_path,
        media_type="application/zip",
        filename=safe_name,
    )


@app.post("/download-results")
async def download_results(data: dict):
    try:
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_STORED) as zip_file:
            if data.get("t1Image"):
                t1_filename = data["t1Image"].split("/")[-1]
                t1_path = os.path.join(UPLOAD_DIR, t1_filename)
                if os.path.exists(t1_path):
                    zip_file.write(t1_path, f"T1_Image_{t1_filename}")

            if data.get("t2Image"):
                t2_filename = data["t2Image"].split("/")[-1]
                t2_path = os.path.join(UPLOAD_DIR, t2_filename)
                if os.path.exists(t2_path):
                    zip_file.write(t2_path, f"T2_Image_{t2_filename}")

            if data.get("maskImage"):
                mask_filename = data["maskImage"].split("/")[-1]
                mask_path = os.path.join(OUTPUT_DIR, mask_filename)
                if os.path.exists(mask_path):
                    zip_file.write(mask_path, f"Change_Mask_{mask_filename}")

            summary_content = f"""Building Change Detection Analysis Summary
Generated on: {data.get("timestamp", "Unknown")}

Analysis Results:
- T1 Image: {data.get("t1Image", "N/A")}
- T2 Image: {data.get("t2Image", "N/A")}
- Change Mask: {data.get("maskImage", "N/A")}

This zip file contains the original images and the generated change detection mask.
"""
            zip_file.writestr("analysis_summary.txt", summary_content)

        zip_buffer.seek(0)

        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": (
                    f"attachment; filename=building-change-analysis-"
                    f"{data.get('timestamp', 'unknown').split('T')[0]}.zip"
                )
            },
        )

    except Exception as exc:
        return {"error": f"Failed to create download: {exc}"}

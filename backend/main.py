import os
import torch
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from model import Hybrid
import zipfile
import io
from fastapi.responses import StreamingResponse

# ✅ THIS MUST EXIST
import uuid

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
MODEL_PATH = resolve_path(os.getenv("MODEL_PATH", "models/levir_pretrained.pth"))
CORS_ORIGINS = parse_cors_origins()

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

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")


# Load model
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

model = Hybrid()
model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
model.eval()

print("Model loaded successfully!")

@app.get("/")
def home():
    return {"message": "Building Change Detection API is Running 🚀"}

@app.get("/health")
def health():
    return {"status": "ok"}


# Preprocess
def preprocess(image_path, target_size=512):
    img = cv2.imread(image_path)
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
        value=(0, 0, 0)
    )

    img_rgb = cv2.cvtColor(img_padded, cv2.COLOR_BGR2RGB)
    img_rgb = img_rgb / 255.0
    img_tensor = torch.tensor(img_rgb).permute(2, 0, 1).float().unsqueeze(0)

    return img_tensor, (orig_h, orig_w), (pad_top, pad_left), (resized_h, resized_w)

# Postprocess
def create_mask(pred, output_path, orig_shape, pad, resized_shape):

    # 🔥 amplify logits
    pred = torch.sigmoid(pred * 6)

    mask = pred.squeeze().detach().cpu().numpy()
    mask = (mask > 0.5).astype(np.uint8) * 255

    pad_top, pad_left = pad
    resized_h, resized_w = resized_shape
    mask_cropped = mask[pad_top:pad_top + resized_h, pad_left:pad_left + resized_w]
    mask_resized = cv2.resize(mask_cropped, (orig_shape[1], orig_shape[0]), interpolation=cv2.INTER_NEAREST)

    cv2.imwrite(output_path, mask_resized)

# helper to create a unique filename preserving the original extension

def make_unique_filename(original_name: str) -> str:
    _, ext = os.path.splitext(original_name)
    if not ext:
        ext = ".png"
    return f"{uuid.uuid4().hex}{ext}"


@app.post("/predict")
async def predict(
    image_before: UploadFile = File(...),
    image_after: UploadFile = File(...)
):
    # create unique names even if the user uploads two files with the same
    # original name; this also helps prevent caching problems in the browser
    before_filename = make_unique_filename(image_before.filename)
    after_filename = make_unique_filename(image_after.filename)
    before_path = os.path.join(UPLOAD_DIR, before_filename)
    after_path = os.path.join(UPLOAD_DIR, after_filename)

    # save the files to disk; if anything goes wrong return an error JSON
    try:
        with open(before_path, "wb") as f:
            f.write(await image_before.read())
        with open(after_path, "wb") as f:
            f.write(await image_after.read())
    except Exception as e:
        return {"error": f"Unable to write files: {e}"}

    # run preprocessing and inference
    img1, orig_shape, pad, resized_shape = preprocess(before_path)
    img2, _, _, _ = preprocess(after_path)

    with torch.no_grad():
        prediction = model(img1, img2)

    print("LOGIT MIN:", prediction.min().item())
    print("LOGIT MAX:", prediction.max().item())

    # save the mask with a unique name so previous outputs are never
    # overwritten
    mask_filename = make_unique_filename("mask.png")
    output_path = os.path.join(OUTPUT_DIR, mask_filename)
    create_mask(prediction, output_path, orig_shape, pad, resized_shape)

    # return relative URLs; frontend may append a timestamp to bust cache
    return {
        "before_image": f"uploads/{before_filename}",
        "after_image": f"uploads/{after_filename}",
        "mask": f"outputs/{mask_filename}",
    }


@app.post("/download-results")
async def download_results(data: dict):
    """
    Create a zip file containing the analysis results
    """
    try:
        # Create a zip file in memory
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add images to zip
            if data.get('t1Image'):
                # Extract filename from URL
                t1_filename = data['t1Image'].split('/')[-1]
                t1_path = os.path.join(UPLOAD_DIR, t1_filename)
                if os.path.exists(t1_path):
                    zip_file.write(t1_path, f"T1_Image_{t1_filename}")

            if data.get('t2Image'):
                t2_filename = data['t2Image'].split('/')[-1]
                t2_path = os.path.join(UPLOAD_DIR, t2_filename)
                if os.path.exists(t2_path):
                    zip_file.write(t2_path, f"T2_Image_{t2_filename}")

            if data.get('maskImage'):
                mask_filename = data['maskImage'].split('/')[-1]
                mask_path = os.path.join(OUTPUT_DIR, mask_filename)
                if os.path.exists(mask_path):
                    zip_file.write(mask_path, f"Change_Mask_{mask_filename}")

            # Add a summary text file
            summary_content = f"""Building Change Detection Analysis Summary
Generated on: {data.get('timestamp', 'Unknown')}

Analysis Results:
- T1 Image: {data.get('t1Image', 'N/A')}
- T2 Image: {data.get('t2Image', 'N/A')}
- Change Mask: {data.get('maskImage', 'N/A')}

This zip file contains the original images and the generated change detection mask.
"""
            zip_file.writestr('analysis_summary.txt', summary_content)

        zip_buffer.seek(0)

        # Return the zip file
        return StreamingResponse(
            zip_buffer,
            media_type='application/zip',
            headers={"Content-Disposition": f"attachment; filename=building-change-analysis-{data.get('timestamp', 'unknown').split('T')[0]}.zip"}
        )

    except Exception as e:
        return {"error": f"Failed to create download: {str(e)}"}

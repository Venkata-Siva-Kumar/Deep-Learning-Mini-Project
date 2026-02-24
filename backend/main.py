import os
import torch
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from model import Hybrid

# ✅ THIS MUST EXIST
app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import uuid
import time

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
MODEL_PATH = "models/levir_pretrained.pth"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")


# Load model
model = Hybrid()
model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
model.eval()

print("Model loaded successfully!")

@app.get("/")
def home():
    return {"message": "Building Change Detection API is Running 🚀"}

# Preprocess
def preprocess(image_path):
    img = cv2.imread(image_path)
    img = cv2.resize(img, (256,256))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img / 255.0
    img = torch.tensor(img).permute(2,0,1).float().unsqueeze(0)
    return img

# Postprocess
def create_mask(pred, output_path):

    # 🔥 amplify logits
    pred = torch.sigmoid(pred * 6)

    mask = pred.squeeze().detach().cpu().numpy()
    mask = (mask > 0.5).astype(np.uint8) * 255

    cv2.imwrite(output_path, mask)

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
    img1 = preprocess(before_path)
    img2 = preprocess(after_path)

    with torch.no_grad():
        prediction = model(img1, img2)

    print("LOGIT MIN:", prediction.min().item())
    print("LOGIT MAX:", prediction.max().item())

    # save the mask with a unique name so previous outputs are never
    # overwritten
    mask_filename = make_unique_filename("mask.png")
    output_path = os.path.join(OUTPUT_DIR, mask_filename)
    create_mask(prediction, output_path)

    # return relative URLs; frontend may append a timestamp to bust cache
    return {
        "before_image": f"uploads/{before_filename}",
        "after_image": f"uploads/{after_filename}",
        "mask": f"outputs/{mask_filename}",
    }
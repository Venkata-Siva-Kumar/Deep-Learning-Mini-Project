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

@app.post("/predict")
async def predict(
    image_before: UploadFile = File(...),
    image_after: UploadFile = File(...)
):
    before_path = os.path.join(UPLOAD_DIR, image_before.filename)
    after_path = os.path.join(UPLOAD_DIR, image_after.filename)

    with open(before_path, "wb") as f:
        f.write(await image_before.read())

    with open(after_path, "wb") as f:
        f.write(await image_after.read())

    img1 = preprocess(before_path)
    img2 = preprocess(after_path)

    with torch.no_grad():
        prediction = model(img1, img2)

    print("LOGIT MIN:", prediction.min().item())
    print("LOGIT MAX:", prediction.max().item())
    output_path = os.path.join(OUTPUT_DIR, "mask.png")
    create_mask(prediction, output_path)

    return {
        "before_image": f"uploads/{image_before.filename}",
        "after_image": f"uploads/{image_after.filename}",
        "mask": "outputs/mask.png"
    }
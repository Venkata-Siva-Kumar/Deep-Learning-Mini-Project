import cv2
import numpy as np
import torch

def preprocess_image(image_path):
    img = cv2.imread(image_path)
    img = cv2.resize(img, (256, 256))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img / 255.0
    img = np.transpose(img, (2, 0, 1))
    img = torch.tensor(img, dtype=torch.float32).unsqueeze(0)
    return img


def postprocess_mask(prediction, output_path):
    mask = torch.sigmoid(prediction)
    mask = mask.squeeze().detach().cpu().numpy()
    mask = (mask > 0.5).astype(np.uint8) * 255

    transparent = np.zeros((256, 256, 4), dtype=np.uint8)
    transparent[:, :, 0] = 255  # Red
    transparent[:, :, 3] = mask

    cv2.imwrite(output_path, transparent)
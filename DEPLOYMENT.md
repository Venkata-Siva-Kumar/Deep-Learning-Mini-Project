# Deployment Guide

## Best Option For This Project

The best fit for this repository is:

- Frontend: Vercel
- Backend: Render Web Service

Why this is the best balance:

- The frontend is a static React build, which Vercel handles very well.
- The backend is a long-running FastAPI + PyTorch service, which is a better fit for Render than serverless platforms.
- Your backend stores uploads and generated masks on disk, and Render can keep that predictable on a normal web service.

If you want everything in one dashboard, you can also host both parts on Render. The split above is the smoothest option for this codebase.

## Before You Deploy

1. Push this repository to GitHub.
2. Confirm the backend model file exists at `backend/models/levir_pretrained.pth`.
3. Keep `frontend/.env.example` and `backend/.env.example` as reference for production env vars.

## Step 1: Deploy the Backend on Render

1. Sign in to Render and click **New +** > **Web Service**.
2. Connect your GitHub repo.
3. Use these settings:

- Root Directory: `backend`
- Environment: `Python`
- Build Command: `pip install -r requirements.render.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. Add these environment variables:

- `CORS_ORIGINS=https://your-frontend-domain.vercel.app`
- `MODEL_PATH=models/levir_pretrained.pth`
- `MODEL_INPUT_SIZE=512`
- `UPLOAD_DIR=uploads`
- `OUTPUT_DIR=outputs`

5. Deploy the service.
6. After deploy finishes, open these URLs and verify they work:

- `https://your-render-service.onrender.com/`
- `https://your-render-service.onrender.com/health`

Notes for Render:

- `requirements.render.txt` forces the CPU-only PyTorch wheels so Render does not install the much larger CUDA packages.
- The app now loads the model lazily, so `/health` can return `"model_loaded": false` before the first prediction. That is expected.
- If you still hit memory pressure on the starter instance, try `MODEL_INPUT_SIZE=384` first or move to a larger instance.

## Step 2: Deploy the Frontend on Vercel

1. Sign in to Vercel and click **Add New...** > **Project**.
2. Import the same GitHub repo.
3. Set the project root to `frontend`.
4. Vercel should detect it as a React app automatically.
5. Add this environment variable before deploying:

- `REACT_APP_API_BASE_URL=https://your-render-service.onrender.com`

6. Deploy the project.

## Step 3: Update Backend CORS

After Vercel gives you the real frontend URL:

1. Copy the deployed frontend domain.
2. Go back to the Render backend service.
3. Change `CORS_ORIGINS` to that exact Vercel URL.
4. Redeploy the backend if Render does not do it automatically.

## Step 4: Test the Full Production Flow

1. Open the Vercel frontend URL.
2. Upload a before image and an after image.
3. Run detection.
4. Confirm the mask loads from the Render backend.
5. Click download and confirm the zip file is generated.

## Important Notes

- This backend uses CPU inference by default, but PyTorch is still memory-heavy enough that the smallest Render instances can be tight.
- Uploaded images and generated masks are written to local service storage. That is okay for a simple deployment, but for long-term production you should move these files to object storage such as AWS S3 or Cloudinary.
- If the backend feels slow or runs out of memory, lower `MODEL_INPUT_SIZE` or move to a larger Render instance or VM.

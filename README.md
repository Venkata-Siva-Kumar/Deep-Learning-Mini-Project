# AI Building Change Detection

This repository contains a frontend React application and a backend FastAPI service.

## Clone the Repository

```powershell
# clone
git clone <repository-url>
cd minip
```

## Install Dependencies

### Frontend

```powershell
cd frontend
npm install
```

### Backend

```powershell
cd ../backend
python -m venv venv              # create virtual environment (optional)
# activate environment
venv\Scripts\activate           # Windows
# install requirements
pip install -r requirements.txt
```

## Running the Application

### Frontend

```powershell
cd frontend
npm start
```

- Application runs at http://localhost:3000 (prompts to use another port if 3000 is busy).

### Backend

```powershell
cd backend
venv\Scripts\activate         # if using virtualenv
uvicorn main:app --reload --port 8000
```

- Server available at http://localhost:8000

## Deployment

For the recommended production hosting setup and exact step-by-step instructions, see `DEPLOYMENT.md`.

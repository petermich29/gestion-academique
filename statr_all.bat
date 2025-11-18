@echo off
echo === LANCEMENT DU BACKEND (FastAPI) ===
start cmd /k "cd /d E:\VSCode_Projects\gestion-academique\backend && env13_ComputerVision\Scripts\activate && uvicorn app.main:app --reload"

echo === LANCEMENT DU FRONTEND (React / Vite) ===
start cmd /k "cd /d E:\VSCode_Projects\gestion-academique\frontend && npm run dev"

echo.
echo Tout est lance :
echo   - Backend : http://127.0.0.1:8000
echo   - Frontend: http://localhost:5173
pause

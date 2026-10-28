@echo off
echo ===================================================================
echo   DocuTrace - Intelligent Document Verification & Similarity Detection
echo   Smart Document Analysis Platform
echo ===================================================================
echo.
echo Starting FastAPI Backend Server on http://localhost:8000 ...
echo Press Ctrl+C at any time to terminate.
echo.
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
pause

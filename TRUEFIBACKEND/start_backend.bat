@echo off
echo Starting TrueFi Backend on port 8080...
echo.
echo Press Ctrl+C to stop the server
echo.
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
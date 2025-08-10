@echo off
echo Starting TrueFi Backend on port 8080 (without auto-reload)...
echo.
echo Press Ctrl+C to stop the server
echo.
uvicorn main:app --host 0.0.0.0 --port 8080 --log-level info
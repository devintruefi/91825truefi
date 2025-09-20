# ---- Base image - Python 3.11 slim (lighter than regular)
FROM python:3.11-slim

# ---- Runtime configuration
ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

# Set working directory
WORKDIR /app

# ---- Install dependencies
# Copy requirements first (for better Docker layer caching)
COPY TRUEFIBACKEND/requirements.txt .

# Install Python dependencies (no gcc needed since using psycopg2-binary)
RUN pip install -r requirements.txt

# ---- Copy application code
COPY TRUEFIBACKEND/ ./

# ---- Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port (documentation only)
EXPOSE 8080

# ---- Start application
# Use python -m uvicorn for better module resolution
# Since main.py is directly in /app, we use main:app
CMD exec python -m uvicorn main:app --host 0.0.0.0 --port ${PORT}
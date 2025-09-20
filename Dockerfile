# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from TRUEFIBACKEND
COPY TRUEFIBACKEND/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the TRUEFIBACKEND application
COPY TRUEFIBACKEND/ .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Set environment variable to prevent Python buffering
ENV PYTHONUNBUFFERED=1

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Run the application with uvicorn - bind to 0.0.0.0 and use PORT env var
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
#!/bin/bash

# Install dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Start the FastAPI server
echo "Starting TrueFi Chatbot Backend..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000 
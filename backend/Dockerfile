# Stage 1: Build virtual environment and compile dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

# Install compilation dependencies and postgres driver build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Build isolated virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Stage 2: Production runtime image
FROM python:3.12-slim

WORKDIR /app

# Install minimal runtime dependencies (libpq5 is needed for postgres connectivity)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Copy application source code into the backend subfolder
COPY . ./backend

# Expose container application port
EXPOSE 8000

# Fix execution permissions on entrypoint script and run it
RUN chmod +x ./backend/entrypoint.sh
WORKDIR /app/backend
ENTRYPOINT ["./entrypoint.sh"]

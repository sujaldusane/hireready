FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Strip Windows line endings (just in case) and make the script executable.
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# Run as a regular user instead of root.
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 5000

CMD ["./start.sh"]
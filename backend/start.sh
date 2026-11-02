#!/bin/sh
set -e

echo "Applying database migrations..."
flask --app run db upgrade

if [ "$RUN_EMBEDDED_WORKER" = "true" ]; then
  echo "Starting the embedded AI worker..."
  (
    while true; do
      rq worker ai --url "$REDIS_URL" --worker-class rq.worker.SimpleWorker || true
      echo "Worker stopped. Restarting in 5 seconds..."
      sleep 5
    done
  ) &
fi

echo "Starting the web server..."
exec gunicorn --bind "0.0.0.0:${PORT:-5000}" --workers 2 --timeout 60 --access-logfile - run:app
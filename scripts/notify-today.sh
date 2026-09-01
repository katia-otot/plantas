#!/bin/bash
# Manual "Hoy" push trigger (optional). Scheduled sends run inside the Plantas app
# (notification scheduler). Use only for debugging:
#   bash /opt/plantas/scripts/notify-today.sh
set -euo pipefail
ENV_FILE="/opt/plantas/.env"
LOG="/var/log/plantas/notify-today.log"
URL="http://127.0.0.1:3000/plantas/api/push/notify-today"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$(date -Is) missing .env" >> "$LOG"
  exit 1
fi

SECRET="$(grep -E '^PUSH_NOTIFY_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
if [[ -z "$SECRET" ]]; then
  echo "$(date -Is) PUSH_NOTIFY_SECRET empty" >> "$LOG"
  exit 1
fi

{
  echo "$(date -Is) starting notify-today (manual)"
  CODE=$(curl -sS -o /tmp/plantas-notify-out.json -w '%{http_code}' -X POST \
    -H "Authorization: Bearer ${SECRET}" \
    -H "Content-Type: application/json" \
    "$URL" || true)
  echo "http=$CODE body=$(tr -d '\n' < /tmp/plantas-notify-out.json)"
} >> "$LOG" 2>&1

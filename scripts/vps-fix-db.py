#!/usr/bin/env python3
import os
import sys
import time

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = os.environ["VPS_HOST"]
PORT = int(os.environ.get("VPS_PORT", "22"))
USER = os.environ["VPS_USER"]
PASSWORD = os.environ["VPS_PASS"]

cmds = [
    "cd /opt/plantas && NEXT_PUBLIC_BASE_PATH=/plantas npx prisma db push",
    "systemctl restart plantas",
    "sleep 4",
    "systemctl is-active plantas",
    "curl -s -o /dev/null -w 'login:%{http_code}\\n' http://127.0.0.1:3000/plantas/login",
    'sqlite3 /opt/plantas/data/app.db "PRAGMA table_info(GardenSettings);"',
    "journalctl -u plantas -n 20 --no-pager | grep notification-scheduler | tail -3",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
    HOST,
    port=PORT,
    username=USER,
    password=PASSWORD,
    look_for_keys=False,
    allow_agent=False,
    timeout=30,
)

for cmd in cmds:
    print(f"=== {cmd} ===")
    _, stdout, stderr = client.exec_command(cmd, timeout=300)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out[-8000:])
    if err.strip():
        print(err[-2000:])
    if code != 0:
        print(f"exit={code}")
        client.close()
        raise SystemExit(code)

client.close()
print("Fix OK")

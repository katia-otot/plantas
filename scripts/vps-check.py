#!/usr/bin/env python3
import os
import sys

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = os.environ["VPS_HOST"]
PORT = int(os.environ.get("VPS_PORT", "22"))
USER = os.environ["VPS_USER"]
PASSWORD = os.environ["VPS_PASS"]

cmds = [
    "journalctl -u plantas -n 80 --no-pager",
    "curl -s -o /dev/null -w 'login3000:%{http_code}\\n' http://127.0.0.1:3000/plantas/login",
    "curl -s -o /dev/null -w 'login80:%{http_code}\\n' http://127.0.0.1/plantas/login",
    'sqlite3 /opt/plantas/data/app.db "PRAGMA table_info(GardenSettings);"',
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
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out[-8000:])
    if err.strip():
        print(err[-2000:])

client.close()

#!/usr/bin/env bash
# Pipe a local script to remote bash via SSH + expect.
set -euo pipefail
SCRIPT="${1:?local script path}"
[[ -f "$SCRIPT" ]] || { echo "missing $SCRIPT" >&2; exit 1; }
[[ -n "${VPS_PASS:-}" ]] || { echo "VPS_PASS required" >&2; exit 1; }
HOST="${VPS_HOST:-root@74.208.197.99}"
B64=$(base64 < "$SCRIPT" | tr -d '\n')
export B64 HOST VPS_PASS
expect <<'EXPECT'
set timeout 1800
log_user 1
spawn ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=no $env(HOST) bash -s
expect "password:" { send "$env(VPS_PASS)\r" }
send "echo $env(B64) | base64 -d | bash\r"
expect eof
EXPECT

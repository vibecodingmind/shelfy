#!/usr/bin/env bash
# Usage: VPS_PASS='...' scripts/vps/_ssh_expect.sh 'remote shell command'
set -euo pipefail
if [[ -z "${VPS_PASS:-}" ]]; then
  echo "VPS_PASS required" >&2
  exit 1
fi
CMD="${1:?command required}"
HOST="${VPS_HOST:-root@74.208.197.99}"
export CMD HOST VPS_PASS
expect <<EXPECT
set timeout 1800
log_user 1
spawn ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=no \$env(HOST)
expect {
  "password:" { send "\$env(VPS_PASS)\r" }
}
expect -re {[#$] }
send "\$env(CMD)\r"
expect -re {[#$] }
send "exit\r"
expect eof
EXPECT

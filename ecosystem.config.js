module.exports = {
  apps: [{
    name: 'shelfy',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/var/www/shelfy',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/var/log/shelfy/error.log',
    out_file:   '/var/log/shelfy/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '1G',
    restart_delay: 4000,
  }],
}

#!/bin/sh
set -e

CERT_DIR=/etc/nginx/certs

if [ ! -f "$CERT_DIR/cert.pem" ]; then
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$CERT_DIR/key.pem" \
    -out    "$CERT_DIR/cert.pem" \
    -subj   "/CN=webrtc-conf-local" \
    2>/dev/null
  echo "[nginx] Self-signed TLS certificate generated (valid 10 years)."
  echo "[nginx] Accept the browser security warning once to use the app."
fi

exec nginx -g 'daemon off;'

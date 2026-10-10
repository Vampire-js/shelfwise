#!/usr/bin/env sh
set -eu

base_url=${1:-http://localhost:8088}
iterations=${2:-60}

i=1
while [ "$i" -le "$iterations" ]; do
  curl -fsS "$base_url/api/books" >/dev/null
  if [ $((i % 5)) -eq 0 ]; then
    curl -fsS -X PATCH \
      -H 'Content-Type: application/json' \
      -d '{"change":-1}' \
      "$base_url/api/books/clean-code/stock" >/dev/null || true
  fi
  printf 'Request batch %s/%s\r' "$i" "$iterations"
  i=$((i + 1))
  sleep 1
done

printf '\nTraffic generation complete.\n'

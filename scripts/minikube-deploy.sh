#!/usr/bin/env sh
set -eu

minikube_bin=${MINIKUBE_BIN:-minikube}

"$minikube_bin" status >/dev/null 2>&1 ||
  "$minikube_bin" start \
    --driver="${MINIKUBE_DRIVER:-docker}" \
    --cpus="${MINIKUBE_CPUS:-2}" \
    --memory="${MINIKUBE_MEMORY:-3072mb}" \
    --disk-size="${MINIKUBE_DISK_SIZE:-8g}"

docker build -f backend/Dockerfile -t shelfwise/backend:local .
docker build -f frontend/Dockerfile -t shelfwise/frontend:local .

"$minikube_bin" image load shelfwise/backend:local
"$minikube_bin" image load shelfwise/frontend:local

kubectl apply -k k8s
kubectl rollout status deployment/backend -n shelfwise --timeout=120s
kubectl rollout status deployment/frontend -n shelfwise --timeout=120s
kubectl rollout status deployment/prometheus -n shelfwise --timeout=120s
kubectl rollout status deployment/grafana -n shelfwise --timeout=180s

printf '\nShelfwise is ready. Open it with:\n  %s service frontend -n shelfwise\n' "$minikube_bin"
printf 'Prometheus: http://%s:30090\n' "$("$minikube_bin" ip)"
printf 'Grafana: http://%s:30091\n' "$("$minikube_bin" ip)"

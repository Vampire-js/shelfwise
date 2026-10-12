#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_dir=$(dirname "$script_dir")
cd "$project_dir"

minikube_bin=${MINIKUBE_BIN:-minikube}
minikube_driver=${MINIKUBE_DRIVER:-docker}
jenkins_port=${JENKINS_HTTP_PORT:-8081}
backend_port=${BACKEND_PORT:-3003}
start_funnel=${START_FUNNEL:-1}

export GITHUB_REPOSITORY_URL=${GITHUB_REPOSITORY_URL:-https://github.com/Vampire-js/shelfwise}
export JENKINS_URL=${JENKINS_URL:-https://pop-os.tail23675f.ts.net/}
export JENKINS_HTTP_PORT=$jenkins_port
export BACKEND_PORT=$backend_port

for command in docker kubectl curl "$minikube_bin"; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$command" >&2
    exit 1
  fi
done

docker_with_sudo=0
if ! docker info >/dev/null 2>&1; then
  printf 'Docker requires elevated access. Requesting sudo once...\n'
  sudo -v
  sudo docker info >/dev/null
  docker_with_sudo=1
fi

docker_run() {
  if [ "$docker_with_sudo" -eq 1 ]; then
    sudo docker "$@"
  else
    docker "$@"
  fi
}

wait_for_url() {
  label=$1
  url=$2
  attempts=${3:-60}
  count=1

  while [ "$count" -le "$attempts" ]; do
    if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
      printf '%s is ready.\n' "$label"
      return 0
    fi
    sleep 2
    count=$((count + 1))
  done

  printf '%s did not become ready: %s\n' "$label" "$url" >&2
  return 1
}

printf 'Starting Minikube...\n'
if ! "$minikube_bin" status >/dev/null 2>&1; then
  "$minikube_bin" start \
    --driver="$minikube_driver" \
    --cpus="${MINIKUBE_CPUS:-2}" \
    --memory="${MINIKUBE_MEMORY:-3072mb}" \
    --disk-size="${MINIKUBE_DISK_SIZE:-8g}"
fi
"$minikube_bin" update-context >/dev/null

printf 'Starting the Docker Compose application and monitoring stack...\n'
docker_run compose up --build -d
wait_for_url "Compose backend" "http://localhost:$backend_port/health"
wait_for_url "Compose frontend" "http://localhost:8088"
wait_for_url "Compose Prometheus" "http://localhost:9090/-/ready"
wait_for_url "Compose Grafana" "http://localhost:3001/api/health"

printf 'Loading application images and applying Kubernetes resources...\n'
"$minikube_bin" image load shelfwise/backend:local
"$minikube_bin" image load shelfwise/frontend:local
kubectl apply -k k8s
kubectl rollout status deployment/backend -n shelfwise --timeout=120s
kubectl rollout status deployment/frontend -n shelfwise --timeout=120s
kubectl rollout status deployment/prometheus -n shelfwise --timeout=120s
kubectl rollout status deployment/grafana -n shelfwise --timeout=180s

minikube_ip=$("$minikube_bin" ip)
wait_for_url "Kubernetes frontend" "http://$minikube_ip:30088"
wait_for_url "Kubernetes Prometheus" "http://$minikube_ip:30090/-/ready"
wait_for_url "Kubernetes Grafana" "http://$minikube_ip:30091/api/health"

printf 'Starting Jenkins...\n'
export DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)
docker_run compose -f jenkins-compose.yml up --build -d
wait_for_url "Jenkins" "http://localhost:$jenkins_port/login" 90

if [ "$start_funnel" -eq 1 ]; then
  if ! command -v tailscale >/dev/null 2>&1; then
    printf 'Tailscale is required to start the Jenkins webhook Funnel.\n' >&2
    exit 1
  fi
  printf 'Starting the Tailscale Funnel for Jenkins...\n'
  if ! tailscale funnel --bg --yes "$jenkins_port"; then
    printf 'Tailscale Funnel requires elevated access. Requesting sudo...\n'
    sudo tailscale funnel --bg --yes "$jenkins_port"
  fi
fi

printf '\nShelfwise is ready:\n'
printf '  Compose frontend:       http://localhost:8088\n'
printf '  Compose backend:        http://localhost:%s\n' "$backend_port"
printf '  Compose Prometheus:     http://localhost:9090\n'
printf '  Compose Grafana:        http://localhost:3001\n'
printf '  Jenkins:                http://localhost:%s\n' "$jenkins_port"
printf '  Kubernetes frontend:    http://%s:30088\n' "$minikube_ip"
printf '  Kubernetes Prometheus:  http://%s:30090\n' "$minikube_ip"
printf '  Kubernetes Grafana:     http://%s:30091\n' "$minikube_ip"
if [ "$start_funnel" -eq 1 ]; then
  printf '  Jenkins webhook:        %sgithub-webhook/\n' "$JENKINS_URL"
fi

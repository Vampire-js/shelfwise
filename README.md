# Shelfwise Bookstore DevOps Demo

Shelfwise is a small online bookstore catalog designed to demonstrate a complete
DevOps toolchain. The React/Vite frontend can search and filter books and adjust
inventory. The Node.js API keeps demo data in memory and exports Prometheus
metrics for HTTP requests, response traffic, latency, and remaining stock.

## Architecture

```text
Browser -> Nginx/React -> Node.js API -> in-memory catalog
                              |
                              +-> /metrics -> Prometheus -> Grafana

GitHub push -> Jenkins -> install -> tests -> Vite build -> Docker images
                                      |
                                      +-> archived app, image, report, and K8s artifacts
```

The in-memory datastore is intentional for this classroom demo. Restarting the
backend resets inventory to its seed values, which also makes the difference
between ephemeral application state and persistent storage easy to demonstrate.
The Kubernetes backend uses one replica so stock remains consistent; the
stateless frontend uses two replicas for the recovery demonstration.

## Prerequisites

- Node.js 20 or newer and npm
- Docker with Docker Compose
- `kubectl` and Minikube for the Kubernetes exercise
- A GitHub repository accessible to Jenkins

## Run locally

```bash
npm install
npm test
npm run dev
```

Open <http://localhost:5173>. The API is available at
<http://localhost:3002/api/books> and metrics at
<http://localhost:3002/metrics>.

## Docker, Prometheus, and Grafana

```bash
cp .env.example .env
# Set non-default Grafana credentials in .env.
docker compose up --build -d
```

| Service | URL |
|---|---|
| Bookstore | <http://localhost:8088> |
| API metrics | <http://localhost:3003/metrics> |
| Prometheus | <http://localhost:9090> |
| Grafana | <http://localhost:3001> |

Grafana automatically provisions the **Bookstore / Shelfwise Bookstore
Overview** dashboard. It contains HTTP request-rate, response-traffic,
95th-percentile latency, and per-book stock panels.

Generate visible time-series data:

```bash
sh scripts/generate-traffic.sh http://localhost:8088 60
```

Stop the stack with `docker compose down`. Add `-v` only when you also want to
remove Prometheus and Grafana data.

## Kubernetes and pod recovery with Minikube

The deployment script builds the two application images, loads them into
Minikube, applies all manifests, and waits for each rollout:

```bash
chmod +x scripts/*.sh
./scripts/minikube-deploy.sh
minikube service frontend -n shelfwise
```

Open the monitoring services in separate terminals:

```bash
kubectl port-forward -n shelfwise service/prometheus 9090:9090
kubectl port-forward -n shelfwise service/grafana 3001:3000
```

If Minikube was installed in `~/.local/bin` and that directory is not on your
`PATH`, run `MINIKUBE_BIN="$HOME/.local/bin/minikube"
./scripts/minikube-deploy.sh`.

Grafana's Minikube demo credentials are `admin` / `admin`; change the values in
`k8s/grafana.yaml` for any environment beyond a local demonstration.

Show Kubernetes self-healing:

```bash
kubectl get pods -n shelfwise
./scripts/demonstrate-recovery.sh frontend
```

The script deletes one frontend pod, waits for the Deployment to create a ready
replacement, and prints the new pod list. To demonstrate backend recovery and
ephemeral state, run
`./scripts/demonstrate-recovery.sh backend`; inventory resets when the
replacement starts.

Other useful commands:

```bash
kubectl scale deployment/frontend -n shelfwise --replicas=4
kubectl get pods -n shelfwise -w
kubectl apply -k k8s
kubectl delete namespace shelfwise
```

## Jenkins build on GitHub push

The containerized Jenkins controller is configured with Jenkins Configuration
as Code and Job DSL. On startup it creates a pipeline job that loads the
repository's `Jenkinsfile`.

1. Push this project to GitHub with `main` as the default branch.
2. Copy `.env.example` to `.env` and set:
   - `GITHUB_REPOSITORY_URL` to the HTTPS clone URL.
   - Strong `JENKINS_ADMIN_PASSWORD` and `GRAFANA_ADMIN_PASSWORD` values.
   - `DOCKER_GID` to the result of
     `stat -c '%g' /var/run/docker.sock`.
   - `JENKINS_URL` to the URL GitHub can reach. For a local classroom machine,
     expose port 8081 through an approved tunnel.
3. Start Jenkins:

   ```bash
   docker compose -f jenkins-compose.yml up --build -d
   ```

4. In the GitHub repository, open **Settings > Webhooks > Add webhook**:
   - Payload URL: `<JENKINS_URL>/github-webhook/`
   - Content type: `application/json`
   - Events: **Just the push event**
5. Push a commit and inspect the `shelfwise-bookstore` job at the configured
   Jenkins URL.

The pipeline runs:

1. Clean dependency installation with `npm ci`.
2. Backend and frontend tests with JUnit reports.
3. The Vite production build.
4. Backend, frontend, and Kubernetes archives.
5. Backend and frontend Docker image builds and compressed image archives.
6. Deployment of the successful build to the local Minikube cluster.
7. Jenkins artifact archival and fingerprinting.

The Jenkins container mounts the local kubeconfig and Minikube certificates
read-only. Minikube must already be running, and its Docker container must be
named `minikube`, before the deployment stage starts.

Mounting `/var/run/docker.sock` gives the Jenkins container control of the host
Docker daemon. Use a dedicated demo machine or a properly isolated Jenkins
agent; do not use this pattern for an untrusted multi-tenant controller.

## Git demonstration

Use a feature-branch workflow so every pipeline run maps to versioned source:

```bash
git init
git add .
git commit -m "Build Shelfwise DevOps demo"
git branch -M main
git remote add origin https://github.com/your-account/shelfwise-bookstore.git
git push -u origin main

git switch -c feature/catalog-change
# Make a change, then:
git add .
git commit -m "Update bookstore catalog"
git push -u origin feature/catalog-change
```

Merge the branch through a pull request. The subsequent push to `main` triggers
the Jenkins GitHub webhook and produces a traceable set of build artifacts.

## Metrics

| Metric | Meaning |
|---|---|
| `bookstore_http_requests_total` | Request count by method, route, and status |
| `bookstore_http_response_bytes_total` | Response traffic by route |
| `bookstore_http_request_duration_seconds` | Request-latency histogram |
| `bookstore_book_stock` | Current stock with book ID and title labels |
| `bookstore_process_*` | Node.js process metrics from `prom-client` |

Stock is updated through `PATCH /api/books/:id/stock` with a JSON body such as
`{"change":-1}`. The metric gauge is updated in the same request.

### DevOps Integration

Shelfwise Bookstore is a full-stack web application built using React, Vite, Node.js, and Express for managing and browsing books. The project integrates Jenkins for automated continuous integration and deployment (CI/CD), enabling dependency installation, backend and frontend testing, production builds, artifact packaging, and Docker image creation. Docker provides containerized application environments, while Kubernetes (Minikube) manages application deployments and rollout verification. GitHub webhooks, exposed through a secure public tunnel, enable Jenkins to receive repository events and trigger automated pipelines. Prometheus and Grafana support application monitoring and metric visualization, providing an integrated DevOps environment for building, testing, deploying, and observing the application.
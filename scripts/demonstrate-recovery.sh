#!/usr/bin/env sh
set -eu

namespace=shelfwise
label=${1:-frontend}

before=$(kubectl get pods -n "$namespace" -l "app=$label" -o jsonpath='{.items[0].metadata.name}')
printf 'Deleting %s pod: %s\n' "$label" "$before"
kubectl delete pod -n "$namespace" "$before" --wait=false

kubectl rollout status "deployment/$label" -n "$namespace" --timeout=120s
kubectl wait --for=condition=Ready pod -l "app=$label" -n "$namespace" --timeout=120s

printf '\nReplacement pods:\n'
kubectl get pods -n "$namespace" -l "app=$label" -o wide

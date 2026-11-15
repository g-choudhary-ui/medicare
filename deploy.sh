#!/bin/bash
# deploy.sh — Linux/macOS deployment helper for MediCare on Google Cloud Run
# Usage: ./deploy.sh <PROJECT_ID>
set -e

PROJECT_ID=${1:-"your-project-id"}
IMAGE="gcr.io/$PROJECT_ID/medicare"
REGION="us-central1"
SERVICE="medicare"

echo "🏗️  Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "🐳  Submitting to Cloud Build..."
gcloud builds submit --tag "$IMAGE"

echo "🚀  Deploying to Cloud Run..."
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10

echo "✅  Deployment complete!"
gcloud run services describe "$SERVICE" \
  --platform managed \
  --region "$REGION" \
  --format 'value(status.url)'

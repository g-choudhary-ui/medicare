# deploy.ps1 — Windows PowerShell deployment helper for MediCare on Google Cloud Run
# Usage: .\deploy.ps1 -ProjectId "your-project-id"
param(
    [string]$ProjectId = "your-project-id"
)

$ErrorActionPreference = "Stop"
$IMAGE   = "gcr.io/$ProjectId/medicare"
$REGION  = "us-central1"
$SERVICE = "medicare"

Write-Host "🏗️  Building frontend..." -ForegroundColor Cyan
Set-Location frontend
npm install
npm run build
Set-Location ..

Write-Host "🐳  Submitting to Cloud Build..." -ForegroundColor Cyan
gcloud builds submit --tag $IMAGE

Write-Host "🚀  Deploying to Cloud Run..." -ForegroundColor Cyan
gcloud run deploy $SERVICE `
  --image $IMAGE `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 10

Write-Host "✅  Deployment complete!" -ForegroundColor Green
gcloud run services describe $SERVICE `
  --platform managed `
  --region $REGION `
  --format 'value(status.url)'

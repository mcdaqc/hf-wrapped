# Script para crear el dataset de Hugging Face en Windows (PowerShell)
# Uso: .\scripts\create-dataset.ps1

param(
    [string]$Token = $env:HF_TOKEN,
    [string]$DatasetName = "hf-wrapped-2025",
    [string]$Organization = "hf-wrapped"
)

if (-not $Token) {
    Write-Host "❌ Error: HF_TOKEN no está configurado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, configura el token de una de estas formas:" -ForegroundColor Yellow
    Write-Host "  1. Variable de entorno: `$env:HF_TOKEN='tu_token'" -ForegroundColor Cyan
    Write-Host "  2. Parámetro: .\scripts\create-dataset.ps1 -Token 'tu_token'" -ForegroundColor Cyan
    Write-Host "  3. En .env.local y luego: `$env:HF_TOKEN = (Get-Content .env.local | Select-String '^HF_TOKEN=').ToString().Split('=')[1].Trim('`"')" -ForegroundColor Cyan
    exit 1
}

$DatasetId = "$Organization/$DatasetName"
$Url = "https://huggingface.co/api/repos/create"

Write-Host "📦 Creando dataset: $DatasetId" -ForegroundColor Cyan
Write-Host "   Organización: $Organization"
Write-Host "   Nombre: $DatasetName"
Write-Host ""

$Body = @{
    type = "dataset"
    name = $DatasetName
    organization = $Organization
} | ConvertTo-Json

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $Response = Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -Body $Body -ErrorAction Stop
    
    Write-Host "✅ Dataset creado exitosamente!" -ForegroundColor Green
    Write-Host "   URL: https://huggingface.co/datasets/$DatasetId" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Añade esto a tu archivo .env.local:" -ForegroundColor Yellow
    Write-Host "   WRAPPED_DATASET_ID=`"$DatasetId`"" -ForegroundColor White
    Write-Host "   WRAPPED_DATASET_WRITE=true" -ForegroundColor White
    Write-Host "   HF_TOKEN=$($Token.Substring(0, [Math]::Min(10, $Token.Length)))..." -ForegroundColor White
} catch {
    $ErrorResponse = $_.ErrorDetails.Message
    if ($ErrorResponse -match "already exists" -or $_.Exception.Response.StatusCode -eq 409) {
        Write-Host "✅ El dataset $DatasetId ya existe!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Añade esto a tu archivo .env.local:" -ForegroundColor Yellow
        Write-Host "   WRAPPED_DATASET_ID=`"$DatasetId`"" -ForegroundColor White
        Write-Host "   WRAPPED_DATASET_WRITE=true" -ForegroundColor White
        Write-Host "   HF_TOKEN=$($Token.Substring(0, [Math]::Min(10, $Token.Length)))..." -ForegroundColor White
    } else {
        Write-Host "❌ Error al crear el dataset:" -ForegroundColor Red
        Write-Host $ErrorResponse -ForegroundColor Red
        exit 1
    }
}


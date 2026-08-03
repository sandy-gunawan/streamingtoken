# Deploys the demo to Azure Container Apps in a new resource group using Managed Identity.
# Prereqs: az login, az extension add --name containerapp
#
# Usage (edit the OpenAI + Search resource identifiers first):
#   ./deploy/deploy.ps1

$ErrorActionPreference = "Stop"

# ---- Settings ----
$RG        = "rg_stream_demo"
$LOC       = "southeastasia"
$APP       = "stream-demo"
$ENVN      = "stream-demo-env"

# Existing Azure AI Search service.
$SEARCH_RG       = "demomotor"
$SEARCH_NAME     = "searchaiindo"
$SEARCH_ENDPOINT = "https://searchaiindo.search.windows.net"
$SEARCH_INDEXES  = "indexknowledge,rag-motor-3large"
$SEARCH_APIVER   = "2024-07-01"

# Existing Azure OpenAI resource that hosts the gpt-4.1 deployment.
$OPENAI_RG       = "foundry"
$OPENAI_NAME     = "openaisoutheat"
$OPENAI_ENDPOINT = "https://openaisoutheat.openai.azure.com"
$OPENAI_DEPLOY   = "oldfoundrymodelgpt41"
$OPENAI_APIVER   = "2024-10-21"

# ---- 1. Resource group ----
az group create -n $RG -l $LOC | Out-Null

# ---- 2. Build from source + deploy ----
az containerapp up `
  --name $APP --resource-group $RG --location $LOC `
  --environment $ENVN --source . `
  --ingress external --target-port 3000

# ---- 3. System-assigned managed identity ----
az containerapp identity assign --name $APP --resource-group $RG --system-assigned | Out-Null
$principalId = az containerapp identity show --name $APP --resource-group $RG --query principalId -o tsv

# ---- 4. Role assignments (Managed Identity, no keys) ----
$searchScope = az search service show --name $SEARCH_NAME --resource-group $SEARCH_RG --query id -o tsv
az role assignment create `
  --assignee-object-id $principalId --assignee-principal-type ServicePrincipal `
  --role "Search Index Data Reader" --scope $searchScope | Out-Null

$openaiScope = az cognitiveservices account show --name $OPENAI_NAME --resource-group $OPENAI_RG --query id -o tsv
az role assignment create `
  --assignee-object-id $principalId --assignee-principal-type ServicePrincipal `
  --role "Cognitive Services OpenAI User" --scope $openaiScope | Out-Null

# ---- 4b. Allow Managed Identity (Entra ID) auth on the search service (additive) ----
az search service update --name $SEARCH_NAME --resource-group $SEARCH_RG `
  --auth-options aadOrApiKey --aad-auth-failure-mode http403 | Out-Null

# ---- 5. App configuration ----
az containerapp update --name $APP --resource-group $RG --set-env-vars `
  AZURE_SEARCH_ENDPOINT="$SEARCH_ENDPOINT" `
  AZURE_SEARCH_INDEXES="$SEARCH_INDEXES" `
  AZURE_SEARCH_API_VERSION="$SEARCH_APIVER" `
  AZURE_SEARCH_TOP="3" `
  AZURE_OPENAI_ENDPOINT="$OPENAI_ENDPOINT" `
  AZURE_OPENAI_DEPLOYMENT="$OPENAI_DEPLOY" `
  AZURE_OPENAI_API_VERSION="$OPENAI_APIVER" | Out-Null

$fqdn = az containerapp show --name $APP --resource-group $RG --query properties.configuration.ingress.fqdn -o tsv
Write-Host "`nDeployed. Open: https://$fqdn" -ForegroundColor Green

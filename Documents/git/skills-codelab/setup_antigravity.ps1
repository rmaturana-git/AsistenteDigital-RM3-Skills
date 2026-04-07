# 1. Definición de Rutas
$globalGeminiPath = "$env:USERPROFILE\.gemini"
$projectRoot = Get-Location
$agentsPath = "$projectRoot\.agents"

Write-Host "🚀 Iniciando reestructuración de Antigravity..." -ForegroundColor Cyan

# 2. Crear Estructura de Carpetas
$directories = @(
    "$globalGeminiPath\antigravity\global_workflows",
    "$agentsPath\skills",
    "$agentsPath\workflows",
    "$projectRoot\app_build",
    "$projectRoot\production_artifacts"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
        Write-Host "✅ Carpeta creada: $dir" -ForegroundColor Green
    }
}

# 3. Optimización Global: GEMINI.md y CLAUDE.md
$geminiConfig = @"
# ⚙️ Google Gemini Core Configuration
- **Default Language**: Spanish (Forced Reasoning)
- **Safety**: block_medium_and_above
- **Technical**: Prioritize context from .agents/ directory.
"@
Set-Content -Path "$globalGeminiPath\GEMINI.md" -Value $geminiConfig -Encoding UTF8

$claudeConfig = @"
# 🧠 Anthropic Claude Core Configuration
- **Thinking Process**: Use XML <razonamiento> tags (Strictly Spanish).
- **Coding Style**: Production-ready, minimalist, and robust.
- **Context**: Follow roles from .agents/agents.md.
"@
if (!(Test-Path "$globalGeminiPath\CLAUDE.md")) {
    Set-Content -Path "$globalGeminiPath\CLAUDE.md" -Value $claudeConfig -Encoding UTF8
}

# 4. Fuente de Verdad Local: agents.md
# Leemos el archivo actual (si existe) y le añadimos la matriz de switching
if (Test-Path "$agentsPath\agents.md") {
    $currentAgents = Get-Content "$agentsPath\agents.md" -Raw
} else {
    $currentAgents = "# 🤖 The Autonomous Development Team"
}

$switchingLogic = @"

## 🔄 Model Switching Logic (Antigravity Rules)
| Agente | Modo | Modelo |
| :--- | :--- | :--- |
| @pm | Planning | Claude 3.5 Sonnet |
| @engineer | Fast/Code | Claude 3.5 Sonnet |
| @qa | Deep Audit | Gemini 1.5 Pro |
| @devops | Execution | Gemini 1.5 Flash |

**Instruction**: Switch the LLM engine automatically based on the active role above.
"@

Set-Content -Path "$agentsPath\agents.md" -Value ($currentAgents + $switchingLogic) -Encoding UTF8

# 5. Mover Skills y Workflows (Corrección de rutas)
Get-ChildItem -Path "$projectRoot" -Filter "*.md" | Where-Object { $_.Name -match "code|specs|app|work|pause|resume" } | Move-Item -Destination "$agentsPath\skills" -Force -ErrorAction SilentlyContinue

Write-Host "✨ ¡Estructura de Antigravity optimizada con éxito!" -ForegroundColor Magenta
Write-Host "📍 Global: $globalGeminiPath" -ForegroundColor Yellow
Write-Host "📍 Local: $projectRoot" -ForegroundColor Yellow
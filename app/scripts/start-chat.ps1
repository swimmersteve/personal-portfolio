param([string]$SourceDirectory = (Join-Path $PSScriptRoot '../../../me'))
$ErrorActionPreference = 'Stop'
$sourcePath = (Resolve-Path -LiteralPath $SourceDirectory).Path
$pythonPath = Join-Path $sourcePath '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw "The chatbot Python environment was not found at $pythonPath"
}
$env:ME_SOURCE_DIR = $sourcePath
& $pythonPath (Join-Path $PSScriptRoot '../server/chat_server.py')
exit $LASTEXITCODE

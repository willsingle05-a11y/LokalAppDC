$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $root "src"
$htmlPath = Join-Path $src "index.html"
$stylesPath = Join-Path $src "styles"
$featuresPath = Join-Path $src "features"
$outputPath = Join-Path $root "Lokal-demo.html"
$zipPath = Join-Path $root "Lokal-demo-standalone.zip"

$html = Get-Content -Raw -LiteralPath $htmlPath
$css = (Get-ChildItem -LiteralPath $stylesPath -Filter "*.css" |
  Sort-Object Name |
  ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`r`n"
$js = (Get-ChildItem -LiteralPath $featuresPath -Filter "*.js" |
  Sort-Object Name |
  ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`r`n"

$html = $html.Replace(
  '<link rel="stylesheet" href="styles.css" />',
  "<style>`r`n$css`r`n    </style>"
)
$html = $html.Replace(
  '<script src="app.js"></script>',
  "<script>`r`n$js`r`n    </script>"
)

Set-Content -LiteralPath $outputPath -Value $html -Encoding utf8
Compress-Archive -LiteralPath $outputPath -DestinationPath $zipPath -Force

Get-Item -LiteralPath $outputPath, $zipPath |
  Select-Object Name, Length, LastWriteTime

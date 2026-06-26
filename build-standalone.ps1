$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $root "src"
$htmlPath = Join-Path $src "index.html"
$stylesPath = Join-Path $src "styles"
$featuresPath = Join-Path $src "features"
$outputPath = Join-Path $root "Lokal-demo.html"
$zipPath = Join-Path $root "Lokal-demo-standalone.zip"

$html = Get-Content -Raw -LiteralPath $htmlPath

# CSS must follow the same cascade order as src/main.js (base -> round2 -> redesign),
# so the redesign layer wins. A plain alphabetical sort would place redesign before
# round2 and let the old styles override the redesign, so order the known files first
# and append any others afterward.
$cssOrder = @("base.css", "round2.css", "redesign.css")
$cssFiles = Get-ChildItem -LiteralPath $stylesPath -Filter "*.css" | Sort-Object Name
$orderedCss = @()
foreach ($name in $cssOrder) {
  $match = $cssFiles | Where-Object { $_.Name -eq $name }
  if ($match) { $orderedCss += $match }
}
$orderedCss += $cssFiles | Where-Object { $cssOrder -notcontains $_.Name }
$css = ($orderedCss | ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`r`n"

$js = (Get-ChildItem -LiteralPath $featuresPath -Filter "*.js" |
  Sort-Object Name |
  ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`r`n"

# Barlow Condensed display font (matches the Vite entry index.html)
$fontLinks = '<link rel="preconnect" href="https://fonts.googleapis.com" />' + "`r`n    " +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' + "`r`n    " +
  '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />'

$html = $html.Replace(
  '<link rel="stylesheet" href="styles.css" />',
  "$fontLinks`r`n    <style>`r`n$css`r`n    </style>"
)
$html = $html.Replace(
  '<script src="app.js"></script>',
  "<script>`r`n$js`r`n    </script>"
)

Set-Content -LiteralPath $outputPath -Value $html -Encoding utf8
Compress-Archive -LiteralPath $outputPath -DestinationPath $zipPath -Force

Get-Item -LiteralPath $outputPath, $zipPath |
  Select-Object Name, Length, LastWriteTime

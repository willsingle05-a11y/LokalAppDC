param(
  [string]$PredictHqApiToken = $env:PREDICTHQ_API_TOKEN,
  [string]$SupabaseUrl = $env:SUPABASE_URL,
  [string]$SupabaseServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string]$PlaceId = $env:PHQ_PLACE_ID,
  [string]$Timezone = $(if ($env:PHQ_TIMEZONE) { $env:PHQ_TIMEZONE } else { "America/New_York" }),
  [int]$LookaheadDays = $(if ($env:PHQ_LOOKAHEAD_DAYS) { [int]$env:PHQ_LOOKAHEAD_DAYS } else { 6 }),
  [int]$Limit = $(if ($env:PHQ_LIMIT) { [int]$env:PHQ_LIMIT } else { 100 }),
  [string]$Categories = $(if ($env:PHQ_CATEGORIES) { $env:PHQ_CATEGORIES } else { "concerts,festivals,performing-arts,sports,community,expos" }),
  [string]$ExcludedCategories = $(if ($env:PHQ_EXCLUDED_CATEGORIES) { $env:PHQ_EXCLUDED_CATEGORIES } else { "academic,school,observances,public-holidays,politics,airport-delays,disasters,weather" }),
  [switch]$UseScope = $(if ($env:PHQ_USE_SCOPE -eq "true") { $true } else { $false })
)

$ErrorActionPreference = "Stop"

if (-not $PredictHqApiToken) {
  throw "Missing PREDICTHQ_API_TOKEN. Set it first or pass -PredictHqApiToken."
}

function Invoke-PredictHqGet {
  param([string]$Path, [hashtable]$Query)

  $queryParts = @()
  foreach ($key in $Query.Keys) {
    if ($null -ne $Query[$key] -and "$($Query[$key])" -ne "") {
      $encodedKey = [System.Uri]::EscapeDataString($key)
      $encodedValue = [System.Uri]::EscapeDataString("$($Query[$key])")
      $queryParts += "$encodedKey=$encodedValue"
    }
  }
  $uri = "https://api.predicthq.com/v1/$Path"
  if ($queryParts.Count) { $uri = "$uri`?$($queryParts -join '&')" }
  Invoke-RestMethod -Method Get -Uri $uri -Headers @{
    Authorization = "Bearer $PredictHqApiToken"
    Accept = "application/json"
  }
}

function Get-DcPlaceId {
  if ($PlaceId) { return $PlaceId }
  $places = Invoke-PredictHqGet -Path "places/" -Query @{
    q = "Washington DC"
    country = "US"
    type = "locality,localadmin"
    limit = 10
  }
  $match = $places.results | Where-Object {
    $_.name -eq "Washington" -and $_.country_alpha2 -eq "US" -and (($_.region -match "District of Columbia") -or ($_.county -match "District of Columbia"))
  } | Select-Object -First 1
  if (-not $match) { $match = $places.results | Select-Object -First 1 }
  if (-not $match.id) { throw "Could not find a Washington, DC Place ID from PredictHQ." }
  Write-Host "Using PredictHQ place: $($match.name), $($match.region) ($($match.id))"
  $match.id
}

function Convert-Category {
  param([string]$Category)
  if (-not $Category) { return "community" }
  $Category.ToLowerInvariant()
}

function Convert-TagTitle {
  param($Value)
  if ($Value -and $Value.PSObject.Properties["label"]) { $Value = $Value.label }
  elseif ($Value -and $Value.PSObject.Properties["name"]) { $Value = $Value.name }
  elseif ($Value -and $Value.PSObject.Properties["title"]) { $Value = $Value.title }
  elseif ($Value -and $Value.PSObject.Properties["value"]) { $Value = $Value.value }
  if (-not $Value) { return "" }
  $text = ($Value -replace '[-_]+', ' ' -replace '\s+', ' ').Trim()
  if (-not $text) { return "" }
  (Get-Culture).TextInfo.ToTitleCase($text.ToLowerInvariant())
}

function Add-EventTag {
  param([System.Collections.ArrayList]$Tags, [string]$Value)
  $tag = Convert-TagTitle $Value
  if ($tag -and -not ($Tags | Where-Object { $_.ToLowerInvariant() -eq $tag.ToLowerInvariant() })) {
    [void]$Tags.Add($tag)
  }
}

function Get-LogicalTags {
  param($Event, [string]$Category, [string]$VenueName)
  $tags = [System.Collections.ArrayList]::new()
  $text = "$($Event.title) $($Event.description) $VenueName".ToLowerInvariant()
  Add-EventTag -Tags $tags -Value $Category
  if ($Event.labels) { $Event.labels | Select-Object -First 6 | ForEach-Object { Add-EventTag -Tags $tags -Value $_ } }
  if ($Event.phq_labels) { $Event.phq_labels | Select-Object -First 6 | ForEach-Object { Add-EventTag -Tags $tags -Value $_ } }
  if ($Category -eq "concerts" -or $text -match "concert|live music|band|dj|jazz|vinyl|songwriter|showcase") { Add-EventTag -Tags $tags -Value "Live Music" }
  if ($text -match "dj|dance|party|club|nightlife") { Add-EventTag -Tags $tags -Value "Nightlife" }
  if ($text -match "comedy|stand up|open mic") { Add-EventTag -Tags $tags -Value "Comedy" }
  if ($text -match "film|cinema|screening|movie") { Add-EventTag -Tags $tags -Value "Film" }
  if ($text -match "gallery|museum|exhibit|exhibition|art opening") { Add-EventTag -Tags $tags -Value "Art" }
  if ($text -match "market|food|tasting|brunch|restaurant|chef|wine|beer|cocktail") { Add-EventTag -Tags $tags -Value "Food & Drink" }
  if ($text -match "run|yoga|fitness|bike|pickleball|wellness") { Add-EventTag -Tags $tags -Value "Fitness" }
  if ($text -match "nats|nationals|soccer|basketball|football|hockey|game\b|sports") { Add-EventTag -Tags $tags -Value "Sports" }
  if ($text -match "family|kids|children") { Add-EventTag -Tags $tags -Value "Family Friendly" }
  if ($text -match "free|no cover|complimentary") { Add-EventTag -Tags $tags -Value "Free" }
  if ($text -match "workshop|class|learn|lesson") { Add-EventTag -Tags $tags -Value "Classes" }
  if ($text -match "community|volunteer|neighborhood|meetup") { Add-EventTag -Tags $tags -Value "Community" }
  if ($Event.start) {
    $dcZone = [System.TimeZoneInfo]::FindSystemTimeZoneById("Eastern Standard Time")
    $hour = [System.TimeZoneInfo]::ConvertTimeFromUtc(([datetime]$Event.start).ToUniversalTime(), $dcZone).Hour
    if ($hour -ge 4 -and $hour -lt 12) { Add-EventTag -Tags $tags -Value "Morning" }
    elseif ($hour -ge 12 -and $hour -lt 16) { Add-EventTag -Tags $tags -Value "Afternoon" }
    elseif ($hour -ge 16 -and $hour -lt 21) { Add-EventTag -Tags $tags -Value "Evening" }
    else { Add-EventTag -Tags $tags -Value "Late Night" }
  }
  @($tags | Select-Object -First 10)
}

function Get-EntityName {
  param($Event)
  $venue = $Event.entities | Where-Object { $_.type -eq "venue" -or $_.type -eq "place" } | Select-Object -First 1
  if ($venue.name) { return $venue.name }
  $inferred = Get-VenueNameFromText "$($Event.title) $($Event.description)"
  if ($inferred) { return $inferred }
  "Location in description"
}

function Get-EventAddress {
  param($Event)
  if ($Event.geo.address.formatted_address) { return $Event.geo.address.formatted_address }
  $entityWithAddress = $Event.entities | Where-Object { $_.formatted_address } | Select-Object -First 1
  if ($entityWithAddress.formatted_address) { return $entityWithAddress.formatted_address }
  ""
}

function Get-VenueNameFromText {
  param([string]$Text)
  $cleaned = "$Text" -replace '^Sourced from predicthq\.com\s*-\s*', ''
  $patterns = @(
    '\bat\s+([A-Z][A-Za-z0-9&''’.\- ]{2,70}?)(?:[.,!|]| for | with | featuring | in Washington| in D\.C\.|$)',
    '\b@\s*([A-Z][A-Za-z0-9&''’.\- ]{2,70}?)(?:[.,!|]|$)',
    '\|\s*([A-Z0-9][A-Za-z0-9&''’.\- ]{2,45}?)\s*(?:\||$)'
  )
  foreach ($pattern in $patterns) {
    $match = [regex]::Match($cleaned, $pattern)
    if ($match.Success) {
      $candidate = $match.Groups[1].Value.Trim()
      if ($candidate -and -not (Test-AddressOnlyVenue $candidate) -and $candidate -notmatch 'hosted by|washington d\.?c\.?$') {
        return $candidate
      }
    }
  }
  ""
}

function Test-AddressOnlyVenue {
  param([string]$VenueName)
  if (-not $VenueName) { return $true }
  $patterns = @("United States of America", "Washington, DC 20", "Street ", "Avenue ", "Road ", "Northwest", "Northeast", "Southwest", "Southeast")
  foreach ($pattern in $patterns) {
    if ($VenueName -match [regex]::Escape($pattern)) { return $true }
  }
  return $false
}

function Get-LokalScore {
  param($Event, [string]$VenueName, [string]$Category)
  $score = 50
  $title = "$($Event.title)".ToLowerInvariant()
  $description = "$($Event.description)".ToLowerInvariant()
  $text = "$title $description"
  if ($Category -eq "concerts") { $score += 24 }
  if ($Category -eq "performing-arts") { $score += 18 }
  if ($Category -eq "sports") { $score += 16 }
  if ($Category -eq "festivals") { $score += 18 }
  if ($Category -eq "expos") { $score += 4 }
  if ($Event.phq_attendance) { $score += [Math]::Min(12, [Math]::Floor([double]$Event.phq_attendance / 250)) }
  if ($Event.local_rank) { $score += [Math]::Min(10, [Math]::Floor([double]$Event.local_rank / 10)) }
  if (Test-AddressOnlyVenue $VenueName) { $score -= 12 }
  if ($text -match "open mic|concert|live|dj|party|film|gallery|workshop|class|festival|market|yoga|dance|sip|trivia|comedy") { $score += 12 }
  if ($text -match "conference|summit|forum|clinic|information session|training institute|tax|policy|real estate|estate planning|legal clinic") { $score -= 28 }
  [Math]::Max(0, [Math]::Min(100, $score))
}

function Test-LokalEvent {
  param($Event)
  $venueName = Get-EntityName $Event
  $category = Convert-Category $Event.category
  $title = "$($Event.title)".ToLowerInvariant()
  $description = "$($Event.description)".ToLowerInvariant()
  $text = "$title $description"
  if ($category -eq "hidden") { return $false }
  if ($venueName -eq "Location in description") { return $false }
  if ($text -match "conference|summit|forum|clinic|information session|training institute|tax conference|public policy|real estate|estate planning|legal clinic") { return $false }
  if ((Test-AddressOnlyVenue $venueName) -and -not ($text -match "concert|open mic|film|gallery|party|workshop|class|festival|market|yoga|dance|sip|trivia|comedy")) { return $false }
  return $true
}

function Convert-Event {
  param($Event)

  $longitude = $null
  $latitude = $null
  if ($Event.location -and $Event.location.Count -ge 2) {
    $longitude = $Event.location[0]
    $latitude = $Event.location[1]
  }

  $startDate = $null
  $time = $null
  if ($Event.start_local) {
    $startDate = "$($Event.start_local)".Substring(0, 10)
  } elseif ($Event.start) {
    $startDate = "$($Event.start)".Substring(0, 10)
  }
  if ($Event.start) {
    $dcZone = [System.TimeZoneInfo]::FindSystemTimeZoneById("Eastern Standard Time")
    $time = [System.TimeZoneInfo]::ConvertTimeFromUtc(([datetime]$Event.start).ToUniversalTime(), $dcZone).ToString("h:mm tt")
  }

  $externalUrl = $Event.event_url
  if (-not $externalUrl) { $externalUrl = $Event.url }
  $venueName = Get-EntityName $Event
  $category = Convert-Category $Event.category
  $tags = Get-LogicalTags -Event $Event -Category $category -VenueName $venueName
  $lokalScore = Get-LokalScore -Event $Event -VenueName $venueName -Category $category
  $description = "$($Event.description)" -replace '^Sourced from predicthq\.com\s*-\s*', ''
  $description = $description -replace '^Sourced from predicthq\.com\.?\s*', ''
  $description = $description.Trim()
  $address = Get-EventAddress $Event
  if ($address -and $description -and -not $description.Contains($address)) { $description = "$description`n`nAddress: $address" }
  if ($address -and -not $description) { $description = "Address: $address" }
  if (-not $description) { $description = $null }

  [ordered]@{
    title = $(if ($Event.title) { $Event.title } else { "Untitled event" })
    description = $description
    category = $category
    tag = $(if ($tags.Count) { $tags[0] } elseif ($Event.labels -and $Event.labels.Count) { $Event.labels[0] } else { $Event.category })
    tags = $tags
    venue_name = $venueName
    venue = $venueName
    neighborhood = "Washington, DC"
    date = $startDate
    time = $time
    starts_at = $Event.start
    ends_at = $Event.end
    timezone = $(if ($Event.timezone) { $Event.timezone } else { $Timezone })
    ticket_url = $externalUrl
    source = "predicthq"
    external_id = $Event.id
    external_url = $externalUrl
    latitude = $latitude
    longitude = $longitude
    lokal_score = $lokalScore
    raw_json = $Event
    last_seen_at = (Get-Date).ToUniversalTime().ToString("o")
    updated_at = (Get-Date).ToUniversalTime().ToString("o")
  }
}

function Get-SupabaseEventColumns {
  param([string]$BaseUrl, [string]$Key)

  $columnsUrl = "$($BaseUrl.TrimEnd('/'))/rest/v1/events?select=*&limit=0"
  try {
    $response = Invoke-WebRequest -Method Get -Uri $columnsUrl -Headers @{
      apikey = $Key
      Authorization = "Bearer $Key"
      "User-Agent" = "lokal-predicthq-sync/1.0"
      Accept = "application/json"
      Prefer = "return=representation"
    } -UseBasicParsing
    $range = $response.Headers["Content-Range"]
    $rows = $response.Content | ConvertFrom-Json
    if ($rows -and $rows.Count -gt 0) {
      return @($rows[0].PSObject.Properties.Name)
    }
  } catch {
    Write-Host "Could not inspect event columns from rows; falling back to known Lokal columns." -ForegroundColor Yellow
  }

  @(
    "title",
    "description",
    "category",
    "tag",
    "tags",
    "venue_name",
    "venue",
    "neighborhood",
    "date",
    "time",
    "starts_at",
    "ends_at",
    "timezone",
    "price_min",
    "price_max",
    "ticket_url",
    "image_url",
    "source",
    "external_id",
    "external_url",
    "latitude",
    "longitude",
    "lokal_score",
    "raw_json",
    "last_seen_at",
    "updated_at"
  )
}

function Select-KnownColumns {
  param($Row, [string[]]$Columns)

  $output = [ordered]@{}
  foreach ($column in $Columns) {
    if ($Row.Contains($column)) {
      $output[$column] = $Row[$column]
    }
  }
  $output
}

function Clear-ExistingPredictHqEvents {
  param([string]$BaseUrl, [string]$Key)

  $deleteUrl = "$($BaseUrl.TrimEnd('/'))/rest/v1/events?source=eq.predicthq"
  Invoke-RestMethod -Method Delete -Uri $deleteUrl -Headers @{
    apikey = $Key
    Authorization = "Bearer $Key"
    "User-Agent" = "lokal-predicthq-sync/1.0"
    Prefer = "return=minimal"
  }
  Write-Host "Cleared existing PredictHQ rows before writing curated rows."
}

$place = Get-DcPlaceId
$start = Get-Date -Format "yyyy-MM-dd"
$end = (Get-Date).AddDays($LookaheadDays).ToString("yyyy-MM-dd")
Write-Host "Fetching PredictHQ events for DC from $start to $end ($Timezone)"
Write-Host "PredictHQ categories: $Categories"
Write-Host "Excluded categories: $ExcludedCategories"
Write-Host "Location filter: $(if ($UseScope) { 'place.scope' } else { 'place.exact' })=$place"

$events = @()
$offset = 0
do {
  $query = @{
    "active.gte" = $start
    "active.lte" = $end
    "active.tz" = $Timezone
    category = $Categories
    sort = "start"
    limit = $Limit
    offset = $offset
  }
  if ($UseScope) { $query["place.scope"] = $place } else { $query["place.exact"] = $place }
  $data = Invoke-PredictHqGet -Path "events/" -Query $query
  if ($data.results) { $events += $data.results }
  $offset += $Limit
} while ($data.next -and $data.results.Count)

$allowedCategoryList = $Categories.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
$excludedCategoryList = $ExcludedCategories.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
$beforeFilterCount = $events.Count
$events = $events | Where-Object {
  ($allowedCategoryList -contains $_.category) -and -not ($excludedCategoryList -contains $_.category)
}
$events = $events | Where-Object { Test-LokalEvent $_ }
Write-Host "Kept $($events.Count) of $beforeFilterCount PredictHQ rows after Lokal category and quality cleanup."

$rows = $events | ForEach-Object { Convert-Event $_ }
$rows = $rows | Sort-Object -Property @{ Expression = { $_["date"] }; Ascending = $true }, @{ Expression = { -1 * $_["lokal_score"] }; Ascending = $true }

if (-not $SupabaseUrl -or -not $SupabaseServiceRoleKey) {
  Write-Host "Supabase env vars are missing, so printing normalized events instead of writing."
  $rows | Select-Object -First 10 | ConvertTo-Json -Depth 50
  Write-Host "Fetched $($rows.Count) PredictHQ events."
  exit 0
}

if ($rows.Count -eq 0) {
  Write-Host "No PredictHQ events found for this window."
  exit 0
}

$columns = Get-SupabaseEventColumns -BaseUrl $SupabaseUrl -Key $SupabaseServiceRoleKey
$rows = $rows | ForEach-Object { Select-KnownColumns -Row $_ -Columns $columns }
Write-Host "Writing columns: $($columns -join ', ')"
Clear-ExistingPredictHqEvents -BaseUrl $SupabaseUrl -Key $SupabaseServiceRoleKey

$restUrl = "$($SupabaseUrl.TrimEnd('/'))/rest/v1/events?on_conflict=source,external_id"
$body = $rows | ConvertTo-Json -Depth 80
try {
  Invoke-RestMethod -Method Post -Uri $restUrl -Headers @{
    apikey = $SupabaseServiceRoleKey
    Authorization = "Bearer $SupabaseServiceRoleKey"
    "Content-Type" = "application/json"
    "User-Agent" = "lokal-predicthq-sync/1.0"
    Prefer = "resolution=merge-duplicates,return=minimal"
  } -Body $body
} catch {
  $response = $_.Exception.Response
  if ($response -and $response.GetResponseStream()) {
    $reader = [System.IO.StreamReader]::new($response.GetResponseStream())
    $details = $reader.ReadToEnd()
    Write-Host "Supabase response body:" -ForegroundColor Yellow
    Write-Host $details -ForegroundColor Yellow
  }
  throw
}

Write-Host "Upserted $($rows.Count) PredictHQ events into Supabase."

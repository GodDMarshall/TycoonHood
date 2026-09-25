<#
  PUSH TYCOONHOOD TO GITHUB

  Run it from the project root:
      powershell -NoProfile -ExecutionPolicy Bypass -File .\push-to-github.ps1

  It asks for your GitHub username, checks the repository actually exists,
  fixes the remote, and pushes. There is nothing to copy and paste wrong.
#>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Say  ($m) { Write-Host "  $m" }
function Good ($m) { Write-Host "  [ok] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  [!]  $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host ""; Write-Host "  [x] $m" -ForegroundColor Red; Write-Host ""; exit 1 }

Write-Host ""
Write-Host "  ======== PUSH TYCOONHOOD TO GITHUB ========" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------ sanity
if (-not (Test-Path (Join-Path $root ".git"))) {
  Die "This folder is not a git repository. Expected D:\TycoonHood."
}
$branch = (git branch --show-current).Trim()
$commits = (git rev-list --count HEAD).Trim()
Good "Repository found: branch '$branch', $commits commit(s)"

$dirty = (git status --porcelain)
if ($dirty) {
  Warn "You have uncommitted changes. They will NOT be pushed:"
  git status --short | Select-Object -First 8 | ForEach-Object { Write-Host "       $_" }
  Write-Host ""
}

# ------------------------------------------------ username
Write-Host ""
Say "Your GitHub username is the name in your profile URL:"
Say "  github.com/USERNAME  <- just that part, no https, no slashes"
Write-Host ""
$user = (Read-Host "  GitHub username").Trim()

if (-not $user)                      { Die "No username entered." }
if ($user -match '[<>/\\:@\s]')      { Die "That still has punctuation in it. Type ONLY the username, e.g.  harshangowda97" }
if ($user -notmatch '^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$') {
  Die "'$user' is not a valid GitHub username. Letters, numbers and single hyphens only."
}

$repo = (Read-Host "  Repository name [tycoonhood]").Trim()
if (-not $repo) { $repo = "tycoonhood" }

$url = "https://github.com/$user/$repo.git"
Write-Host ""
Good "Target: $url"

# ------------------------------------------------ does it exist?
Write-Host ""
Say "Checking that the repository exists..."
$exists = $true
try {
  git ls-remote $url HEAD 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { $exists = $false }
} catch { $exists = $false }

if (-not $exists) {
  Write-Host ""
  Warn "Could not reach $url"
  Write-Host ""
  Say "Two reasons this happens:"
  Say "  1. The repository does not exist yet. Create it here:"
  Say "       https://github.com/new"
  Say "     Name: $repo   Visibility: Private"
  Say "     Do NOT tick README, .gitignore or licence - it must be EMPTY."
  Say "  2. It is private and git has not asked you to sign in yet."
  Say "     That is fine - the push below will open a browser window."
  Write-Host ""
  $go = Read-Host "  Have you created the repository? (y/n)"
  if ($go -notmatch '^[Yy]') { Die "Create it first, then run this script again." }
} else {
  Good "Repository reachable"
}

# ------------------------------------------------ remote
Write-Host ""
$existing = (git remote) -split "`n" | Where-Object { $_.Trim() -eq "origin" }
if ($existing) {
  Say "Replacing the existing 'origin' remote..."
  git remote remove origin
}
git remote add origin $url
if ($LASTEXITCODE -ne 0) { Die "Could not set the remote." }
Good "Remote set to $url"

# ------------------------------------------------ push
Write-Host ""
Say "Pushing $commits commit(s) on '$branch'..."
Say "(A browser window may open so you can sign in to GitHub. That is expected.)"
Write-Host ""
git push -u origin $branch

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Warn "The push failed. The usual causes, in order:"
  Say "  * The repository is not empty - you ticked 'Add a README'."
  Say "    Fix: delete it on GitHub and make a new EMPTY one."
  Say "  * You signed in as a different account than '$user'."
  Say "    Fix: Windows Credential Manager -> remove the github.com entry, then re-run."
  Say "  * The repository name is wrong, or it belongs to an organisation."
  Write-Host ""
  Die "Nothing was lost. Your commit is safe locally - fix the cause and run this again."
}

Write-Host ""
Write-Host "  ======== PUSHED ========" -ForegroundColor Green
Write-Host ""
Good "https://github.com/$user/$repo"
Write-Host ""
Say "Send that link back to Claude and the Vercel setup can start."
Write-Host ""

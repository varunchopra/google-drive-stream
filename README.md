# video-stream-api

video-stream-api is an app utilising Nightmare.js to fetch videos from Google Drive and serve them over an Express web server.

## Configuration

* `cache` config:
  * `cookieLifetime`: time cookies are stored for.
  * `fileLifetime`: time each link is cached for.

* `security` config:
  * `token`: string passed to the server in the URL as a somewhat generic way of authentication.
  * `sites`: list of sites that can access the server without facing a redirect.

* `google` config:
  * `email`: your google drive e-mail address on which the files are stored.
  * `password`: your google drive password in plaintext.

* `database` config:
  * `name`: database name.
  * `username`: user who can access above database (INSERT/SELECT privs).
  * `password`: password of said user.
  * `host`: database host server.
  
### Example configuration

    const config = {
        cache: {
            cookieLifetime: 12000,
            fileLifetime: 12000
        },
        security: {
            token: "pzblervv",
            sites: ["moveetime.com", "moveetime.org"]
        },
        google: {
            email: "genericemail@gmail.com",
            password: "genericpassword123"
        },
        database: {
            name: "genericdatabase",
            username: "root",
            password: "password",
            host: "localhost"
        }
    };

    module.exports = config;

## Bypassing Limits

Google sets a limit on how many times a file can be accessed by an account within a time period. This is a bit flexible and can be bypassed by sharing files to different accounts.

This is a PowerShell script for accessing the API and switching accounts by detecting if this limit has been breached:

```powershell
$ConfigUrl = 'https://10.0.1.1/config.json'

$ServerIp = (curl icanhazip.com).Content.trim()

# Load config.
try{
  $Config = ConvertFrom-Json (Invoke-WebRequest -Uri $ConfigUrl -UseBasicParsing).Content
}
catch [System.Net.WebException],[System.Exception]{
  exit
}

# Config has been loaded. Declare functions.
function Log($LogText){
  Write-Output "[$([System.DateTime]::Now)] $($LogText)." | Out-File -Append -FilePath "$($Config.Details.ConfigPath)\UptimeLog.txt"
}

# Check to see if license matches for the domain.
if ($Config.Details.ServerIp -eq $ServerIp){
  # Log("IP matches the one in the license.")
}
else{
  Log("IP doesn't match license!")
}

$TestUrl = "http://$($Config.Details.ServerIp)/api?f=$($Config.Details.FileId)&token=$($Config.Details.Token)"

$ConfigPath = "$($Config.Details.ConfigPath)\config\config.js"

Set-Location -Path $Config.Details.ConfigPath

# Phase I - Check if Api is responsive.
try{
  $ApiContent = (Invoke-WebRequest $TestUrl).Content
}
catch [System.Net.WebException],[System.Exception]{
  $ApiContent = 0
}
if ($ApiContent -match 'DRIVE_STREAM'){
  # Log("Script is running fine!")
  exit
}
else{
  if ($ApiContent -like "Cannot read property 'split' of undefined"){
    Log("Bandwidth limit crossed.")
  }
  elseif ($ApiContent -like "Navigation timed out after 30000 ms"){
    Log("Server is too slow.")
  }
  else{
    Log("Script may not be able to login! Error:")
    Log($ApiContent)
  }
  
  Get-Process -Name node, electron | Stop-Process
  
  # Phase II - Change e-mail.

  $ConfigContent = Get-Content $ConfigPath
  $CurrentEmail = (($ConfigContent -match 'email') -split "'")[1]
  $CurrentPassword = (($ConfigContent -match 'password') -split "'")[1]

  foreach ($item in $Config.Accounts){
    if ($item.Email -match $CurrentEmail){
      if ($item.Email -eq $Config.Accounts.Email[-1]){
        $NewEmail = $Config.Accounts.Email[0]
        $NewPassword = $Config.Accounts.Password[0]
      }
      else{
        $NewEmail = $Config.Accounts.Email[[array]::IndexOf($Config.Accounts.Email,$CurrentEmail) + 1]
        $NewPassword = $Config.Accounts.Password[[array]::IndexOf($Config.Accounts.Email,$CurrentEmail) + 1]
      }
    }
  }
  $ConfigContent | ForEach-Object { $_.replace($CurrentEmail, $NewEmail).replace($CurrentPassword, $NewPassword) } | Out-File $ConfigPath -Encoding default

  # Phase III - Restart forever.

  Start-Process forever -ArgumentList 'start server.js'
}
```

Your configuration file for this can be something like this:

```json
{
  "Details": {
    "ServerIp": "10.0.1.2",
    "FileId": "<TEST FILE ID>",
    "Token": "<TOKEN>",
    "ConfigPath": "C:\\API"
  },
  "Emails": [
    {
      "Email": "<email 1 as specified in the main config>",
      "Password": "password"
    },
    {
      "Email": "<alternate email with access to files>",
      "Password": "password"
    }
  ]
}
```

# License

GNU General Public License v3.0

See [LICENSE](LICENSE) to see the full text.

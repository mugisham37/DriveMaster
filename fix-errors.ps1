# PowerShell script to fix TypeScript errors in content-service-client.ts

$filePath = "C:\Users\MUGISHA MOSES\Desktop\Codding\Development\My own projects\DriveMaster\apps\web-app\src\lib\content-service\client\content-service-client.ts"

# Read the file content
$content = Get-Content -Path $filePath -Raw

# 1. Fix all ContentServiceError object literals - add 'name' property after opening brace
#    Pattern: const error: ContentServiceError = {\n      type:
#    Replace: const error: ContentServiceError = {\n      name: 'ContentServiceError',\n      type:

$patterns = @(
    # Pattern for all error variables
    @{
        Old = "(\s+const\s+\w+Error:\s+ContentServiceError\s+=\s+\{\r?\n\s+)(type:)"
        New = '$1name: ''ContentServiceError'',$1$2'
    }
)

foreach ($pattern in $patterns) {
    $content = $content -replace $pattern.Old, $pattern.New
}

# 2. Fix AuthorizationError object literal at line ~1644
$content = $content -replace `
    '(?s)(if\s+\(response\.status\s+===\s+401\)\s+\{\r?\n\s+)(const\s+authError:\s+AuthorizationError\s+=\s+\{\r?\n\s+name:\s+[''"]AuthorizationError[''"],\r?\n\s+statusCode:\s+401,\r?\n\s+type:\s+[''"]authorization[''"],\r?\n\s+code:\s+[''"]UNAUTHORIZED[''"],\r?\n\s+message:\s+[''"]Unauthorized\s+to\s+delete\s+media\s+asset[''"],\r?\n\s+\};\r?\n\s+authError\.cause\s+=\s+err;)', `
    '$1const authError = new AuthorizationError(''Unauthorized to delete media asset'');$1authError.cause = err;'

# 3. Fix ConflictError object literal at line ~2036
$content = $content -replace `
    '(?s)(if\s+\(response\.status\s+===\s+409\)\s+\{\r?\n\s+)(const\s+conflictError:\s+ConflictError\s+=\s+\{\r?\n\s+name:\s+[''"]ConflictError[''"],\r?\n\s+statusCode:\s+409,\r?\n\s+type:\s+[''"]conflict[''"],\r?\n\s+code:\s+[''"]WORKFLOW_CONFLICT[''"],\r?\n\s+message:\s+[''"]Workflow\s+state\s+conflict[''"],\r?\n\s+\};\r?\n\s+conflictError\.cause\s+=\s+err;)', `
    '$1const conflictError = new ConflictError(''Workflow state conflict'');$1conflictError.cause = err;'

# Write the content back
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "Fixed all ContentServiceError name properties and Auth/Conflict errors!" -ForegroundColor Green

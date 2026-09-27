# instalar.ps1 — deja el equipo del cliente listo para trabajar con su sitio.
#
# Windows. Para Linux/macOS, usar instalar.sh.
# Lo ejecuta el PROVEEDOR durante la entrega, con el cliente presente.
#
#   Abrir PowerShell y ejecutar:
#     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#     .\instalar.ps1
#
# Es seguro repetirlo: comprueba antes de instalar y no toca lo que ya está.

$ErrorActionPreference = "Continue"

function Paso($t) { Write-Host "`n-- $t ---------------------" -ForegroundColor DarkGray }
function Bien($t) { Write-Host "  [OK] $t"  -ForegroundColor Green }
function Mal($t)  { Write-Host "  [X]  $t"  -ForegroundColor Red }
function Ojo($t)  { Write-Host "  [!]  $t"  -ForegroundColor Yellow }
function Hay($c)  { $null -ne (Get-Command $c -ErrorAction SilentlyContinue) }

# Devuelve el comando de un Python 3 de VERDAD, o $null.
#
# No basta con Get-Command: en Windows "python" puede ser el alias de Microsoft
# Store, que existe como comando pero abre la tienda en vez de ejecutar nada.
# Por eso se le pide la version y se comprueba que responda "Python 3.".
function PythonReal {
  foreach ($c in @(@("python",@()), @("py",@("-3")), @("python3",@()))) {
    $cmd, $pre = $c
    if (-not (Hay $cmd)) { continue }
    try {
      $v = & $cmd @pre --version 2>&1 | Out-String
      if ($v -match "Python 3\.") { return ,@($cmd, $pre) }
    } catch { }
  }
  return $null
}


Write-Host "`n  Instalacion del asistente del sitio web`n"

if (-not (Hay "winget")) {
  Mal "Falta winget, el instalador de Windows."
  Write-Host "  Actualiza Windows o instala 'Instalador de aplicaciones' desde Microsoft Store."
  exit 1
}
Bien "Sistema detectado (usando winget)"

# -- Git ----------------------------------------------------------------------
Paso "Git"
if (Hay "git") {
  Bien "Ya estaba instalado ($((git --version) -replace 'git version ',''))"
} else {
  Write-Host "  Instalando..."
  winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements | Out-Null
  $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
              [Environment]::GetEnvironmentVariable("Path","User")
  if (Hay "git") { Bien "Instalado" } else { Mal "No se pudo instalar Git" }
}

# -- Node ---------------------------------------------------------------------
# Hace falta para la vista previa: sin ella el asistente no puede mostrarle
# un cambio al cliente antes de publicarlo.
Paso "Node"
if (Hay "node") {
  Bien "Ya estaba instalado ($(node --version))"
} else {
  Write-Host "  Instalando..."
  winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements | Out-Null
  $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
              [Environment]::GetEnvironmentVariable("Path","User")
  if (Hay "node") { Bien "Instalado ($(node --version))" } else { Mal "No se pudo instalar Node" }
}

# -- Python ---------------------------------------------------------------------
# Algunas herramientas del sitio lo usan (el catalogo en Excel, por ejemplo).
Paso "Python"
$py = PythonReal
if ($py) {
  Bien "Ya estaba instalado ($(& $py[0] @($py[1]) --version))"
} else {
  Write-Host "  Instalando..."
  winget install --id Python.Python.3.12 -e --source winget --accept-package-agreements --accept-source-agreements | Out-Null
  $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
              [Environment]::GetEnvironmentVariable("Path","User")
  $py = PythonReal
  if ($py) { Bien "Instalado" }
  else {
    Mal "No se pudo instalar Python"
    Ojo "Si 'python' abre la Microsoft Store, apaga el alias en:"
    Write-Host "     Configuracion -> Aplicaciones -> Alias de ejecucion de aplicaciones"
  }
}
if ($py -and (Test-Path "tools/requirements.txt")) {
  Write-Host "  Instalando lo que usan las herramientas del sitio..."
  & $py[0] @($py[1]) -m pip install --quiet --user -r tools/requirements.txt
  if ($LASTEXITCODE -eq 0) { Bien "Listas" } else { Ojo "No se pudieron instalar; se reintenta con doctor.ps1" }
}

# -- El asistente -------------------------------------------------------------
Paso "Asistente de terminal"
$agente = @("opencode","claude","codex") | Where-Object { Hay $_ } | Select-Object -First 1
if ($agente) {
  Bien "Ya estaba instalado ($agente)"
} else {
  Write-Host "  Instalando opencode..."
  if (Hay "npm") {
    npm install -g opencode-ai 2>&1 | Out-Null
    if (Hay "opencode") { $agente = "opencode"; Bien "Instalado (opencode)" }
    else { Mal "No se pudo instalar el asistente" }
  } else { Mal "Falta npm: revisa la instalacion de Node" }
}

# -- Identidad de Git ---------------------------------------------------------
Paso "Identidad para guardar los cambios"
$nombreGit = (git config --global user.name)  2>$null
$correoGit = (git config --global user.email) 2>$null

if ($nombreGit -and $correoGit) {
  Bien "Ya configurada: $nombreGit <$correoGit>"
} else {
  Write-Host "  Los cambios quedan firmados con estos datos. Son del CLIENTE, no del proveedor."
  $nuevoNombre = Read-Host "  Nombre del negocio o de la persona"
  $nuevoCorreo = Read-Host "  Correo"
  git config --global user.name  $nuevoNombre
  git config --global user.email $nuevoCorreo
  $correoGit = $nuevoCorreo
  Bien "Configurada"
}

# -- Llave para publicar ------------------------------------------------------
Paso "Llave para publicar"
$carpetaSsh = Join-Path $HOME ".ssh"
$llave      = Join-Path $carpetaSsh "id_ed25519"

if (Test-Path $llave) {
  Bien "Ya existe una llave"
} else {
  if (-not (Test-Path $carpetaSsh)) { New-Item -ItemType Directory -Path $carpetaSsh | Out-Null }
  $comentario = if ($correoGit) { $correoGit } else { "sitio-web" }
  ssh-keygen -t ed25519 -f $llave -N '""' -C $comentario -q
  Bien "Llave creada"
}

Write-Host "`n  PASO MANUAL: copia la linea de abajo y agregala en la cuenta del cliente," -ForegroundColor Yellow
Write-Host "  en GitHub -> Settings -> SSH and GPG keys -> New SSH key:`n"
Write-Host "  $(Get-Content "$llave.pub")`n"
Read-Host "  Cuando este agregada, pulsa Enter para verificar" | Out-Null

$prueba = ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -T git@github.com 2>&1
if ($prueba -match "successfully authenticated") {
  Bien "Conexion verificada"
} else {
  Ojo "Aun no verifica. Puede tardar un momento; se comprueba luego con doctor.ps1"
}

# -- Componentes del sitio ----------------------------------------------------
Paso "Componentes del sitio"
if (Test-Path "package.json") {
  Write-Host "  Instalando..."
  npm install --silent 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { Bien "Listos" } else { Mal "Fallo la instalacion de componentes" }
} else {
  Ojo "No estamos dentro de la carpeta del sitio"
  Write-Host "  Descarga el sitio y vuelve a ejecutar este paso desde dentro de su carpeta."
}

# -- Cierre -------------------------------------------------------------------
Paso "Listo"
$cual = if ($agente) { $agente } else { "opencode" }
Write-Host "  Verifica el resultado con:`n"
Write-Host "    .\doctor.ps1`n" -ForegroundColor Green
Write-Host "  Y para trabajar, dentro de la carpeta del sitio:`n"
Write-Host "    $cual`n" -ForegroundColor Green
Write-Host "  IMPORTANTE: cierra esta ventana y abre una nueva para que todo funcione.`n" -ForegroundColor Yellow

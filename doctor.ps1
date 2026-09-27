# doctor.ps1 — revisa que el asistente del sitio pueda trabajar.
#
# No instala ni cambia nada: solo mira y reporta en lenguaje entendible.
# Se usa el dia de la entrega y, sobre todo, un año despues cuando algo falle.
#
#   .\doctor.ps1
#
# Ejecutarlo DENTRO de la carpeta del sitio.

$ErrorActionPreference = "Continue"
$script:ok = 0; $script:falla = 0; $script:aviso = 0

function Titulo($t) { Write-Host "`n-- $t ---------------------" -ForegroundColor DarkGray }
function Bien($t) { Write-Host "  [OK] $t" -ForegroundColor Green;  $script:ok++ }
function Mal($t)  { Write-Host "  [X]  $t" -ForegroundColor Red;    $script:falla++ }
function Ojo($t)  { Write-Host "  [!]  $t" -ForegroundColor Yellow; $script:aviso++ }
function Nota($t) { Write-Host "       $t" -ForegroundColor DarkGray }

function Hay($c)  { $null -ne (Get-Command $c -ErrorAction SilentlyContinue) }

# Devuelve el comando de un Python 3 USABLE, o $null.
#
# No basta con que responda "Python 3.". Dos trampas reales:
#
#  - El alias de Microsoft Store existe como comando pero abre la tienda sin
#    ejecutar nada.
#  - Un Python EMBEBIDO dentro de otro programa (Inkscape, GIMP, Krita) puede
#    quedar primero en el PATH y responder la version perfectamente, pero no
#    trae pip, asi que `openpyxl` no se puede instalar y la planilla de Excel
#    queda inservible. Pasó en la primera prueba en Windows: doctor.ps1 lo
#    daba por bueno en verde.
#
# Por eso se exige tambien que responda `-m pip --version`. Se buscan primero
# los que tienen pip; si ninguno lo tiene, se devuelve el mejor que haya y se
# avisa, porque para revisar el catalogo basta con la biblioteca estandar.
function PythonUsable($ExigirPip = $true) {
  foreach ($c in @(@("py",@("-3")), @("python",@()), @("python3",@()))) {
    $cmd, $pre = $c
    if (-not (Hay $cmd)) { continue }
    try {
      $v = & $cmd @pre --version 2>&1 | Out-String
      if ($v -notmatch "Python 3\.") { continue }
      if ($ExigirPip) {
        $p = & $cmd @pre -m pip --version 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0 -or $p -notmatch "pip ") { continue }
      }
      return ,@($cmd, $pre, $v.Trim())
    } catch { }
  }
  return $null
}

# Compatibilidad: el nombre anterior.
function PythonReal { PythonUsable $true }

Write-Host "`n  Revision del asistente de tu sitio web"

Titulo "Programas necesarios"

if (Hay "git") { Bien "Git instalado ($((git --version) -replace 'git version ',''))" }
else { Mal "Falta Git"; Nota "Sin Git no se pueden guardar ni publicar los cambios." }

if (Hay "node") {
  $v = (node --version) -replace 'v',''
  if ([int]($v -split '\.')[0] -ge 20) { Bien "Node instalado (v$v)" }
  else { Ojo "Node v$v es una version vieja"; Nota "Conviene actualizar a la 22 o superior." }
} else { Mal "Falta Node"; Nota "Sin Node no se puede ver la vista previa antes de publicar." }

$agente = @("opencode","claude","codex") | Where-Object { Hay $_ } | Select-Object -First 1
if ($agente) { Bien "Asistente instalado ($agente)" }
else { Mal "No se encontro ningun asistente"; Nota "Deberia estar opencode, claude o codex." }

if (Test-Path "tools/requirements.txt") {
  $py = PythonUsable $true
  if ($py) { Bien "Python instalado ($($py[2]))" }
  elseif (PythonUsable $false) {
    $otro = PythonUsable $false
    Mal "El Python de este equipo no sirve ($($otro[2]))"
    Nota "Responde la version pero no trae pip, asi que no se puede instalar lo"
    Nota "que necesita la planilla de Excel. Suele ser el Python que viene dentro"
    Nota "de otro programa (Inkscape, GIMP) y quedo primero en el PATH."
    Nota "Se arregla con: .\instalar.ps1"
  }
  else {
    Mal "Falta Python"
    Nota "Este sitio lo necesita para revisar el catalogo y para la planilla de Excel."
    Nota "Se arregla con: .\instalar.ps1"
    if (Hay "python") { Nota "OJO: 'python' existe pero no responde. Suele ser el alias de Microsoft Store: apagalo en Configuracion -> Aplicaciones -> Alias de ejecucion." }
  }
}

Titulo "Tu sitio"

if (Test-Path ".git") {
  Bien "La carpeta del sitio esta bien preparada"
} else {
  Mal "Esta no parece ser la carpeta de tu sitio"
  Nota "Abrela primero y vuelve a ejecutar esta revision."
}

foreach ($f in @("AGENTS.md","conocimiento_generado","package.json","src/datos")) {
  if (Test-Path $f) { Bien "Encontrado: $f" } else { Mal "Falta: $f" }
}

if (Test-Path "node_modules") { Bien "Componentes internos instalados" }
else { Ojo "Faltan los componentes internos"; Nota "Se arreglan solos con: npm install" }

Titulo "Conexion para publicar"

# Sin el comando git no se puede revisar nada de esto: que la carpeta .git
# exista no basta. Antes se intentaba igual, PowerShell escupia su error crudo
# y despues se imprimia "No hay cambios pendientes" en verde, que es mentira:
# no se habia revisado nada.
if (-not (Hay "git")) {
  Mal "No se puede revisar la publicacion: falta Git"
  Nota "Se arregla con: .\instalar.ps1"
} elseif (Test-Path ".git") {
  $remoto = git remote get-url origin 2>$null
  if ($remoto) {
    Bien "Conectado al lugar donde se publica"
    git ls-remote origin 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Bien "La conexion funciona: se puede publicar"
    } else {
      Mal "No se pudo conectar para publicar"
      Nota "Puede ser falta de internet, o que las credenciales caducaron."
    }
  } else {
    Mal "El sitio no esta conectado a ningun lugar de publicacion"
  }

  $sinGuardar = @(git status --porcelain 2>$null).Count
  if ($sinGuardar -gt 0) {
    Ojo "Hay $sinGuardar cambio(s) sin guardar"
    Nota "Es normal si estabas trabajando. Pidele al asistente que los guarde o los descarte."
  } else {
    Bien "No hay cambios pendientes"
  }
}

Titulo "Resultado"

if ($script:falla -eq 0 -and $script:aviso -eq 0) {
  Write-Host "`n  Todo en orden. Puedes pedirle cambios a tu asistente.`n" -ForegroundColor Green
  exit 0
} elseif ($script:falla -eq 0) {
  Write-Host "`n  Funciona, con $($script:aviso) aviso(s). Lee las notas de arriba.`n" -ForegroundColor Yellow
  exit 0
} else {
  Write-Host "`n  Hay $($script:falla) problema(s) que impiden trabajar." -ForegroundColor Red
  Write-Host "  Escribele a tu proveedor y pasale esta pantalla completa.`n"
  exit 1
}

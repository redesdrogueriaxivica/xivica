#!/usr/bin/env bash
# instalar — deja el equipo del cliente listo para trabajar con su sitio.
#
# Linux y macOS. Para Windows, usar instalar.ps1.
# Lo ejecuta el PROVEEDOR durante la entrega, con el cliente presente.
#
#   bash instalar.sh
#
# Es seguro repetirlo: comprueba antes de instalar y no toca lo que ya está.

set -uo pipefail

verde=$'\033[32m'; rojo=$'\033[31m'; amarillo=$'\033[33m'; gris=$'\033[90m'; fin=$'\033[0m'

paso()  { printf '\n%s── %s ─────────────────────%s\n' "$gris" "$1" "$fin"; }
bien()  { printf '  %s✓%s %s\n' "$verde" "$fin" "$1"; }
mal()   { printf '  %s✗%s %s\n' "$rojo" "$fin" "$1"; }
ojo()   { printf '  %s!%s %s\n' "$amarillo" "$fin" "$1"; }

# ── Detectar cómo se instalan programas en este equipo ───────────────────────
gestor=""
if   command -v brew    >/dev/null 2>&1; then gestor="brew"
elif command -v apt-get >/dev/null 2>&1; then gestor="apt"
elif command -v dnf     >/dev/null 2>&1; then gestor="dnf"
elif command -v pacman  >/dev/null 2>&1; then gestor="pacman"
fi

instalar_paquete() {
  local nombre="$1"
  case "$gestor" in
    brew)   brew install "$nombre" ;;
    apt)    sudo apt-get update -qq && sudo apt-get install -y "$nombre" ;;
    dnf)    sudo dnf install -y "$nombre" ;;
    pacman) sudo pacman -S --noconfirm "$nombre" ;;
    *)      return 1 ;;
  esac
}

printf '\n  Instalación del asistente del sitio web\n'
[ -n "$gestor" ] && bien "Sistema detectado (usando $gestor)" \
                 || ojo "No se detectó un instalador de paquetes: habrá que instalar a mano"

# ── Git ──────────────────────────────────────────────────────────────────────
paso "Git"
if command -v git >/dev/null 2>&1; then
  bien "Ya estaba instalado ($(git --version | awk '{print $3}'))"
else
  echo "  Instalando..."
  instalar_paquete git && bien "Instalado" || mal "No se pudo instalar Git"
fi

# ── Node ─────────────────────────────────────────────────────────────────────
# Hace falta para la vista previa: sin ella el asistente no puede mostrarle
# un cambio al cliente antes de publicarlo.
paso "Node"
if command -v node >/dev/null 2>&1; then
  bien "Ya estaba instalado ($(node --version))"
else
  echo "  Instalando..."
  case "$gestor" in
    brew) brew install node ;;
    apt)  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - \
            && sudo apt-get install -y nodejs ;;
    *)    instalar_paquete nodejs ;;
  esac
  command -v node >/dev/null 2>&1 && bien "Instalado ($(node --version))" \
                                  || mal "No se pudo instalar Node"
fi

# ── Python ───────────────────────────────────────────────────────────────────
# Algunas herramientas del sitio lo usan (el catálogo en Excel, por ejemplo).
# Se detecta si hace falta sin obligar a instalarlo cuando el sitio no lo usa.
paso "Python"
if command -v python3 >/dev/null 2>&1; then
  bien "Ya estaba instalado ($(python3 --version | awk '{print $2}'))"
else
  echo "  Instalando..."
  case "$gestor" in
    brew) brew install python ;;
    *)    instalar_paquete python3 ;;
  esac
  command -v python3 >/dev/null 2>&1 && bien "Instalado ($(python3 --version | awk '{print $2}'))" \
                                      || mal "No se pudo instalar Python"
fi
if command -v python3 >/dev/null 2>&1 && [ -f "tools/requirements.txt" ]; then
  echo "  Instalando lo que usan las herramientas del sitio..."
  python3 -m pip install --quiet --user -r tools/requirements.txt \
    && bien "Listas" || ojo "No se pudieron instalar; se reintenta con doctor.sh"
fi

# ── El asistente ─────────────────────────────────────────────────────────────
paso "Asistente de terminal"
agente=""
for a in opencode claude codex; do
  command -v "$a" >/dev/null 2>&1 && agente="$a" && break
done
if [ -n "$agente" ]; then
  bien "Ya estaba instalado ($agente)"
else
  echo "  Instalando opencode..."
  if command -v npm >/dev/null 2>&1; then
    npm install -g opencode-ai && agente="opencode"
  fi
  [ -n "$agente" ] && bien "Instalado ($agente)" || mal "No se pudo instalar el asistente"
fi

# ── Identidad de Git ─────────────────────────────────────────────────────────
paso "Identidad para guardar los cambios"
nombre_git=$(git config --global user.name  2>/dev/null || true)
correo_git=$(git config --global user.email 2>/dev/null || true)

if [ -n "$nombre_git" ] && [ -n "$correo_git" ]; then
  bien "Ya configurada: $nombre_git <$correo_git>"
else
  echo "  Los cambios quedan firmados con estos datos. Son del CLIENTE, no del proveedor."
  read -r -p "  Nombre del negocio o de la persona: " nuevo_nombre
  read -r -p "  Correo: " nuevo_correo
  git config --global user.name  "$nuevo_nombre"
  git config --global user.email "$nuevo_correo"
  bien "Configurada"
fi

# ── Llave para publicar ──────────────────────────────────────────────────────
paso "Llave para publicar"
llave="$HOME/.ssh/id_ed25519"
if [ -f "$llave" ]; then
  bien "Ya existe una llave"
else
  mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"
  ssh-keygen -t ed25519 -f "$llave" -N "" -C "${correo_git:-sitio-web}" -q
  chmod 600 "$llave"
  bien "Llave creada"
fi

printf '\n  %sPASO MANUAL:%s copia la línea de abajo y agrégala en la cuenta del cliente,\n' "$amarillo" "$fin"
printf '  en GitHub → Settings → SSH and GPG keys → New SSH key:\n\n'
printf '  %s\n\n' "$(cat "${llave}.pub")"
read -r -p "  Cuando esté agregada, pulsa Enter para verificar... " _

ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -T git@github.com 2>&1 \
  | grep -q "successfully authenticated" \
  && bien "Conexión verificada" \
  || ojo "Aún no verifica. Puede tardar un momento; se comprueba luego con doctor.sh"

# ── Componentes del sitio ────────────────────────────────────────────────────
paso "Componentes del sitio"
if [ -f package.json ]; then
  echo "  Instalando..."
  npm install --silent && bien "Listos" || mal "Falló la instalación de componentes"
else
  ojo "No estamos dentro de la carpeta del sitio"
  echo "  Descarga el sitio y vuelve a ejecutar este paso desde dentro de su carpeta."
fi

# ── Cierre ───────────────────────────────────────────────────────────────────
paso "Listo"
printf '  Verifica el resultado con:\n\n    %sbash doctor.sh%s\n\n' "$verde" "$fin"
printf '  Y para trabajar, dentro de la carpeta del sitio:\n\n    %s%s%s\n\n' "$verde" "${agente:-opencode}" "$fin"

#!/usr/bin/env bash
# doctor — revisa que el asistente del sitio pueda trabajar.
#
# No instala ni cambia nada: solo mira y reporta en lenguaje entendible.
# Se usa el día de la entrega y, sobre todo, un año después cuando algo falle.
#
#   bash doctor.sh
#
# Correrlo DENTRO de la carpeta del sitio.

set -uo pipefail

verde=$'\033[32m'; rojo=$'\033[31m'; amarillo=$'\033[33m'; gris=$'\033[90m'; fin=$'\033[0m'
ok=0; falla=0; aviso=0

titulo() { printf '\n%s── %s ─────────────────────%s\n' "$gris" "$1" "$fin"; }
bien()   { printf '  %s✓%s %s\n' "$verde" "$fin" "$1"; ok=$((ok+1)); }
mal()    { printf '  %s✗%s %s\n' "$rojo" "$fin" "$1"; falla=$((falla+1)); }
ojo()    { printf '  %s!%s %s\n' "$amarillo" "$fin" "$1"; aviso=$((aviso+1)); }
nota()   { printf '    %s%s%s\n' "$gris" "$1" "$fin"; }

printf '\n  Revisión del asistente de tu sitio web\n'

titulo "Programas necesarios"

if command -v git >/dev/null 2>&1; then
  bien "Git instalado ($(git --version | awk '{print $3}'))"
else
  mal "Falta Git"; nota "Sin Git no se pueden guardar ni publicar los cambios."
fi

if command -v node >/dev/null 2>&1; then
  v=$(node --version | tr -d 'v'); mayor=${v%%.*}
  if [ "${mayor:-0}" -ge 20 ] 2>/dev/null; then
    bien "Node instalado (v$v)"
  else
    ojo "Node v$v es una versión vieja"; nota "Conviene actualizar a la 22 o superior."
  fi
else
  mal "Falta Node"; nota "Sin Node no se puede ver la vista previa antes de publicar."
fi

agente=""
for a in opencode claude codex; do
  command -v "$a" >/dev/null 2>&1 && agente="$a" && break
done
if [ -n "$agente" ]; then bien "Asistente instalado ($agente)"
else mal "No se encontró ningún asistente"; nota "Debería estar opencode, claude o codex."; fi

if [ -f tools/requirements.txt ]; then
  if command -v python3 >/dev/null 2>&1; then
    bien "Python instalado ($(python3 --version | awk '{print $2}'))"
  else
    mal "Falta Python"; nota "Este sitio lo necesita para tools/. Se arregla con: bash instalar.sh"
  fi
fi

titulo "Tu sitio"

if [ -d .git ]; then
  bien "La carpeta del sitio está bien preparada"
else
  mal "Esta no parece ser la carpeta de tu sitio"
  nota "Ábrela primero y vuelve a ejecutar esta revisión."
fi

for f in AGENTS.md conocimiento_generado package.json src/datos; do
  [ -e "$f" ] && bien "Encontrado: $f" || mal "Falta: $f"
done

if [ -d node_modules ]; then
  bien "Componentes internos instalados"
else
  ojo "Faltan los componentes internos"
  nota "Se arreglan solos con: npm install"
fi

titulo "Conexión para publicar"

if [ -d .git ]; then
  if git remote get-url origin >/dev/null 2>&1; then
    bien "Conectado al lugar donde se publica"
    if timeout 20 git ls-remote origin >/dev/null 2>&1; then
      bien "La conexión funciona: se puede publicar"
    else
      mal "No se pudo conectar para publicar"
      nota "Puede ser falta de internet, o que las credenciales caducaron."
    fi
  else
    mal "El sitio no está conectado a ningún lugar de publicación"
  fi

  sin_guardar=$(git status --porcelain 2>/dev/null | wc -l)
  if [ "$sin_guardar" -gt 0 ]; then
    ojo "Hay $sin_guardar cambio(s) sin guardar"
    nota "Es normal si estabas trabajando. Pídele al asistente que los guarde o los descarte."
  else
    bien "No hay cambios pendientes"
  fi
fi

titulo "Resultado"

if [ "$falla" -eq 0 ] && [ "$aviso" -eq 0 ]; then
  printf '\n  %s✓ Todo en orden.%s Puedes pedirle cambios a tu asistente.\n\n' "$verde" "$fin"
  exit 0
elif [ "$falla" -eq 0 ]; then
  printf '\n  %s! Funciona, con %s aviso(s).%s Lee las notas de arriba.\n\n' "$amarillo" "$aviso" "$fin"
  exit 0
else
  printf '\n  %s✗ Hay %s problema(s) que impiden trabajar.%s\n' "$rojo" "$falla" "$fin"
  printf '  Escríbele a tu proveedor y pásale esta pantalla completa.\n\n'
  exit 1
fi

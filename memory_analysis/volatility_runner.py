import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional


# Intentar usar el binario/entrypoint "vol" instalado por volatility3
_python_exe = Path(sys.executable)
if sys.platform.startswith("win"):
  _vol_candidate = _python_exe.with_name("vol.exe")
else:
  _vol_candidate = _python_exe.with_name("vol")

if _vol_candidate.exists():
  VOLATILITY_CMD = [str(_vol_candidate)]
else:
  # Fallback: confiar en que "vol" esté en PATH
  VOLATILITY_CMD = ["vol"]


def run_plugin(
  dump_path: Path,
  plugin: str,
  logger,
  extra_args: Optional[List[str]] = None,
) -> Dict[str, Any]:
  """
  Ejecuta un plugin de Volatility 3 y devuelve su salida parseada (JSON ligero).
  Limita el tamaño de los datos para no sobrecargar memoria.
  """
  # Importante: en Volatility 3, las opciones (-r json, -f) deben ir ANTES del nombre del plugin
  cmd = VOLATILITY_CMD + [
    "-f",
    str(dump_path),
    "-r",
    "json",
    plugin,
  ]
  if extra_args:
    cmd.extend(extra_args)

  logger.info(f"Ejecutando plugin Volatility: {plugin}")

  try:
    result = subprocess.run(
      cmd,
      capture_output=True,
      text=True,
      check=False,
    )
  except Exception as exc:
    logger.error(f"Error ejecutando {plugin}: {exc}")
    return {"plugin": plugin, "error": str(exc), "rows": []}

  if result.returncode != 0:
    err = result.stderr.strip() or f"Exit code {result.returncode}"
    logger.error(f"Plugin {plugin} falló: {err}")
    return {"plugin": plugin, "error": err, "rows": []}

  stdout = result.stdout.strip()
  if not stdout:
    logger.warning(f"Plugin {plugin} devolvió salida vacía")
    return {"plugin": plugin, "error": "salida vacía", "rows": []}

  try:
    data = json.loads(stdout)
  except json.JSONDecodeError as exc:
    logger.error(f"No se pudo parsear JSON para {plugin}: {exc}")
    return {"plugin": plugin, "error": "json inválido", "rows": []}

  # Normalizar estructura: algunos renderers ponen data->rows, otros lista directa
  rows = data.get("rows") or data.get("data") or data

  # Limitar a 10k filas máximo para no desbordar memoria en dumps grandes
  if isinstance(rows, list) and len(rows) > 10000:
    logger.warning(f"Plugin {plugin} devolvió {len(rows)} filas, truncando a 10000")
    rows = rows[:10000]

  return {"plugin": plugin, "rows": rows}


def detect_profile(dump_path: Path, logger) -> Dict[str, Any]:
  """
  Usa windows.info para obtener información básica del sistema (perfil/base).
  """
  result = run_plugin(dump_path, "windows.info", logger)
  return result



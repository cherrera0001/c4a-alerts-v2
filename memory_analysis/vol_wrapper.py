"""
Wrapper robusto para ejecutar plugins de Volatility 3.
Maneja correctamente la sintaxis de Volatility 3 y errores de símbolos.
"""
import json
import subprocess
import sys
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


logger = logging.getLogger(__name__)


def _find_volatility_executable() -> List[str]:
    """Detecta el ejecutable de Volatility 3 disponible."""
    # Opción 1: Python module (-m volatility3.cli)
    python_exe = Path(sys.executable)
    if python_exe.exists():
        return [str(python_exe), "-m", "volatility3.cli"]
    
    # Opción 2: vol.exe / vol en PATH
    if sys.platform.startswith("win"):
        vol_candidate = python_exe.with_name("vol.exe")
        if vol_candidate.exists():
            return [str(vol_candidate)]
    
    # Opción 3: vol en PATH
    return ["vol"]


VOLATILITY_CMD = _find_volatility_executable()


def run_volatility(
    plugin_name: str,
    dump_path: str,
    extra_args: Optional[List[str]] = None,
    logger_instance: Optional[logging.Logger] = None,
) -> Tuple[str, str, int]:
    """
    Ejecuta un plugin de Volatility 3 y retorna (stdout, stderr, returncode).
    
    Args:
        plugin_name: Nombre del plugin (ej: "windows.info.Info")
        dump_path: Ruta al dump de memoria
        extra_args: Argumentos adicionales para el plugin
        logger_instance: Logger opcional para logging
    
    Returns:
        Tupla (stdout, stderr, returncode)
    """
    log = logger_instance or logger
    
    # Volatility 3 sintaxis correcta: vol -f DUMP plugin_name [extra_args]
    cmd = VOLATILITY_CMD + [
        "-f",
        str(dump_path),
        plugin_name,
    ]
    
    if extra_args:
        cmd.extend(extra_args)
    
    log.debug(f"Ejecutando: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minutos máximo por plugin
            check=False,
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        log.error(f"Plugin {plugin_name} excedió el tiempo límite (5 minutos)")
        return "", f"Timeout ejecutando {plugin_name}", -1
    except Exception as exc:
        log.error(f"Error ejecutando {plugin_name}: {exc}")
        return "", str(exc), -1


def run_volatility_json(
    plugin_name: str,
    dump_path: str,
    extra_args: Optional[List[str]] = None,
    logger_instance: Optional[logging.Logger] = None,
) -> Dict[str, Any]:
    """
    Ejecuta un plugin de Volatility 3 con salida JSON y retorna dict parseado.
    
    Primero intenta con renderer JSON. Si falla, intenta sin JSON y parsea manualmente.
    
    Retorna dict con keys: plugin, rows, warnings, error
    """
    log = logger_instance or logger
    log.info(f"Ejecutando plugin Volatility: {plugin_name}")
    
    # Intentar primero con JSON renderer
    cmd_with_json = VOLATILITY_CMD + [
        "-f",
        str(dump_path),
        plugin_name,
        "-r",
        "json",
    ]
    
    if extra_args:
        cmd_with_json.extend(extra_args)
    
    try:
        result = subprocess.run(
            cmd_with_json,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )
        
        if result.returncode == 0 and result.stdout.strip():
            # Intentar parsear JSON
            try:
                data = json.loads(result.stdout)
                rows = data.get("rows") or data.get("data") or []
                if isinstance(rows, list):
                    return {
                        "plugin": plugin_name,
                        "rows": rows,
                        "warnings": [],
                        "error": None,
                    }
            except json.JSONDecodeError:
                pass  # Fallar al parseo JSON, intentar sin JSON
        
        # Si JSON falló, ejecutar sin renderer JSON
        stdout, stderr, returncode = run_volatility(
            plugin_name,
            dump_path,
            extra_args,
            log,
        )
        
        if returncode != 0:
            error_msg = stderr.strip() or stdout.strip() or f"Exit code {returncode}"
            
            # Detectar errores de símbolos PDB
            has_symbol_error = (
                "symbol" in error_msg.lower() or
                "pdb" in error_msg.lower() or
                "unable to validate" in error_msg.lower()
            )
            
            log.error(f"Plugin {plugin_name} falló: {error_msg[:500]}")
            
            return {
                "plugin": plugin_name,
                "error": error_msg[:1000],  # Limitar tamaño
                "rows": [],
                "warnings": ["Faltan símbolos PDB del kernel - análisis limitado"] if has_symbol_error else [],
            }
        
        # Parsear salida de texto plano (formato TSV)
        rows = _parse_text_output(stdout, log)
        
        warnings = []
        if "WARNING" in stderr or "warning" in stderr.lower():
            warnings.append("Advertencias durante ejecución del plugin")
        
        return {
            "plugin": plugin_name,
            "rows": rows,
            "warnings": warnings,
            "error": None,
        }
        
    except Exception as exc:
        log.error(f"Error ejecutando {plugin_name}: {exc}")
        return {
            "plugin": plugin_name,
            "error": str(exc),
            "rows": [],
            "warnings": [],
        }


def _parse_text_output(stdout: str, log: logging.Logger) -> List[Dict[str, Any]]:
    """Parsea salida de texto plano de Volatility (formato TSV/tabla)."""
    if not stdout.strip():
        return []
    
    lines = stdout.strip().split("\n")
    if len(lines) < 2:
        return []
    
    # Primera línea suele ser encabezados
    headers = [h.strip() for h in lines[0].split("\t") if h.strip()]
    if not headers:
        # Intentar con espacios múltiples
        headers = [h.strip() for h in lines[0].split() if h.strip()]
    
    rows = []
    for line in lines[1:]:
        if not line.strip():
            continue
        
        values = [v.strip() for v in line.split("\t")]
        if len(values) != len(headers):
            # Intentar con espacios múltiples
            values = [v.strip() for v in line.split() if v.strip()]
        
        if len(values) == len(headers):
            row = dict(zip(headers, values))
            rows.append(row)
        else:
            # Si no coincide, crear dict con índice
            row = {"raw": line.strip()}
            for i, header in enumerate(headers):
                if i < len(values):
                    row[header] = values[i]
            rows.append(row)
    
    return rows


def detect_profile(
    dump_path: str,
    logger_instance: Optional[logging.Logger] = None,
) -> Dict[str, Any]:
    """
    Detecta el perfil/base del sistema usando windows.info.Info.
    
    Retorna dict con información del sistema o error si falla.
    """
    log = logger_instance or logger
    log.info("Detectando perfil/base del sistema...")
    result = run_volatility_json("windows.info.Info", dump_path, None, log)
    return result


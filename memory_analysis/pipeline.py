"""
Pipeline principal de análisis de memoria.
Orquesta la ejecución de plugins de Volatility, parsing y análisis.
"""
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from .logging_utils import setup_logger
from .vol_wrapper import run_volatility_json, detect_profile
from .parsers import (
    parse_pslist,
    parse_dlllist,
    parse_driverscan,
    parse_apihooks,
    parse_malfind,
    parse_netscan,
    parse_registry_userassist,
    parse_svclist,
    parse_cmdline,
    parse_callbacks,
    parse_ldrmodules,
)
from .analysis_engine import analyze_memory_artifacts
from .reporting import write_json_report, build_markdown_report


# Lista de plugins a ejecutar (nombres correctos de Volatility 3)
PLUGIN_LIST = [
    "windows.pslist.PsList",
    "windows.psscan.PsScan",
    "windows.driverscan.DriverScan",
    "windows.dlllist.DllList",
    "windows.malfind.Malfind",
    "windows.malware.unhooked_system_calls.UnhookedSystemCalls",
    "windows.handles.Handles",
    "windows.cmdline.CmdLine",
    "windows.netscan.NetScan",
    "windows.netstat.NetStat",
    "windows.registry.userassist.UserAssist",
    "windows.callbacks.Callbacks",
    "windows.ldrmodules.LdrModules",
    "windows.svclist.SvcList",
]


class MemoryAnalysisPipeline:
    def __init__(self, dump_path: Path, output_root: Path) -> None:
        self.dump_path = dump_path
        self.output_root = output_root
        self.raw_output_dir = output_root / "raw"
        self.report_output_dir = output_root
        self.logger = setup_logger(output_root)

    def run(self) -> Dict[str, Any]:
        """Ejecuta el pipeline completo de análisis."""
        if not self.dump_path.exists():
            raise FileNotFoundError(f"No se encontró el dump de memoria: {self.dump_path}")

        self.raw_output_dir.mkdir(parents=True, exist_ok=True)
        self.report_output_dir.mkdir(parents=True, exist_ok=True)

        self.logger.info(f"Iniciando análisis de memoria sobre: {self.dump_path}")

        # 1. Detectar perfil/base
        info_result = detect_profile(str(self.dump_path), self.logger)
        
        # Verificar si hay error de símbolos
        symbol_error = False
        if info_result.get("error"):
            error_msg = info_result["error"]
            if "symbol" in error_msg.lower() or "pdb" in error_msg.lower():
                symbol_error = True
                self.logger.warning(
                    "ADVERTENCIA: Faltan símbolos PDB del kernel. "
                    "El análisis será limitado. "
                    "Asegúrate de tener acceso a internet o símbolos offline configurados."
                )

        # 2. Ejecutar plugins
        plugin_results: Dict[str, Any] = {"windows.info.Info": info_result}

        for plugin in PLUGIN_LIST:
            extra: List[str] = []
            
            # Plugins que requieren argumentos especiales
            if "windows.registry.printkey" in plugin:
                # Este plugin requiere configuración especial, lo omitimos por ahora
                self.logger.info(f"Omitiendo plugin {plugin} (requiere configuración especial)")
                continue
            
            self.logger.info(f"Ejecutando plugin: {plugin}")
            res = run_volatility_json(plugin, str(self.dump_path), extra_args=extra, logger_instance=self.logger)
            plugin_results[plugin] = res
            
            # Si hay warning sobre símbolos, loguearlo
            if res.get("warnings"):
                for warning in res["warnings"]:
                    self.logger.warning(f"Plugin {plugin}: {warning}")

        # Resumen de estado de plugins
        plugin_status: Dict[str, Any] = {}
        successful_plugins = 0
        for name, result in plugin_results.items():
            err = result.get("error")
            rows = result.get("rows") or []
            ok = err is None and bool(rows)
            if ok:
                successful_plugins += 1
            plugin_status[name] = {
                "ok": ok,
                "error": err[:500] if err else None,  # Limitar tamaño
                "row_count": len(rows) if isinstance(rows, list) else 0,
                "warnings": result.get("warnings", []),
            }

        if successful_plugins == 0:
            analysis_status = "failed_no_valid_plugins"
            self.logger.error("ERROR: Ningún plugin se ejecutó correctamente. Revisa logs.")
        elif successful_plugins < len(plugin_results) * 0.5:  # Menos del 50%
            analysis_status = "partial"
            self.logger.warning(f"Solo {successful_plugins}/{len(plugin_results)} plugins exitosos")
        else:
            analysis_status = "ok"

        # 3. Parsear resultados relevantes
        self.logger.info("Parseando resultados de plugins...")
        
        processes = parse_pslist(plugin_results.get("windows.pslist.PsList", {}))
        psscan_processes = parse_pslist(plugin_results.get("windows.psscan.PsScan", {}))
        dlls = parse_dlllist(plugin_results.get("windows.dlllist.DllList", {}))
        drivers = parse_driverscan(plugin_results.get("windows.driverscan.DriverScan", {}))
        
        # Hooks: intentar desde diferentes plugins
        hooks = parse_apihooks(plugin_results.get("windows.malware.unhooked_system_calls.UnhookedSystemCalls", {}))
        callbacks = parse_callbacks(plugin_results.get("windows.callbacks.Callbacks", {}))
        hooks.extend(callbacks)  # Combinar hooks y callbacks
        
        malfind_regions = parse_malfind(plugin_results.get("windows.malfind.Malfind", {}))
        
        # Red: netscan y netstat
        netscan_conns = parse_netscan(plugin_results.get("windows.netscan.NetScan", {}))
        # parse_netstat similar a netscan, por ahora usamos solo netscan
        netconns = netscan_conns
        
        reg_keys = parse_registry_userassist(plugin_results.get("windows.registry.userassist.UserAssist", {}))
        services = parse_svclist(plugin_results.get("windows.svclist.SvcList", {}))
        cmdlines = parse_cmdline(plugin_results.get("windows.cmdline.CmdLine", {}))
        ldrmodules = parse_ldrmodules(plugin_results.get("windows.ldrmodules.LdrModules", {}))

        # 4. Análisis de artefactos usando el motor de análisis
        self.logger.info("Ejecutando motor de análisis de artefactos...")
        
        artifacts = {
            "processes": processes,
            "psscan_processes": psscan_processes,
            "dlls": dlls,
            "drivers": drivers,
            "hooks": hooks,
            "malfind_regions": malfind_regions,
            "netconns": netconns,
            "services": services,
            "cmdlines": cmdlines,
            "ldrmodules": ldrmodules,
        }
        
        analysis = analyze_memory_artifacts(artifacts)

        # 5. Construir resumen final
        analysis_time = datetime.utcnow().isoformat() + "Z"

        summary: Dict[str, Any] = {
            "meta": {
                "dump_path": str(self.dump_path),
                "dump_name": self.dump_path.name,
                "analysis_time": analysis_time,
                "profile_info": {
                    "plugin": "windows.info.Info",
                    "rows": info_result.get("rows", []),
                    "error": info_result.get("error"),
                    "warnings": info_result.get("warnings", []),
                },
                "analysis_status": analysis_status,
                "plugin_status": plugin_status,
                "symbol_error": symbol_error,
            },
            "iocs": [self._ioc_to_dict(ioc) for ioc in analysis["iocs"]],
            "sections": {
                "suspicious_processes": [self._process_to_dict(item["process"]) for item in analysis["suspicious_processes"]],
                "suspicious_dlls": [self._dll_to_dict(item["dll"]) for item in analysis["suspicious_dlls"]],
                "suspicious_drivers": [self._driver_to_dict(item["driver"]) for item in analysis["suspicious_drivers"]],
                "suspicious_hooks": [self._hook_to_dict(item["hook"]) for item in analysis["suspicious_hooks"]],
                "suspicious_injections": analysis["suspicious_injections"],
                "suspicious_network": [self._netconn_to_dict(item["connection"]) for item in analysis["suspicious_network"]],
                "suspicious_services": [self._service_to_dict(item["service"]) for item in analysis["suspicious_services"]],
            },
            "special_analysis": {
                "textinputhost": [self._special_to_dict(item) for item in analysis["special_analysis"]["textinputhost"]],
                "ctfmon": [self._special_to_dict(item) for item in analysis["special_analysis"]["ctfmon"]],
                "razer": [self._special_to_dict(item) for item in analysis["special_analysis"]["razer"]],
                "asus": [self._special_to_dict(item) for item in analysis["special_analysis"]["asus"]],
                "onedrive": [self._special_to_dict(item) for item in analysis["special_analysis"]["onedrive"]],
            },
            "mitre_ttps": analysis["mitre_ttps"],
            "summary": analysis["summary"],
        }

        # 6. Guardar reportes
        json_path = self.report_output_dir / "memory_report.json"
        md_path = self.report_output_dir / "memory_report.md"

        write_json_report(json_path, summary)
        md_text = build_markdown_report(summary)
        md_path.write_text(md_text, encoding="utf-8")

        self.logger.info(f"Reporte JSON escrito en: {json_path}")
        self.logger.info(f"Reporte Markdown escrito en: {md_path}")
        self.logger.info(f"Total de IOCs detectados: {len(analysis['iocs'])}")

        return {
            "summary": summary,
            "reports": {
                "json": str(json_path),
                "markdown": str(md_path),
            },
        }

    def _ioc_to_dict(self, ioc) -> Dict[str, Any]:
        return {
            "type": ioc.type,
            "description": ioc.description,
            "data": ioc.data,
            "mitre_ids": ioc.mitre_ids,
        }

    def _process_to_dict(self, proc) -> Dict[str, Any]:
        return {
            "pid": proc.pid,
            "ppid": proc.ppid,
            "name": proc.name,
            "path": proc.path,
            "create_time": proc.create_time,
            "exit_time": proc.exit_time,
            "suspicious_flags": proc.suspicious_flags,
        }

    def _dll_to_dict(self, dll) -> Dict[str, Any]:
        return {
            "process_pid": dll.process_pid,
            "base_name": dll.base_name,
            "full_path": dll.full_path,
            "suspicious_flags": dll.suspicious_flags,
        }

    def _driver_to_dict(self, driver) -> Dict[str, Any]:
        return {
            "name": driver.name,
            "path": driver.path,
            "created": driver.created,
            "suspicious_flags": driver.suspicious_flags,
        }

    def _hook_to_dict(self, hook) -> Dict[str, Any]:
        return {
            "process_pid": hook.process_pid,
            "function": hook.function,
            "module": hook.module,
            "target": hook.target,
            "suspicious": hook.suspicious,
        }

    def _netconn_to_dict(self, conn) -> Dict[str, Any]:
        return {
            "proto": conn.proto,
            "local_addr": conn.local_addr,
            "local_port": conn.local_port,
            "remote_addr": conn.remote_addr,
            "remote_port": conn.remote_port,
            "process_pid": conn.process_pid,
            "suspicious": conn.suspicious,
        }

    def _service_to_dict(self, svc) -> Dict[str, Any]:
        return {
            "name": svc.name,
            "display_name": svc.display_name,
            "path": svc.path,
            "service_type": svc.service_type,
            "state": svc.state,
            "pid": svc.pid,
            "suspicious_flags": svc.suspicious_flags,
        }

    def _special_to_dict(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Convierte item de análisis especial a dict."""
        result = {}
        if "process" in item:
            result["process"] = self._process_to_dict(item["process"])
        if "dll_count" in item:
            result["dll_count"] = item["dll_count"]
        if "hooks_count" in item:
            result["hooks_count"] = item["hooks_count"]
        if "suspicious_hooks" in item:
            result["suspicious_hooks"] = [self._hook_to_dict(h) for h in item["suspicious_hooks"]]
        if "path" in item:
            result["path"] = item["path"]
        if "concerns" in item:
            result["concerns"] = item["concerns"]
        return result

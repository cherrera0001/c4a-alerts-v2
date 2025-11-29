from pathlib import Path
from typing import Any, Dict, List
import json


MITRE_MAPPING = {
  "T1056.001": "Keylogging",
  "T1056.004": "Credential API Hooking",
  "T1055": "Process Injection",
  "T1014": "Rootkit / Driver tampering",
  "T1027": "Obfuscation",
  "T1547": "Persistence via Registry",
  "T1543": "Persistence via Services",
}


def write_json_report(path: Path, data: Dict[str, Any]) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def build_markdown_report(summary: Dict[str, Any]) -> str:
  meta = summary.get("meta", {})
  iocs = summary.get("iocs", [])
  sections = summary.get("sections", {})
  plugin_status = meta.get("plugin_status", {})
  analysis_status = meta.get("analysis_status", "unknown")

  lines: List[str] = []
  lines.append(f"## Memory Analysis Report - {meta.get('dump_name', 'N/A')}")
  lines.append("")
  lines.append(f"- **Dump path**: `{meta.get('dump_path', '')}`")
  lines.append(f"- **Analysis time (UTC)**: {meta.get('analysis_time', '')}")
  lines.append(f"- **Analysis status**: `{analysis_status}`")
  lines.append("")

  # Si no hubo plugins válidos, dejarlo MUY explícito
  if analysis_status == "failed_no_valid_plugins":
    lines.append("> ATENCIÓN: Ningún plugin de Volatility pudo ejecutarse con éxito.")
    lines.append("> Es muy probable que falten símbolos del kernel (PDB) o acceso a internet/símbolos offline.")
    lines.append("")

  lines.append("### Resumen Ejecutivo")
  lines.append("")
  
  summary_info = summary.get("summary", {})
  confidence = summary_info.get("confidence_level", "desconocido")
  
  lines.append(f"- **Total de IOCs detectados**: {len(iocs)}")
  lines.append(f"- **Nivel de confianza**: {confidence}")
  lines.append("")
  lines.append("**Hallazgos principales:**")
  lines.append(f"- Procesos sospechosos: **{len(sections.get('suspicious_processes', []))}**")
  lines.append(f"- Inyecciones de memoria: **{len(sections.get('suspicious_injections', []))}**")
  lines.append(f"- Hooks de API sospechosos: **{len(sections.get('suspicious_hooks', []))}**")
  lines.append(f"- Conexiones de red sospechosas: **{len(sections.get('suspicious_network', []))}**")
  lines.append(f"- Drivers anómalos: **{len(sections.get('suspicious_drivers', []))}**")
  lines.append(f"- DLLs sospechosas: **{len(sections.get('suspicious_dlls', []))}**")
  lines.append(f"- Servicios anómalos: **{len(sections.get('suspicious_services', []))}**")
  lines.append("")

  # Resumen de estado de plugins
  if plugin_status:
    ok_count = sum(1 for s in plugin_status.values() if s.get("ok"))
    total = len(plugin_status)
    lines.append("### Estado de plugins de Volatility")
    lines.append(f"- Plugins OK: **{ok_count} / {total}**")
    lines.append("")
    for name, st in plugin_status.items():
      state = "OK" if st.get("ok") else "ERROR"
      err = st.get("error")
      rc = st.get("row_count", 0)
      if state == "OK":
        lines.append(f"- `{name}`: {state} (filas={rc})")
      else:
        lines.append(f"- `{name}`: {state} - {err}")
    lines.append("")

  lines.append("### IOCs detectados")
  lines.append("")
  for ioc in iocs:
    mitre_ids = ioc.get("mitre_ids") or []
    mitre_text = ", ".join(
      f"{m} ({MITRE_MAPPING.get(m, '')})" for m in mitre_ids
    ) if mitre_ids else "N/A"
    lines.append(f"- **{ioc.get('type', 'ioc')}**: {ioc.get('description', '')}")
    lines.append(f"  - MITRE: {mitre_text}")
  lines.append("")

  lines.append("### Procesos sospechosos")
  for p in sections.get("suspicious_processes", []):
    lines.append(f"- PID {p.get('pid')} - {p.get('name')} ({p.get('path')})")
  lines.append("")

  lines.append("### Hooks sospechosos")
  for h in sections.get("suspicious_hooks", []):
    lines.append(f"- PID {h.get('process_pid')} - {h.get('function')} -> {h.get('target')}")
  lines.append("")

  lines.append("### Inyecciones en memoria (malfind)")
  for inj in sections.get("suspicious_injections", []):
    lines.append(
      f"- {inj.get('process')} (PID {inj.get('pid')}), protection={inj.get('protection')}, tag={inj.get('tag')}"
    )
  lines.append("")

  lines.append("### Drivers anómalos")
  for d in sections.get("suspicious_drivers", []):
    lines.append(f"- {d.get('name')} - {d.get('path')}")
  lines.append("")

  lines.append("### DLLs en rutas no estándar")
  for d in sections.get("suspicious_dlls", []):
    lines.append(f"- PID {d.get('process_pid')} - {d.get('base_name')} - {d.get('full_path')}")
  lines.append("")

  lines.append("### Conexiones de red sospechosas")
  for c in sections.get("suspicious_network", []):
    lines.append(
      f"- PID {c.get('process_pid')} - {c.get('proto')} "
      f"{c.get('local_addr')}:{c.get('local_port')} -> "
      f"{c.get('remote_addr')}:{c.get('remote_port')}"
    )
  lines.append("")

  # Servicios sospechosos
  suspicious_services = sections.get("suspicious_services", [])
  if suspicious_services:
    lines.append("### Servicios anómalos")
    for s in suspicious_services:
      lines.append(f"- {s.get('name')} (PID {s.get('pid')}) - {s.get('path')}")
    lines.append("")

  # Análisis especial
  special = summary.get("special_analysis", {})
  if special:
    lines.append("### Análisis de Procesos Específicos")
    lines.append("")
    
    if special.get("textinputhost"):
      lines.append("#### TextInputHost.exe")
      for item in special["textinputhost"]:
        proc = item.get("process", {})
        lines.append(f"- PID {proc.get('pid')} - {proc.get('name')}")
        lines.append(f"  - DLLs cargadas: {item.get('dll_count', 0)}")
        lines.append(f"  - Hooks detectados: {item.get('hooks_count', 0)}")
        concerns = item.get("concerns", [])
        if concerns:
          lines.append(f"  - Preocupaciones: {', '.join(concerns)}")
      lines.append("")
    
    if special.get("ctfmon"):
      lines.append("#### ctfmon.exe")
      for item in special["ctfmon"]:
        proc = item.get("process", {})
        lines.append(f"- PID {proc.get('pid')} - {proc.get('name')}")
        lines.append(f"  - DLLs cargadas: {item.get('dll_count', 0)}")
        lines.append(f"  - Hooks detectados: {item.get('hooks_count', 0)}")
      lines.append("")
    
    if special.get("razer"):
      lines.append("#### Procesos Razer")
      for item in special["razer"]:
        proc = item.get("process", {})
        lines.append(f"- {proc.get('name')} (PID {proc.get('pid')}) - {proc.get('path')}")
      lines.append("")
    
    if special.get("asus"):
      lines.append("#### Procesos ASUS")
      for item in special["asus"]:
        proc = item.get("process", {})
        lines.append(f"- {proc.get('name')} (PID {proc.get('pid')}) - {proc.get('path')}")
      lines.append("")
    
    if special.get("onedrive"):
      lines.append("#### OneDrive")
      for item in special["onedrive"]:
        proc = item.get("process", {})
        lines.append(f"- {proc.get('name')} (PID {proc.get('pid')}) - {proc.get('path')}")
      lines.append("")

  # TTPs MITRE
  mitre_ttps = summary.get("mitre_ttps", {})
  if mitre_ttps:
    lines.append("### Mapeo de TTPs MITRE ATT&CK")
    lines.append("")
    for ttp_id, ioc_types in mitre_ttps.items():
      ttp_name = MITRE_MAPPING.get(ttp_id, "Unknown")
      lines.append(f"- **{ttp_id}** ({ttp_name}): {', '.join(set(ioc_types))}")
    lines.append("")

  # Resumen de confianza
  summary_info = summary.get("summary", {})
  if summary_info:
    confidence = summary_info.get("confidence_level", "desconocido")
    lines.append("### Nivel de Confianza del Análisis")
    lines.append(f"- **{confidence}**")
    lines.append("")

  return "\n".join(lines)



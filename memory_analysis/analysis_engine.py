"""
Motor de análisis que detecta indicadores sospechosos en artefactos de memoria.
Correlaciona procesos, DLLs, drivers, hooks, etc. y marca hallazgos relevantes.
"""
import logging
from typing import Dict, List, Any, Set, Optional
from .models import Process, DLL, Driver, Hook, NetConn, RegistryKey, Service, IOC


logger = logging.getLogger(__name__)


# Constantes para detección
LEGITIMATE_PATHS = {
    r"c:\windows\",
    r"c:\program files\",
    r"c:\program files (x86)\",
    r"c:\programdata\",
}

INPUT_PROCESSES = {
    "textinputhost.exe",
    "ctfmon.exe",
    "osk.exe",
}

THIRD_PARTY_HARDWARE = {
    "razer": ["razer", "synapse", "chroma"],
    "asus": ["asus", "armoury", "rog"],
    "onedrive": ["onedrive.exe", "onedrivesetup.exe"],
}

SUSPICIOUS_PORTS = {1337, 4444, 5555, 8082, 8443, 31337}

KEYLOGGING_APIS = [
    "GetAsyncKeyState",
    "SetWindowsHookEx",
    "NtUserGetRawInputData",
    "NtReadFile",
    "NtUserSendInput",
    "ReadFile",
]

CREDENTIAL_APIS = [
    "CredRead",
    "CredWrite",
    "CredEnumerate",
    "LsaRetrievePrivateData",
]


def analyze_memory_artifacts(artifacts: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analiza todos los artefactos extraídos y genera hallazgos.
    
    Args:
        artifacts: Dict con keys: processes, dlls, drivers, hooks, netconns, 
                   services, psscan_processes (opcional), malfind_regions, cmdlines
    
    Returns:
        Dict con análisis completo: iocs, suspicious_items, mitre_ttps, etc.
    """
    processes: List[Process] = artifacts.get("processes", [])
    dlls: List[DLL] = artifacts.get("dlls", [])
    drivers: List[Driver] = artifacts.get("drivers", [])
    hooks: List[Hook] = artifacts.get("hooks", [])
    netconns: List[NetConn] = artifacts.get("netconns", [])
    services: List[Service] = artifacts.get("services", [])
    psscan_processes: List[Process] = artifacts.get("psscan_processes", [])
    malfind_regions: List[Dict[str, Any]] = artifacts.get("malfind_regions", [])
    cmdlines: List[Dict[str, Any]] = artifacts.get("cmdlines", [])
    
    logger.info("Iniciando análisis de artefactos...")
    
    # Mapear procesos por PID
    process_map: Dict[int, Process] = {p.pid: p for p in processes}
    
    # Análisis 1: Procesos sospechosos
    suspicious_processes = _analyze_processes(
        processes, psscan_processes, cmdlines, process_map
    )
    
    # Análisis 2: DLLs sospechosas (no en disco)
    suspicious_dlls = _analyze_dlls(dlls, process_map)
    
    # Análisis 3: Drivers anómalos
    suspicious_drivers = _analyze_drivers(drivers)
    
    # Análisis 4: Hooks de API
    suspicious_hooks = _analyze_hooks(hooks, process_map)
    
    # Análisis 5: Inyecciones de memoria
    suspicious_injections = _analyze_malfind(malfind_regions, process_map)
    
    # Análisis 6: Conexiones de red
    suspicious_network = _analyze_network(netconns, process_map)
    
    # Análisis 7: Servicios anómalos
    suspicious_services = _analyze_services(services, process_map)
    
    # Análisis 8: Procesos especiales (TextInputHost, Razer, ASUS, OneDrive)
    special_analysis = _analyze_special_processes(
        processes, dlls, hooks, process_map
    )
    
    # Construir IOCs
    iocs = _build_iocs(
        suspicious_processes,
        suspicious_dlls,
        suspicious_drivers,
        suspicious_hooks,
        suspicious_injections,
        suspicious_network,
        suspicious_services,
        special_analysis,
    )
    
    # Mapear TTPs MITRE
    mitre_ttps = _map_mitre_ttps(iocs)
    
    return {
        "iocs": iocs,
        "suspicious_processes": suspicious_processes,
        "suspicious_dlls": suspicious_dlls,
        "suspicious_drivers": suspicious_drivers,
        "suspicious_hooks": suspicious_hooks,
        "suspicious_injections": suspicious_injections,
        "suspicious_network": suspicious_network,
        "suspicious_services": suspicious_services,
        "special_analysis": special_analysis,
        "mitre_ttps": mitre_ttps,
        "summary": {
            "total_iocs": len(iocs),
            "confidence_level": _calculate_confidence(iocs),
        },
    }


def _analyze_processes(
    processes: List[Process],
    psscan_processes: List[Process],
    cmdlines: List[Dict[str, Any]],
    process_map: Dict[int, Process],
) -> List[Dict[str, Any]]:
    """Detecta procesos sospechosos."""
    suspicious = []
    
    # Mapear cmdlines por PID
    cmdline_map = {c.get("pid"): c.get("cmdline", "") for c in cmdlines}
    
    # Comparar pslist vs psscan (procesos ocultos - T1014)
    pslist_pids = {p.pid for p in processes}
    psscan_pids = {p.pid for p in psscan_processes}
    hidden_pids = psscan_pids - pslist_pids
    
    for pid in hidden_pids:
        proc = next((p for p in psscan_processes if p.pid == pid), None)
        if proc:
            proc.suspicious_flags.append("hidden_process")
            suspicious.append({
                "process": proc,
                "reason": "Proceso oculto (visible en psscan pero no en pslist)",
                "mitre_ttps": ["T1014"],
            })
    
    # Procesos fuera de rutas legítimas
    for proc in processes:
        reasons = []
        path_lower = (proc.path or "").lower()
        
        if not path_lower:
            proc.suspicious_flags.append("no_path")
            reasons.append("Sin ruta de ejecutable")
        elif not any(path_lower.startswith(leg) for leg in LEGITIMATE_PATHS):
            proc.suspicious_flags.append("unusual_path")
            reasons.append(f"Ruta fuera de directorios estándar: {proc.path}")
        
        # Procesos de input
        if proc.name.lower() in INPUT_PROCESSES:
            proc.suspicious_flags.append("input_process")
            reasons.append("Proceso relacionado con input de teclado")
        
        # Cmdline sospechosa
        cmdline = cmdline_map.get(proc.pid, "")
        if cmdline and any(x in cmdline.lower() for x in ["-enc", "base64", "bypass", "-nop"]):
            proc.suspicious_flags.append("suspicious_cmdline")
            reasons.append(f"Cmdline sospechosa: {cmdline[:100]}")
        
        if reasons or proc.suspicious_flags:
            suspicious.append({
                "process": proc,
                "reason": "; ".join(reasons) if reasons else "Marcado como sospechoso",
                "mitre_ttps": [],
            })
    
    return suspicious


def _analyze_dlls(
    dlls: List[DLL],
    process_map: Dict[int, Process],
) -> List[Dict[str, Any]]:
    """Detecta DLLs sospechosas (no en disco, rutas raras)."""
    suspicious = []
    
    for dll in dlls:
        reasons = []
        path_lower = (dll.full_path or "").lower()
        
        # DLL sin ruta en disco
        if not path_lower or path_lower.startswith("\\"):
            dll.suspicious_flags.append("memory_only")
            reasons.append("DLL solo en memoria, sin archivo en disco")
        
        # DLL en ruta sospechosa
        if path_lower and any(x in path_lower for x in ["\\temp\\", "\\appdata\\", "\\users\\"]):
            dll.suspicious_flags.append("unusual_path")
            reasons.append(f"Ruta no estándar: {dll.full_path}")
        
        # DLL no firmada (si tenemos esa info)
        if hasattr(dll, "signed") and not getattr(dll, "signed", True):
            dll.suspicious_flags.append("unsigned")
            reasons.append("DLL no firmada")
        
        if reasons or dll.suspicious_flags:
            proc = process_map.get(dll.process_pid)
            suspicious.append({
                "dll": dll,
                "process": proc,
                "reason": "; ".join(reasons),
                "mitre_ttps": ["T1055"],
            })
    
    return suspicious


def _analyze_drivers(drivers: List[Driver]) -> List[Dict[str, Any]]:
    """Detecta drivers sospechosos."""
    suspicious = []
    
    for driver in drivers:
        reasons = []
        path_lower = (driver.path or "").lower()
        name_lower = (driver.name or "").lower()
        
        # Driver sin firma
        if hasattr(driver, "signed") and not getattr(driver, "signed", True):
            driver.suspicious_flags.append("unsigned")
            reasons.append("Driver sin firma digital")
        
        # Driver en ruta sospechosa
        if path_lower and any(x in path_lower for x in ["\\temp\\", "\\users\\"]):
            driver.suspicious_flags.append("unusual_path")
            reasons.append(f"Ruta no estándar: {driver.path}")
        
        # Typosquatting
        if "scvhost" in name_lower or "lsas" in name_lower:
            driver.suspicious_flags.append("typosquatting")
            reasons.append("Posible imitación de driver legítimo")
        
        if reasons or driver.suspicious_flags:
            suspicious.append({
                "driver": driver,
                "reason": "; ".join(reasons),
                "mitre_ttps": ["T1014"],
            })
    
    return suspicious


def _analyze_hooks(
    hooks: List[Hook],
    process_map: Dict[int, Process],
) -> List[Dict[str, Any]]:
    """Detecta hooks de API sospechosos."""
    suspicious = []
    
    for hook in hooks:
        reasons = []
        func_lower = (hook.function or "").lower()
        
        # Keylogging APIs
        if any(api.lower() in func_lower for api in KEYLOGGING_APIS):
            hook.suspicious = True
            reasons.append(f"Hook sobre API de teclado: {hook.function}")
        
        # Credential APIs
        if any(api.lower() in func_lower for api in CREDENTIAL_APIS):
            hook.suspicious = True
            reasons.append(f"Hook sobre API de credenciales: {hook.function}")
        
        if hook.suspicious or reasons:
            proc = process_map.get(hook.process_pid) if hook.process_pid else None
            mitre_ttps = []
            if any(api.lower() in func_lower for api in KEYLOGGING_APIS):
                mitre_ttps.append("T1056.001")
            if any(api.lower() in func_lower for api in CREDENTIAL_APIS):
                mitre_ttps.append("T1056.004")
            
            suspicious.append({
                "hook": hook,
                "process": proc,
                "reason": "; ".join(reasons) if reasons else "Hook sospechoso",
                "mitre_ttps": mitre_ttps,
            })
    
    return suspicious


def _analyze_malfind(
    regions: List[Dict[str, Any]],
    process_map: Dict[int, Process],
) -> List[Dict[str, Any]]:
    """Analiza regiones de memoria ejecutables sospechosas."""
    suspicious = []
    
    for region in regions:
        pid = region.get("pid")
        protection = (region.get("protection") or "").upper()
        
        # RWX es sospechoso
        if "RWX" in protection or ("READWRITE" in protection and "EXECUTE" in protection):
            proc = process_map.get(pid) if pid else None
            suspicious.append({
                "region": region,
                "process": proc,
                "reason": f"Región ejecutable sospechosa: {protection}",
                "mitre_ttps": ["T1055"],
            })
    
    return suspicious


def _analyze_network(
    netconns: List[NetConn],
    process_map: Dict[int, Process],
) -> List[Dict[str, Any]]:
    """Detecta conexiones de red sospechosas."""
    suspicious = []
    
    for conn in netconns:
        reasons = []
        
        # Puertos sospechosos
        if conn.local_port in SUSPICIOUS_PORTS or conn.remote_port in SUSPICIOUS_PORTS:
            conn.suspicious = True
            reasons.append(f"Puerto sospechoso: {conn.local_port}:{conn.remote_port}")
        
        # Conexiones salientes a IPs privadas/sospechosas
        if conn.remote_addr and conn.remote_addr.startswith("10."):
            conn.suspicious = True
            reasons.append("Conexión saliente a red privada")
        
        if conn.suspicious or reasons:
            proc = process_map.get(conn.process_pid) if conn.process_pid else None
            suspicious.append({
                "connection": conn,
                "process": proc,
                "reason": "; ".join(reasons),
                "mitre_ttps": [],
            })
    
    return suspicious


def _analyze_services(
    services: List[Service],
    process_map: Dict[int, Process],
) -> List[Dict[str, Any]]:
    """Detecta servicios anómalos."""
    suspicious = []
    
    for svc in services:
        reasons = []
        path_lower = (svc.path or "").lower()
        
        # Servicio con binario en ruta rara
        if path_lower and not any(path_lower.startswith(leg) for leg in LEGITIMATE_PATHS):
            svc.suspicious_flags.append("unusual_path")
            reasons.append(f"Binario de servicio en ruta no estándar: {svc.path}")
        
        if reasons or svc.suspicious_flags:
            proc = process_map.get(svc.pid) if svc.pid else None
            suspicious.append({
                "service": svc,
                "process": proc,
                "reason": "; ".join(reasons),
                "mitre_ttps": ["T1543"],
            })
    
    return suspicious


def _analyze_special_processes(
    processes: List[Process],
    dlls: List[DLL],
    hooks: List[Hook],
    process_map: Dict[int, Process],
) -> Dict[str, Any]:
    """Análisis especial para TextInputHost, ctfmon, Razer, ASUS, OneDrive."""
    analysis = {
        "textinputhost": [],
        "ctfmon": [],
        "razer": [],
        "asus": [],
        "onedrive": [],
    }
    
    # TextInputHost.exe
    for proc in processes:
        if proc.name.lower() == "textinputhost.exe":
            proc_dlls = [d for d in dlls if d.process_pid == proc.pid]
            proc_hooks = [h for h in hooks if h.process_pid == proc.pid]
            
            analysis["textinputhost"].append({
                "process": proc,
                "dll_count": len(proc_dlls),
                "hooks_count": len(proc_hooks),
                "suspicious_hooks": [h for h in proc_hooks if h.suspicious],
                "concerns": [] if not proc_hooks else ["Hooks detectados en proceso de input"],
            })
    
    # ctfmon.exe
    for proc in processes:
        if proc.name.lower() == "ctfmon.exe":
            proc_dlls = [d for d in dlls if d.process_pid == proc.pid]
            proc_hooks = [h for h in hooks if h.process_pid == proc.pid]
            
            analysis["ctfmon"].append({
                "process": proc,
                "dll_count": len(proc_dlls),
                "hooks_count": len(proc_hooks),
                "suspicious_hooks": [h for h in proc_hooks if h.suspicious],
            })
    
    # Razer
    for proc in processes:
        name_lower = proc.name.lower()
        if any(razer_term in name_lower for razer_term in THIRD_PARTY_HARDWARE["razer"]):
            analysis["razer"].append({
                "process": proc,
                "path": proc.path,
                "concerns": [],
            })
    
    # ASUS
    for proc in processes:
        name_lower = proc.name.lower()
        if any(asus_term in name_lower for asus_term in THIRD_PARTY_HARDWARE["asus"]):
            analysis["asus"].append({
                "process": proc,
                "path": proc.path,
                "concerns": [],
            })
    
    # OneDrive
    for proc in processes:
        name_lower = proc.name.lower()
        if any(od_term in name_lower for od_term in THIRD_PARTY_HARDWARE["onedrive"]):
            analysis["onedrive"].append({
                "process": proc,
                "path": proc.path,
                "concerns": [],
            })
    
    return analysis


def _build_iocs(
    suspicious_processes: List[Dict[str, Any]],
    suspicious_dlls: List[Dict[str, Any]],
    suspicious_drivers: List[Dict[str, Any]],
    suspicious_hooks: List[Dict[str, Any]],
    suspicious_injections: List[Dict[str, Any]],
    suspicious_network: List[Dict[str, Any]],
    suspicious_services: List[Dict[str, Any]],
    special_analysis: Dict[str, Any],
) -> List[IOC]:
    """Construye lista consolidada de IOCs."""
    iocs = []
    
    for item in suspicious_processes:
        proc = item["process"]
        iocs.append(IOC(
            type="suspicious_process",
            description=item["reason"],
            data={
                "pid": proc.pid,
                "name": proc.name,
                "path": proc.path,
                "flags": proc.suspicious_flags,
            },
            mitre_ids=item.get("mitre_ttps", []),
        ))
    
    for item in suspicious_hooks:
        hook = item["hook"]
        iocs.append(IOC(
            type="api_hooking",
            description=f"Hook sospechoso: {hook.function}",
            data={
                "function": hook.function,
                "module": hook.module,
                "target": hook.target,
                "pid": hook.process_pid,
            },
            mitre_ids=item.get("mitre_ttps", []),
        ))
    
    for item in suspicious_injections:
        region = item["region"]
        iocs.append(IOC(
            type="memory_injection",
            description=item["reason"],
            data=region,
            mitre_ids=item.get("mitre_ttps", []),
        ))
    
    for item in suspicious_drivers:
        driver = item["driver"]
        iocs.append(IOC(
            type="driver_anomaly",
            description=item["reason"],
            data={
                "name": driver.name,
                "path": driver.path,
                "flags": driver.suspicious_flags,
            },
            mitre_ids=item.get("mitre_ttps", []),
        ))
    
    for item in suspicious_dlls:
        dll = item["dll"]
        iocs.append(IOC(
            type="dll_mismatch",
            description=item["reason"],
            data={
                "pid": dll.process_pid,
                "dll": dll.base_name,
                "path": dll.full_path,
                "flags": dll.suspicious_flags,
            },
            mitre_ids=item.get("mitre_ttps", []),
        ))
    
    for item in suspicious_network:
        conn = item["connection"]
        iocs.append(IOC(
            type="suspicious_network",
            description=item["reason"],
            data={
                "proto": conn.proto,
                "local": f"{conn.local_addr}:{conn.local_port}",
                "remote": f"{conn.remote_addr}:{conn.remote_port}",
                "pid": conn.process_pid,
            },
            mitre_ids=item.get("mitre_ttps", []),
        ))
    
    return iocs


def _map_mitre_ttps(iocs: List[IOC]) -> Dict[str, List[str]]:
    """Mapea IOCs a TTPs MITRE."""
    ttp_map: Dict[str, List[str]] = {}
    
    for ioc in iocs:
        for ttp_id in ioc.mitre_ids:
            if ttp_id not in ttp_map:
                ttp_map[ttp_id] = []
            ttp_map[ttp_id].append(ioc.type)
    
    return ttp_map


def _calculate_confidence(iocs: List[IOC]) -> str:
    """Calcula nivel de confianza basado en IOCs."""
    if not iocs:
        return "bajo - sin indicadores detectados"
    
    high_confidence_types = {"api_hooking", "memory_injection", "hidden_process"}
    high_count = sum(1 for ioc in iocs if ioc.type in high_confidence_types)
    
    if high_count >= 3:
        return "alto"
    elif high_count >= 1:
        return "medio"
    else:
        return "bajo"


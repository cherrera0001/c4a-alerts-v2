from typing import Any, Dict, List, Tuple

from .models import Process, DLL, Driver, Hook, NetConn, RegistryKey, Service, IOC


SUSPICIOUS_APIS = [
  "GetAsyncKeyState",
  "SetWindowsHookEx",
  "NtUserSendInput",
  "NtReadFile",
]

SUSPICIOUS_PORTS = {1337, 4444, 5555, 8082}

TEXTINPUT_PROCS = {"textinputhost.exe", "ctfmon.exe"}


def _get_rows(plugin_result: Dict[str, Any]) -> List[Dict[str, Any]]:
  return plugin_result.get("rows", []) or []


def parse_pslist(pslist_result: Dict[str, Any]) -> List[Process]:
  processes: List[Process] = []
  for row in _get_rows(pslist_result):
    try:
      pid = int(row.get("PID") or row.get("Pid") or row.get("pid") or 0)
    except (TypeError, ValueError):
      continue
    ppid = row.get("PPID") or row.get("Ppid") or row.get("ppid")
    try:
      ppid_int = int(ppid) if ppid is not None else None
    except (TypeError, ValueError):
      ppid_int = None

    name = str(row.get("ImageFileName") or row.get("Name") or row.get("name") or "").strip()
    path = str(row.get("Path") or row.get("FilePath") or row.get("path") or "").strip() or None
    create_time = row.get("CreateTime") or row.get("Created") or None
    exit_time = row.get("ExitTime") or row.get("Exited") or None

    processes.append(
      Process(
        pid=pid,
        ppid=ppid_int,
        name=name,
        path=path,
        create_time=str(create_time) if create_time else None,
        exit_time=str(exit_time) if exit_time else None,
      )
    )
  return processes


def parse_dlllist(dlllist_result: Dict[str, Any]) -> List[DLL]:
  dlls: List[DLL] = []
  for row in _get_rows(dlllist_result):
    try:
      pid = int(row.get("PID") or row.get("Pid") or 0)
    except (TypeError, ValueError):
      continue
    base = str(row.get("BaseDllName") or row.get("Name") or "").strip()
    full = str(row.get("FullDllName") or row.get("Path") or "").strip()
    if not base:
      continue
    dlls.append(DLL(process_pid=pid, base_name=base, full_path=full))
  return dlls


def parse_driverscan(drivers_result: Dict[str, Any]) -> List[Driver]:
  drivers: List[Driver] = []
  for row in _get_rows(drivers_result):
    name = str(row.get("Name") or row.get("DriverName") or "").strip()
    path = str(row.get("Path") or row.get("ServiceKey") or "").strip()
    created = row.get("CreateTime") or row.get("Created")
    if not name:
      continue
    drivers.append(
      Driver(
        name=name,
        path=path,
        created=str(created) if created else None,
      )
    )
  return drivers


def parse_apihooks(apihooks_result: Dict[str, Any]) -> List[Hook]:
  hooks: List[Hook] = []
  for row in _get_rows(apihooks_result):
    func = str(row.get("HookedFunction") or row.get("Function") or "").strip()
    module = str(row.get("Module") or row.get("OwnerModule") or "").strip() or None
    target = str(row.get("HookingModule") or row.get("TargetModule") or "").strip() or None
    pid = row.get("PID") or row.get("Pid")
    try:
      pid_int = int(pid) if pid is not None else None
    except (TypeError, ValueError):
      pid_int = None

    is_suspicious = any(api.lower() in func.lower() for api in SUSPICIOUS_APIS)
    hooks.append(
      Hook(
        process_pid=pid_int,
        function=func,
        module=module,
        target=target,
        suspicious=is_suspicious,
      )
    )
  return hooks


def parse_malfind(malfind_result: Dict[str, Any]) -> List[Dict[str, Any]]:
  regions: List[Dict[str, Any]] = []
  for row in _get_rows(malfind_result):
    proc = str(row.get("Process") or row.get("Name") or "").strip()
    pid = row.get("PID") or row.get("Pid")
    try:
      pid_int = int(pid) if pid is not None else None
    except (TypeError, ValueError):
      pid_int = None
    protection = str(row.get("Protection") or "").upper()
    tags = str(row.get("Tag") or row.get("TagName") or "").upper()

    rwx = "RWX" in protection or ("READWRITE" in protection and "EXECUTE" in protection)
    suspicious = rwx or "EXECUTE" in protection

    regions.append(
      {
        "process": proc,
        "pid": pid_int,
        "protection": protection,
        "tag": tags,
        "suspicious": suspicious,
      }
    )
  return regions


def parse_netscan(netscan_result: Dict[str, Any]) -> List[NetConn]:
  conns: List[NetConn] = []
  for row in _get_rows(netscan_result):
    laddr = str(row.get("LocalAddr") or row.get("LocalAddress") or "").strip()
    raddr = str(row.get("ForeignAddr") or row.get("RemoteAddress") or "").strip()
    lport = row.get("LocalPort") or 0
    rport = row.get("ForeignPort") or row.get("RemotePort") or 0
    proto = str(row.get("Proto") or row.get("Protocol") or "").upper()
    pid = row.get("Pid") or row.get("PID")

    try:
      lp = int(lport)
      rp = int(rport)
    except (TypeError, ValueError):
      continue

    try:
      pid_int = int(pid) if pid is not None else None
    except (TypeError, ValueError):
      pid_int = None

    suspicious = lp in SUSPICIOUS_PORTS or rp in SUSPICIOUS_PORTS

    conns.append(
      NetConn(
        proto=proto,
        local_addr=laddr,
        local_port=lp,
        remote_addr=raddr,
        remote_port=rp,
        process_pid=pid_int,
        suspicious=suspicious,
      )
    )
  return conns


def parse_registry_userassist(userassist_result: Dict[str, Any]) -> List[RegistryKey]:
  keys: List[RegistryKey] = []
  for row in _get_rows(userassist_result):
    path = str(row.get("KeyPath") or row.get("Path") or "").strip()
    val_name = str(row.get("ValueName") or "").strip() or None
    data = str(row.get("Value") or row.get("Data") or "").strip() or None
    if not path:
      continue
    keys.append(
      RegistryKey(
        hive="NTUSER.DAT",
        path=path,
        value_name=val_name,
        value_data=data,
      )
    )
  return keys


def parse_svclist(svclist_result: Dict[str, Any]) -> List[Service]:
    """Parsea salida de windows.svclist.SvcList."""
    services: List[Service] = []
    for row in _get_rows(svclist_result):
        name = str(row.get("Name") or row.get("ServiceName") or "").strip()
        if not name:
            continue
        
        display_name = str(row.get("DisplayName") or row.get("Display") or "").strip() or None
        path = str(row.get("BinaryPath") or row.get("Path") or row.get("ImagePath") or "").strip() or None
        service_type = str(row.get("Type") or row.get("ServiceType") or "").strip() or None
        state = str(row.get("State") or row.get("Status") or "").strip() or None
        pid = row.get("PID") or row.get("Pid")
        try:
            pid_int = int(pid) if pid is not None else None
        except (TypeError, ValueError):
            pid_int = None
        
        services.append(Service(
            name=name,
            display_name=display_name,
            path=path,
            service_type=service_type,
            state=state,
            pid=pid_int,
        ))
    return services


def parse_cmdline(cmdline_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parsea salida de windows.cmdline.CmdLine."""
    cmdlines: List[Dict[str, Any]] = []
    for row in _get_rows(cmdline_result):
        pid = row.get("PID") or row.get("Pid")
        try:
            pid_int = int(pid) if pid is not None else None
        except (TypeError, ValueError):
            continue
        
        cmdline = str(row.get("CommandLine") or row.get("Cmdline") or row.get("Command") or "").strip()
        if pid_int:
            cmdlines.append({
                "pid": pid_int,
                "cmdline": cmdline,
            })
    return cmdlines


def parse_callbacks(callbacks_result: Dict[str, Any]) -> List[Hook]:
    """Parsea salida de windows.callbacks.Callbacks."""
    hooks: List[Hook] = []
    for row in _get_rows(callbacks_result):
        func = str(row.get("Callback") or row.get("Function") or row.get("Routine") or "").strip()
        if not func:
            continue
        
        module = str(row.get("Module") or row.get("Owner") or "").strip() or None
        target = str(row.get("Type") or row.get("CallbackType") or "").strip() or None
        pid = row.get("PID") or row.get("Pid")
        try:
            pid_int = int(pid) if pid is not None else None
        except (TypeError, ValueError):
            pid_int = None
        
        is_suspicious = any(
            api.lower() in func.lower() 
            for api in ["GetAsyncKeyState", "SetWindowsHookEx", "NtUser", "ReadFile"]
        )
        
        hooks.append(Hook(
            process_pid=pid_int,
            function=func,
            module=module,
            target=target,
            suspicious=is_suspicious,
        ))
    return hooks


def parse_ldrmodules(ldrmodules_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parsea salida de windows.ldrmodules.LdrModules para detectar DLLs no en disco."""
    mismatches: List[Dict[str, Any]] = []
    for row in _get_rows(ldrmodules_result):
        pid = row.get("PID") or row.get("Pid")
        try:
            pid_int = int(pid) if pid is not None else None
        except (TypeError, ValueError):
            continue
        
        dll_name = str(row.get("DllBase") or row.get("Name") or "").strip()
        in_load = row.get("InLoad") or row.get("InLoadOrderLinks", "").strip()
        in_mem = row.get("InMem") or row.get("InMemoryOrderLinks", "").strip()
        in_init = row.get("InInit") or row.get("InInitializationOrderLinks", "").strip()
        
        # Si falta en alguna lista, es sospechoso
        if not in_load or not in_mem or not in_init:
            mismatches.append({
                "pid": pid_int,
                "dll": dll_name,
                "in_load": bool(in_load),
                "in_mem": bool(in_mem),
                "in_init": bool(in_init),
            })
    
    return mismatches


def build_iocs(
  processes: List[Process],
  dlls: List[DLL],
  drivers: List[Driver],
  hooks: List[Hook],
  malfind_regions: List[Dict[str, Any]],
  netconns: List[NetConn],
  reg_keys: List[RegistryKey],
) -> Tuple[List[IOC], Dict[str, Any]]:
  iocs: List[IOC] = []
  suspicious_processes: List[Process] = []
  suspicious_drivers: List[Driver] = []
  suspicious_dlls: List[DLL] = []
  suspicious_hooks: List[Hook] = []
  suspicious_injections: List[Dict[str, Any]] = []
  suspicious_net: List[NetConn] = []

  # Hooks sospechosos / keylogging
  for hk in hooks:
    if hk.suspicious:
      suspicious_hooks.append(hk)
      iocs.append(
        IOC(
          type="api_hooking",
          description=f"Hook sospechoso en {hk.function}",
          data={"function": hk.function, "module": hk.module, "target": hk.target},
          mitre_ids=["T1056.004"],
        )
      )
      if "GetAsyncKeyState".lower() in hk.function.lower() or "SetWindowsHookEx".lower() in hk.function.lower():
        iocs.append(
          IOC(
            type="keylogging",
            description=f"Posible keylogging por hook en {hk.function}",
            data={"function": hk.function},
            mitre_ids=["T1056.001"],
          )
        )

  # Inyecciones RWX / malfind
  for r in malfind_regions:
    if r.get("suspicious"):
      suspicious_injections.append(r)
      iocs.append(
        IOC(
          type="memory_injection",
          description=f"Región de memoria ejecutable sospechosa en {r.get('process')}",
          data=r,
          mitre_ids=["T1055", "T1027"],
        )
      )

  # Drivers anómalos (muy básico: rutas inusuales)
  for d in drivers:
    lower_path = d.path.lower() if d.path else ""
    if lower_path and ("temp" in lower_path or "users" in lower_path):
      d.suspicious_flags.append("driver_path_unusual")
      suspicious_drivers.append(d)
      iocs.append(
        IOC(
          type="driver_anomaly",
          description=f"Driver en ruta inusual: {d.path}",
          data={"name": d.name, "path": d.path},
          mitre_ids=["T1014"],
        )
      )

  # DLLs en ubicaciones sospechosas (sin confirmar en disco)
  for dll in dlls:
    full = dll.full_path.lower()
    if full and ("\\temp\\" in full or "\\appdata\\" in full or "\\users\\" in full):
      dll.suspicious_flags.append("dll_path_unusual")
      suspicious_dlls.append(dll)
      iocs.append(
        IOC(
          type="dll_mismatch",
          description=f"DLL en posible ubicación no estándar: {dll.full_path}",
          data={"pid": dll.process_pid, "dll": dll.base_name, "path": dll.full_path},
          mitre_ids=["T1055"],
        )
      )

  # Conexiones sospechosas (puertos especiales)
  for c in netconns:
    if c.suspicious:
      suspicious_net.append(c)
      iocs.append(
        IOC(
          type="suspicious_network",
          description=f"Conexión sospechosa {c.local_addr}:{c.local_port} -> {c.remote_addr}:{c.remote_port}",
          data={
            "proto": c.proto,
            "local": f"{c.local_addr}:{c.local_port}",
            "remote": f"{c.remote_addr}:{c.remote_port}",
            "pid": c.process_pid,
          },
          mitre_ids=["T1055", "T1014"],
        )
      )

  # Procesos de teclado / input sospechosos
  for p in processes:
    if p.name.lower() in TEXTINPUT_PROCS:
      suspicious_processes.append(p)
      iocs.append(
        IOC(
          type="keyboard_manipulation",
          description=f"Proceso sensible a input detectado: {p.name} (PID {p.pid})",
          data={"pid": p.pid, "name": p.name},
          mitre_ids=["T1056.001", "T1056.004"],
        )
      )

  summary = {
    "suspicious_processes": [p.__dict__ for p in suspicious_processes],
    "suspicious_dlls": [d.__dict__ for d in suspicious_dlls],
    "suspicious_drivers": [d.__dict__ for d in suspicious_drivers],
    "suspicious_hooks": [h.__dict__ for h in suspicious_hooks],
    "suspicious_injections": suspicious_injections,
    "suspicious_network": [c.__dict__ for c in suspicious_net],
  }

  return iocs, summary




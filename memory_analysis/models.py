from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class Process:
  pid: int
  ppid: Optional[int]
  name: str
  path: Optional[str] = None
  create_time: Optional[str] = None
  exit_time: Optional[str] = None
  suspicious_flags: List[str] = field(default_factory=list)


@dataclass
class DLL:
  process_pid: int
  base_name: str
  full_path: str
  suspicious_flags: List[str] = field(default_factory=list)


@dataclass
class Driver:
  name: str
  path: str
  created: Optional[str] = None
  suspicious_flags: List[str] = field(default_factory=list)


@dataclass
class Hook:
  process_pid: Optional[int]
  function: str
  module: Optional[str]
  target: Optional[str]
  suspicious: bool = False


@dataclass
class NetConn:
  proto: str
  local_addr: str
  local_port: int
  remote_addr: str
  remote_port: int
  process_pid: Optional[int]
  suspicious: bool = False


@dataclass
class RegistryKey:
  hive: str
  path: str
  value_name: Optional[str] = None
  value_data: Optional[str] = None
  suspicious_flags: List[str] = field(default_factory=list)


@dataclass
class Service:
  name: str
  display_name: Optional[str] = None
  path: Optional[str] = None
  service_type: Optional[str] = None
  state: Optional[str] = None
  pid: Optional[int] = None
  suspicious_flags: List[str] = field(default_factory=list)


@dataclass
class IOC:
  type: str
  description: str
  data: Dict[str, Any] = field(default_factory=dict)
  mitre_ids: List[str] = field(default_factory=list)




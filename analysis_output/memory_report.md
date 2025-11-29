## Memory Analysis Report - ram3.raw

- **Dump path**: `C:\Users\herre\OneDrive\Documentos\C4A\Foren\ram3.raw`
- **Analysis time (UTC)**: 2025-11-27T22:29:45.753650Z
- **Analysis status**: `failed_no_valid_plugins`

> ATENCIÓN: Ningún plugin de Volatility pudo ejecutarse con éxito.
> Es muy probable que falten símbolos del kernel (PDB) o acceso a internet/símbolos offline.

### Resumen Ejecutivo

- IOCs totales: **0**
- Procesos sospechosos: **0**
- Inyecciones de memoria sospechosas: **0**
- Hooks sospechosos: **0**
- Conexiones sospechosas: **0**

### Estado de plugins de Volatility
- Plugins OK: **0 / 15**

- `windows.info.Info`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.Info.kernel.symbol_table_name']
- `windows.pslist.PsList`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.PsList.kernel.symbol_table_name']
- `windows.psscan.PsScan`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.PsScan.kernel.symbol_table_name']
- `windows.driverscan.DriverScan`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.DriverScan.kernel.symbol_table_name']
- `windows.dlllist.DllList`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.DllList.kernel.symbol_table_name']
- `windows.malfind.Malfind`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.Malfind.kernel.symbol_table_name']
- `windows.malware.unhooked_system_calls.unhooked_system_calls`: ERROR - Volatility 3 Framework 2.26.2
usage: vol.exe [-h] [-c CONFIG] [--parallelism [{processes,threads,off}]]
               [-e EXTEND] [-p PLUGIN_DIRS] [-s SYMBOL_DIRS] [-v] [-l LOG]
               [-o OUTPUT_DIR] [-q] [-r RENDERER] [-f FILE] [--write-config]
               [--save-config SAVE_CONFIG] [--clear-cache]
               [--cache-path CACHE_PATH] [--offline | -u URL]
               [--filters FILTERS] [--hide-columns [HIDE_COLUMNS ...]]
               [--single-location SINGLE_LOCATION] [--stackers [STACKERS ...]]
               [--single-swap-locations [SINGLE_SWAP_LOCATIONS ...]]
               PLUGIN ...
vol.exe: error: argument PLUGIN: invalid choice windows.malware.unhooked_system_calls.unhooked_system_calls (choose from banners.Banners, configwriter.ConfigWriter, frameworkinfo.FrameworkInfo, isfinfo.IsfInfo, layerwriter.LayerWriter, linux.bash.Bash, linux.boottime.Boottime, linux.capabilities.Capabilities, linux.check_afinfo.Check_afinfo, linux.check_creds.Check_creds, linux.check_idt.Check_idt, linux.check_modules.Check_modules, linux.check_syscall.Check_syscall, linux.ebpf.EBPF, linux.elfs.Elfs, linux.envars.Envars, linux.graphics.fbdev.Fbdev, linux.hidden_modules.Hidden_modules, linux.iomem.IOMem, linux.ip.Addr, linux.ip.Link, linux.kallsyms.Kallsyms, linux.keyboard_notifiers.Keyboard_notifiers, linux.kmsg.Kmsg, linux.kthreads.Kthreads, linux.library_list.LibraryList, linux.lsmod.Lsmod, linux.lsof.Lsof, linux.malfind.Malfind, linux.malware.check_afinfo.Check_afinfo, linux.malware.check_creds.Check_creds, linux.malware.check_idt.Check_idt, linux.malware.check_modules.Check_modules, linux.malware.check_syscall.Check_syscall, linux.malware.hidden_modules.Hidden_modules, linux.malware.keyboard_notifiers.Keyboard_notifiers, linux.malware.malfind.Malfind, linux.malware.modxview.Modxview, linux.malware.netfilter.Netfilter, linux.malware.tty_check.Tty_Check, linux.module_extract.ModuleExtract, linux.modxview.Modxview, linux.mountinfo.MountInfo, linux.netfilter.Netfilter, linux.pagecache.Files, linux.pagecache.InodePages, linux.pagecache.RecoverFs, linux.pidhashtable.PIDHashTable, linux.proc.Maps, linux.psaux.PsAux, linux.pscallstack.PsCallStack, linux.pslist.PsList, linux.psscan.PsScan, linux.pstree.PsTree, linux.ptrace.Ptrace, linux.sockstat.Sockstat, linux.tracing.ftrace.CheckFtrace, linux.tracing.perf_events.PerfEvents, linux.tracing.tracepoints.CheckTracepoints, linux.tty_check.tty_check, linux.vmaregexscan.VmaRegExScan, linux.vmcoreinfo.VMCoreInfo, mac.bash.Bash, mac.check_syscall.Check_syscall, mac.check_sysctl.Check_sysctl, mac.check_trap_table.Check_trap_table, mac.dmesg.Dmesg, mac.ifconfig.Ifconfig, mac.kauth_listeners.Kauth_listeners, mac.kauth_scopes.Kauth_scopes, mac.kevents.Kevents, mac.list_files.List_Files, mac.lsmod.Lsmod, mac.lsof.Lsof, mac.malfind.Malfind, mac.mount.Mount, mac.netstat.Netstat, mac.proc_maps.Maps, mac.psaux.Psaux, mac.pslist.PsList, mac.pstree.PsTree, mac.socket_filters.Socket_filters, mac.timers.Timers, mac.trustedbsd.Trustedbsd, mac.vfsevents.VFSevents, regexscan.RegExScan, timeliner.Timeliner, vmscan.Vmscan, windows.amcache.Amcache, windows.bigpools.BigPools, windows.callbacks.Callbacks, windows.cmdline.CmdLine, windows.cmdscan.CmdScan, windows.consoles.Consoles, windows.crashinfo.Crashinfo, windows.debugregisters.DebugRegisters, windows.deskscan.DeskScan, windows.desktops.Desktops, windows.devicetree.DeviceTree, windows.dlllist.DllList, windows.driverirp.DriverIrp, windows.drivermodule.DriverModule, windows.driverscan.DriverScan, windows.dumpfiles.DumpFiles, windows.envars.Envars, windows.etwpatch.EtwPatch, windows.filescan.FileScan, windows.getservicesids.GetServiceSIDs, windows.getsids.GetSIDs, windows.handles.Handles, windows.hollowprocesses.HollowProcesses, windows.iat.IAT, windows.info.Info, windows.joblinks.JobLinks, windows.kpcrs.KPCRs, windows.ldrmodules.LdrModules, windows.malfind.Malfind, windows.malware.drivermodule.DriverModule, windows.malware.hollowprocesses.HollowProcesses, windows.malware.ldrmodules.LdrModules, windows.malware.malfind.Malfind, windows.malware.processghosting.ProcessGhosting, windows.malware.psxview.PsXView, windows.malware.skeleton_key_check.Skeleton_Key_Check, windows.malware.suspicious_threads.SuspiciousThreads, windows.malware.svcdiff.SvcDiff, windows.malware.unhooked_system_calls.UnhookedSystemCalls, windows.mbrscan.MBRScan, windows.memmap.Memmap, windows.modscan.ModScan, windows.modules.Modules, windows.mutantscan.MutantScan, windows.netscan.NetScan, windows.netstat.NetStat, windows.orphan_kernel_threads.Threads, windows.pe_symbols.PESymbols, windows.pedump.PEDump, windows.poolscanner.PoolScanner, windows.privileges.Privs, windows.processghosting.ProcessGhosting, windows.pslist.PsList, windows.psscan.PsScan, windows.pstree.PsTree, windows.psxview.PsXView, windows.registry.amcache.Amcache, windows.registry.certificates.Certificates, windows.registry.getcellroutine.GetCellRoutine, windows.registry.hivelist.HiveList, windows.registry.hivescan.HiveScan, windows.registry.printkey.PrintKey, windows.registry.scheduled_tasks.ScheduledTasks, windows.registry.userassist.UserAssist, windows.scheduled_tasks.ScheduledTasks, windows.sessions.Sessions, windows.shimcachemem.ShimcacheMem, windows.skeleton_key_check.Skeleton_Key_Check, windows.ssdt.SSDT, windows.statistics.Statistics, windows.strings.Strings, windows.suspended_threads.SuspendedThreads, windows.suspicious_threads.SuspiciousThreads, windows.svcdiff.SvcDiff, windows.svclist.SvcList, windows.svcscan.SvcScan, windows.symlinkscan.SymlinkScan, windows.thrdscan.ThrdScan, windows.threads.Threads, windows.timers.Timers, windows.truecrypt.Passphrase, windows.unhooked_system_calls.unhooked_system_calls, windows.unloadedmodules.UnloadedModules, windows.vadinfo.VadInfo, windows.vadregexscan.VadRegExScan, windows.vadwalk.VadWalk, windows.verinfo.VerInfo, windows.virtmap.VirtMap, windows.windows.Windows, windows.windowstations.WindowStations)
- `windows.handles.Handles`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.Handles.kernel.symbol_table_name']
- `windows.cmdline.CmdLine`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.CmdLine.kernel.symbol_table_name']
- `windows.netscan.NetScan`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.NetScan.kernel.symbol_table_name']
- `windows.netstat.NetStat`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.NetStat.kernel.symbol_table_name']
- `windows.registry.userassist.UserAssist`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.UserAssist.kernel.symbol_table_name']
- `windows.registry.printkey.PrintKey`: ERROR - Volatility 3 Framework 2.26.2
usage: vol.exe [-h] [-c CONFIG] [--parallelism [{processes,threads,off}]]
               [-e EXTEND] [-p PLUGIN_DIRS] [-s SYMBOL_DIRS] [-v] [-l LOG]
               [-o OUTPUT_DIR] [-q] [-r RENDERER] [-f FILE] [--write-config]
               [--save-config SAVE_CONFIG] [--clear-cache]
               [--cache-path CACHE_PATH] [--offline | -u URL]
               [--filters FILTERS] [--hide-columns [HIDE_COLUMNS ...]]
               [--single-location SINGLE_LOCATION] [--stackers [STACKERS ...]]
               [--single-swap-locations [SINGLE_SWAP_LOCATIONS ...]]
               PLUGIN ...
vol.exe: error: unrecognized arguments: -K NTUSER.DAT -K SYSTEM
- `windows.callbacks.Callbacks`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.Callbacks.kernel.symbol_table_name']
- `windows.ldrmodules.LdrModules`: ERROR - Volatility 3 Framework 2.26.2

Progress:    0.00		Scanning FileLayer using PageMapScanner

Progress:   23.33		Scanning FileLayer using PageMapScanner

Progress:  100.00		Stacking attempts finished             

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:    0.00		Scanning layer_name using PdbSignatureScanner

Progress:  100.00		Downloading http://msdl.microsoft.com/download/symbols/ntkrnlmp.pdb/4823A0EB53EF0F078008DA599BC5062D1/ntkrnlmp.pd_
WARNING  volatility3.framework.symbols.windows.pdbutil: Symbol file could not be downloaded from remote server                                                                                                    

Progress:  100.00		PDB scanning finished                                                                                             
Unable to validate the plugin requirements: ['plugins.LdrModules.kernel.symbol_table_name']

### IOCs detectados


### Procesos sospechosos

### Hooks sospechosos

### Inyecciones en memoria (malfind)

### Drivers anómalos

### DLLs en rutas no estándar

### Conexiones de red sospechosas

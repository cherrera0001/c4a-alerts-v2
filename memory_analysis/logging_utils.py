import logging
from pathlib import Path


def setup_logger(output_root: Path) -> logging.Logger:
  output_root.mkdir(parents=True, exist_ok=True)
  log_path = output_root / "memory_analysis.log"

  logger = logging.getLogger("memory_analysis")
  logger.setLevel(logging.INFO)

  # Evitar configurar múltiples veces
  if logger.handlers:
    return logger

  formatter = logging.Formatter(
    "%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
  )

  fh = logging.FileHandler(log_path, encoding="utf-8")
  fh.setLevel(logging.INFO)
  fh.setFormatter(formatter)
  logger.addHandler(fh)

  sh = logging.StreamHandler()
  sh.setLevel(logging.INFO)
  sh.setFormatter(formatter)
  logger.addHandler(sh)

  return logger




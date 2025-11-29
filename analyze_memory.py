import argparse
from pathlib import Path

from memory_analysis import run_memory_analysis


def main() -> None:
  parser = argparse.ArgumentParser(
    description="Análisis DFIR de memoria Windows usando Volatility 3."
  )
  parser.add_argument(
    "-f",
    "--dump",
    required=True,
    help="Ruta al archivo de memoria (.raw, .dmp, etc.)",
  )
  parser.add_argument(
    "-o",
    "--output",
    default="analysis_output",
    help="Carpeta de salida para los reportes (por defecto: analysis_output/)",
  )

  args = parser.parse_args()
  dump_path = Path(args.dump).resolve()

  if not dump_path.exists():
    raise SystemExit(f"Dump no encontrado: {dump_path}")

  # Ajustar raíz de salida si se personaliza -o
  from memory_analysis.pipeline import MemoryAnalysisPipeline
  from memory_analysis.logging_utils import setup_logger

  output_root = Path(args.output).resolve()
  logger = setup_logger(output_root)

  logger.info(f"Ejecutando análisis de memoria para: {dump_path}")
  pipeline = MemoryAnalysisPipeline(dump_path=dump_path, output_root=output_root)
  result = pipeline.run()

  logger.info("Análisis completado")
  logger.info(f"Resumen: {result.get('summary', {})}")


if __name__ == "__main__":
  main()




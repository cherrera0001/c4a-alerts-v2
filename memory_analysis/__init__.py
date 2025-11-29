from pathlib import Path
from typing import Dict, Any, Optional

from .pipeline import MemoryAnalysisPipeline


def run_memory_analysis(
    dump_path: str,
    output_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    Ejecuta el pipeline completo de análisis de memoria sobre el dump indicado.

    Args:
        dump_path: Ruta al archivo de volcado de memoria
        output_dir: Directorio de salida (por defecto: "analysis_output")

    Returns:
        Dict con el análisis consolidado (sin datos crudos de Volatility)
    """
    output_root = Path(output_dir) if output_dir else Path("analysis_output")
    pipeline = MemoryAnalysisPipeline(
        dump_path=Path(dump_path),
        output_root=output_root,
    )
    result = pipeline.run()
    # El pipeline devuelve un dict con más campos; solo exponemos el resumen consolidado
    return result.get("summary", result)




const SEVERITY_CONFIG = {
  critical: {
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    text: "text-red-300",
    label: "CRITICAL",
  },
  high: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/40",
    text: "text-orange-300",
    label: "HIGH",
  },
  medium: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    text: "text-amber-300",
    label: "MEDIUM",
  },
  low: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/40",
    text: "text-yellow-300",
    label: "LOW",
  },
  info: {
    bg: "bg-sky-500/10",
    border: "border-sky-500/40",
    text: "text-sky-300",
    label: "INFO",
  },
};

export default function AlertSeverityBadge({ severity }) {
  const config = SEVERITY_CONFIG[severity?.toLowerCase()] || SEVERITY_CONFIG.info;

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full border ${config.bg} ${config.border} ${config.text}`}
    >
      {config.label}
    </span>
  );
}





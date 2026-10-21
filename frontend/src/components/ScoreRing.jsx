function levelFor(ratio) {
  if (ratio >= 0.75) return "high";
  if (ratio >= 0.5) return "medium";
  return "low";
}

export default function ScoreRing({ score, max = 100, size = 112, small = false }) {
  const stroke = small ? 7 : 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.max(0, Math.min(1, score / max));
  const center = size / 2;

  return (
    <div
      className={`score-ring score-ring-${levelFor(ratio)}${small ? " small" : ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score ${score} out of ${max}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-track" cx={center} cy={center} r={radius} strokeWidth={stroke} />
        <circle
          className="ring-value"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <span className="score-ring-value" aria-hidden="true">
        <strong>{score}</strong>
        <span>/{max}</span>
      </span>
    </div>
  );
}
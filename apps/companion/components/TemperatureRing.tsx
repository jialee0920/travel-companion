type Props = {
  temperature: number;
  size?: number;
  stroke?: number;
};

export function TemperatureRing({ temperature, size = 64, stroke = 6 }: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (temperature / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="oklch(0.68 0.18 35 / 0.16)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={stroke}
        strokeDasharray={`${progress} ${circumference}`}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="rotate-90 fill-foreground text-[11px] font-bold"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
      >
        {temperature.toFixed(1)}°
      </text>
    </svg>
  );
}

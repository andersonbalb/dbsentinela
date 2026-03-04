// Generate historical time series data for charts
export const generateHistoricalData = (hours: number, baseValue: number, variance: number, min = 0, max = 100) => {
  const data = [];
  const now = new Date();
  const pointsPerHour = hours <= 24 ? 6 : hours <= 168 ? 1 : 0.25; // 10min, 1h, 4h intervals
  const totalPoints = Math.floor(hours * pointsPerHour);

  let value = baseValue;
  for (let i = totalPoints; i >= 0; i--) {
    const d = new Date(now.getTime() - (i / pointsPerHour) * 3600000);
    value = Math.min(max, Math.max(min, value + (Math.random() - 0.48) * variance));
    data.push({
      time: d.toISOString(),
      label: hours <= 24
        ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : hours <= 168
        ? `${d.toLocaleDateString("pt-BR", { weekday: "short" })} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
        : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      value: Math.round(value * 100) / 100,
    });
  }
  return data;
};

export type TimePeriod = "6h" | "24h" | "7d" | "30d";

export const periodHours: Record<TimePeriod, number> = {
  "6h": 6,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

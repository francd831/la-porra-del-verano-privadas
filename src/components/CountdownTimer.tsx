import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

// Deadline: June 11, 2026 at 00:00:00 UTC (World Cup 2026 start)
const PREDICTIONS_DEADLINE = new Date("2026-06-11T00:00:00Z").getTime();

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(): TimeLeft | null {
  const now = Date.now();
  const diff = PREDICTIONS_DEADLINE - now;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(getTimeLeft);

  useEffect(() => {
    const interval = setInterval(() => {
      const t = getTimeLeft();
      setTimeLeft(t);
      if (!t) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) return null;

  const units = [
    { label: "días", value: timeLeft.days },
    { label: "horas", value: timeLeft.hours },
    { label: "min", value: timeLeft.minutes },
    { label: "seg", value: timeLeft.seconds },
  ];

  return (
    <div className="w-full py-3 px-4 bg-gradient-to-r from-primary/20 via-gold/20 to-primary/20 backdrop-blur-md border-b border-gold/30">
      <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 text-gold">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            Cierre de pronósticos
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {units.map((unit) => (
            <div key={unit.label} className="flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums min-w-[2.5rem] text-center">
                {String(unit.value).padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase">
                {unit.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Shield } from "lucide-react";

export const Logo = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10">
        {/* Shield base */}
        <Shield className="w-10 h-10 text-primary absolute" strokeWidth={2} />
        {/* Stethoscope curve - simplified representation */}
        <svg
          className="absolute inset-0 w-10 h-10"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 12 8 Q 12 15, 20 15 Q 28 15, 28 8"
            stroke="hsl(var(--secondary))"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="20" cy="18" r="2.5" fill="hsl(var(--secondary))" />
          <path
            d="M 20 20 L 20 28"
            stroke="hsl(var(--secondary))"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="20" cy="30" r="3" fill="hsl(var(--secondary))" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold text-foreground leading-none">SecureMed</span>
        <span className="text-xs text-muted-foreground leading-none">Device Logs</span>
      </div>
    </div>
  );
};



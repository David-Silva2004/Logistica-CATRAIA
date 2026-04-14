import appIcon from "../../assets/branding/fabiana-app-icon.png";
import fullLogo from "../../assets/branding/fabiana-logo.png";
import { cn } from "./ui/utils";

interface BrandLogoProps {
  variant?: "full" | "icon" | "name";
  className?: string;
  imageClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  subtitle?: string;
}

export function BrandLogo({
  variant = "name",
  className,
  imageClassName,
  titleClassName,
  subtitleClassName,
  subtitle = "Transportes Maritimos",
}: BrandLogoProps) {
  if (variant === "full") {
    return (
      <div className={cn("inline-flex items-center", className)}>
        <img
          src={fullLogo}
          alt="Fabiana Transportes Maritimos"
          className={cn("h-auto w-[240px] max-w-full", imageClassName)}
          draggable={false}
        />
      </div>
    );
  }

  if (variant === "icon") {
    return (
      <div className={cn("inline-flex items-center", className)}>
        <img
          src={appIcon}
          alt="Icone da Fabiana Transportes Maritimos"
          className={cn("h-12 w-12 rounded-2xl", imageClassName)}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center", className)}>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-lg font-black tracking-tight text-slate-900",
            titleClassName,
          )}
        >
          Fabiana
        </p>
        {subtitle ? (
          <p
            className={cn(
              "truncate text-[11px] font-bold uppercase tracking-[0.22em] text-[#008fd4]",
              subtitleClassName,
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useState, type MouseEvent } from "react";
import { Maximize2, Minimize2, Copy, X } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

function getDesktopWindowApi() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.desktopWindow ?? null;
}

export function DesktopWindowBar() {
  const desktopWindow = getDesktopWindowApi();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!desktopWindow?.isDesktop) {
      return;
    }

    let isMounted = true;

    void desktopWindow.isMaximized().then((value) => {
      if (isMounted) {
        setIsMaximized(value);
      }
    });

    const removeListener = desktopWindow.onMaximizeChanged((value) => {
      setIsMaximized(value);
    });

    return () => {
      isMounted = false;
      removeListener();
    };
  }, [desktopWindow]);

  if (!desktopWindow?.isDesktop) {
    return null;
  }

  const handleDoubleClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;

    if (target.closest('[data-app-region="no-drag"]')) {
      return;
    }

    void desktopWindow.toggleMaximize();
  };

  const controls = [
    {
      label: "Minimizar",
      onClick: () => void desktopWindow.minimize(),
      icon: <Minimize2 size={16} strokeWidth={2.2} />,
      className:
        "text-slate-500 hover:bg-slate-900/6 hover:text-slate-900",
    },
    {
      label: isMaximized ? "Restaurar" : "Maximizar",
      onClick: () => void desktopWindow.toggleMaximize(),
      icon: isMaximized ? (
        <Copy size={14} strokeWidth={2.1} />
      ) : (
        <Maximize2 size={14} strokeWidth={2.1} />
      ),
      className:
        "text-slate-500 hover:bg-[#fff3bf] hover:text-[#0d7bb8]",
    },
    {
      label: "Fechar",
      onClick: () => void desktopWindow.close(),
      icon: <X size={15} strokeWidth={2.2} />,
      className:
        "text-slate-500 hover:bg-red-500 hover:text-white",
    },
  ];

  return (
    <header
      data-app-region="drag"
      onDoubleClick={handleDoubleClick}
      className="relative flex h-14 items-center justify-between border-b border-[#d8edf8] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(243,250,254,0.92))] px-4 shadow-[0_10px_30px_rgba(6,67,104,0.06)] backdrop-blur-xl select-none"
    >
      <BrandLogo
        variant="name"
        subtitle=""
        className="min-w-0"
        titleClassName="text-base"
      />

      <div
        data-app-region="no-drag"
        className="flex items-center gap-1 rounded-full border border-[#d6ecf8] bg-white/92 p-1 shadow-[0_14px_30px_rgba(10,72,109,0.08)]"
      >
        {controls.map((control) => (
          <button
            key={control.label}
            type="button"
            onClick={control.onClick}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${control.className}`}
            title={control.label}
            aria-label={control.label}
          >
            {control.icon}
          </button>
        ))}
      </div>
    </header>
  );
}

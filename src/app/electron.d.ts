export {};

declare global {
  interface Window {
    desktopWindow?: {
      isDesktop: boolean;
      minimize: () => Promise<void>;
      toggleMaximize: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      onMaximizeChanged: (callback: (isMaximized: boolean) => void) => () => void;
    };
  }
}

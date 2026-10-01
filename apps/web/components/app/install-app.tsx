"use client";
/**
 * "Install the app". Tycoonhood installs from the browser: Chrome, Edge and
 * Android offer a native prompt (beforeinstallprompt); iPhone and iPad have
 * no prompt, so we show the two taps that do it (Share → Add to Home Screen).
 * Hidden when already running installed, and wherever neither path exists.
 */
import { useEffect, useState } from "react";
import { Dialog, Icon, cn } from "@tycoonhood/ui";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallAppButton({ variant }: { variant: "sidebar" | "sheet" | "card" }) {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const ua = navigator.userAgent;
    setIos(/iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as PromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!prompt && !ios)) return null;

  const onClick = async () => {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    } else setHelp(true);
  };

  const cls =
    variant === "sidebar"
      ? "group flex h-9 w-full items-center gap-3 rounded-md px-3 text-[14px] font-medium text-ink-2 hover:bg-bg-2 hover:text-ink-1"
      : variant === "sheet"
        ? "flex h-12 w-full items-center gap-3 rounded-md px-3 text-[15px] text-ink-1 hover:bg-bg-3"
        : "inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-bg-2 px-4 text-[14px] font-medium text-ink-1 hover:bg-bg-3";

  return (
    <>
      <button type="button" onClick={onClick} className={cls}>
        <Icon name="download" size={variant === "sheet" ? 20 : 18} className={cn(variant !== "card" && "text-ink-3")} />
        Install the app
      </button>
      <Dialog open={help} onClose={() => setHelp(false)} title="Install Tycoonhood on this device">
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-[14px] leading-relaxed text-ink-2">
          <li>
            Tap <span className="font-medium text-ink-1">Share</span> in Safari&rsquo;s toolbar.
          </li>
          <li>
            Choose <span className="font-medium text-ink-1">Add to Home Screen</span>, then <span className="font-medium text-ink-1">Add</span>.
          </li>
          <li>Open Tycoonhood from your home screen. It runs full-screen, like any app.</li>
        </ol>
      </Dialog>
    </>
  );
}

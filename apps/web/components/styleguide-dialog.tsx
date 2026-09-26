"use client";
import { useState } from "react";
import { Button, Dialog } from "@tycoonhood/ui";

/** The three dialog tones, openable, for the styleguide. */
export function StyleguideDialogDemo() {
  const [tone, setTone] = useState<null | "standard" | "confirmation" | "premium">(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => setTone("standard")}>
        Standard dialog
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setTone("confirmation")}>
        Confirmation
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setTone("premium")}>
        Premium
      </Button>
      <Dialog
        open={tone !== null}
        onClose={() => setTone(null)}
        tone={tone ?? "standard"}
        title={tone === "premium" ? "Rank up: Apprentice" : tone === "confirmation" ? "End the challenge now?" : "Link your Discord"}
        description={
          tone === "premium"
            ? "Level 5 reached on verified work. Your rank follows you to Discord."
            : tone === "confirmation"
              ? "Unfinished participants will be marked failed. This is recorded and cannot be undone."
              : "Generate a one-time code here, then run /link in the server."
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setTone(null)}>
              Close
            </Button>
            <Button size="sm" onClick={() => setTone(null)}>
              {tone === "confirmation" ? "End now" : "Continue"}
            </Button>
          </>
        }
      />
    </div>
  );
}

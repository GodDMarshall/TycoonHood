"use client";
import { Button, Icon } from "@tycoonhood/ui";

/** Opens the browser's print dialog (print or save as PDF). */
export function PrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      <Icon name="download" size={15} /> Print or save as PDF
    </Button>
  );
}

import type { ReactNode } from "react";
import { SiteHeader } from "../../components/shell/site-header";
import { SiteFooter } from "../../components/site-footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div id="content" tabIndex={-1} className="outline-none">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}

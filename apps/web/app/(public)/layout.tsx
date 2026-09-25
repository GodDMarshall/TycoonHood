import type { ReactNode } from "react";
import { SiteNav } from "../../components/site-nav";
import { SiteFooter } from "../../components/site-footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteNav />
      {children}
      <SiteFooter />
    </>
  );
}

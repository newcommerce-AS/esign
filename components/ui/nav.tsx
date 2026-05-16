import Link from "next/link";
import { Logo, Icon } from "./icons";
import { Button } from "./button";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-10 h-16 border-b border-border bg-bg flex items-center justify-between px-5 md:px-12">
      <Link href="/" aria-label="esign forsiden">
        <Logo size={16} />
      </Link>
      <nav className="hidden md:flex items-center gap-7 text-sm text-fg-muted">
        <a href="/#hvordan" className="hover:text-fg transition-colors">Hvordan</a>
        <a href="/#tillit" className="hover:text-fg transition-colors">Tillit</a>
        <a href="/#faq" className="hover:text-fg transition-colors">FAQ</a>
        <a href="/#api" className="hover:text-fg transition-colors">API &amp; MCP</a>
        <a href="https://github.com/newcommerce-no/esign" target="_blank" rel="noopener noreferrer" className="hover:text-fg transition-colors flex items-center gap-1">
          GitHub <Icon name="external" size={12} />
        </a>
        <Button size="sm" variant="secondary" iconRight="arrow" as="a" href="/#start">
          Start signering
        </Button>
      </nav>
      {/* Mobile: simplified */}
      <a href="/#start" className="md:hidden">
        <Button size="sm" variant="primary">Start</Button>
      </a>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg py-8 px-5 md:px-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo size={14} />
          <span className="text-xs text-fg-faint font-mono">© 2026 newcommerce.no</span>
        </div>
        <nav className="flex gap-5 text-sm text-fg-muted flex-wrap">
          <a href="#" className="hover:text-fg transition-colors">Spesifikasjon</a>
          <a href="https://github.com/newcommerce-no/esign" target="_blank" rel="noopener noreferrer" className="hover:text-fg transition-colors flex items-center gap-1">
            GitHub <Icon name="external" size={11} />
          </a>
          <a href="mailto:hei@newcommerce.no" className="hover:text-fg transition-colors">hei@newcommerce.no</a>
        </nav>
      </div>
    </footer>
  );
}

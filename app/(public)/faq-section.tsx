import { FAQ_PLAIN } from "@/lib/faq";
import { Icon } from "@/components/ui/icons";

export function FAQSection() {
  return (
    <section
      id="faq"
      itemScope itemType="https://schema.org/FAQPage"
      className="py-16 md:py-22 px-5 md:px-12 border-b border-border bg-surface"
    >
      <div className="max-w-6xl mx-auto grid md:grid-cols-[320px_1fr] gap-12 md:gap-14 items-start">
        <div className="md:sticky md:top-24">
          <div className="inline-flex items-center gap-2.5 font-mono text-xs text-fg-muted mb-4 uppercase tracking-wider">
            <span className="w-6 text-right">04</span>
            <span className="w-6 h-px bg-fg-muted" />
            <span>Vanlige spørsmål</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-balance leading-tight">
            Klart svar på det folk lurer på.
          </h2>
          <p className="text-fg-muted text-sm md:text-base leading-relaxed mb-5">
            Spør oss om noe vi ikke har svart på her — vi oppdaterer denne listen når det dukker opp.
          </p>
          <a href="mailto:hei@newcommerce.no" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors">
            <Icon name="mail" size={14} /> hei@newcommerce.no
          </a>
        </div>

        <div>
          {FAQ_PLAIN.map((item, i) => (
            <details
              key={i}
              itemScope itemProp="mainEntity" itemType="https://schema.org/Question"
              className="border-b border-border group"
              open={i < 3}
            >
              <summary
                itemProp="name"
                className="flex items-start gap-4 py-5 cursor-pointer list-none select-none text-fg font-[inherit]"
              >
                <span className="shrink-0 text-xs font-mono text-fg-faint mt-0.5 tracking-wider min-w-[22px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-base md:text-lg font-medium tracking-tight leading-snug">{item.q}</span>
                <span className="shrink-0 mt-1 text-fg-muted transition-transform duration-200 group-open:rotate-45">
                  <Icon name="plus" size={16} />
                </span>
              </summary>
              <div
                itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer"
                className="pl-10 pr-8 pb-5 text-sm md:text-base leading-relaxed text-fg-muted max-w-3xl"
              >
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export interface FAQItem {
  q: string;
  a: string;
}

export const FAQ_PLAIN: FAQItem[] = [
  {
    q: "Hva er en elektronisk signatur, og hvordan skiller den seg fra en digital signatur?",
    a: "En elektronisk signatur er enhver elektronisk handling som uttrykker samtykke til et dokument. esign tilbyr Standard elektronisk signatur (SES) under eIDAS-forordningen. En digital signatur er en spesifikk kryptografisk teknikk som kan brukes til å produsere en kvalifisert elektronisk signatur (QES), som BankID-baserte tjenester.",
  },
  {
    q: "Er en signatur fra esign juridisk bindende i Norge?",
    a: "Ja, for de aller fleste forretningsavtaler. Standard elektronisk signatur er tilstrekkelig for kommersielle avtaler, NDA-er, fakturagrunnlag og samtykkeerklæringer. Hver signering inkluderer e-post-verifisering, IP-fangst, SHA-256-hash av dokumentet, valgfri SMS-verifisering og et komplett audit-spor.",
  },
  {
    q: "Når trenger jeg BankID i stedet for esign?",
    a: "Bruk en BankID-basert tjeneste når loven krever kvalifisert elektronisk signatur. Det gjelder typisk arbeidskontrakter, eiendomstransaksjoner, låneavtaler og testament. esign er ikke ment for disse.",
  },
  {
    q: "Hva koster det å bruke esign?",
    a: "Gratis. Det er ingen betalingsplaner, ingen prøveperiode, ingen kortinformasjon. Vi rate-limiter til 5 oppdrag per time per IP for å hindre misbruk.",
  },
  {
    q: "Trenger signantene en konto for å signere?",
    a: "Nei. Signanten får en lenke på e-post, klikker den, leser dokumentet, skriver navnet sitt og bekrefter samtykket. Det opprettes ingen konto noe sted.",
  },
  {
    q: "Hvilke filtyper kan jeg signere?",
    a: "PDF, Markdown (.md) og ren tekst (.txt). Markdown og tekst rendres til PDF på vår side med faste typografiske regler. Maksimal filstørrelse er 10 MB.",
  },
  {
    q: "Hvordan vet jeg at dokumentet ikke har blitt endret etter signering?",
    a: "Vi beregner en SHA-256-hash av det rendrede dokumentet før signantene får se det, og inkluderer hashen i invitasjons-e-posten, signeringssiden, audit-sporet og som metadata i den endelige PDF-en. Enhver endring ville produsert en helt annen hash.",
  },
  {
    q: "Hvor lenge oppbevarer dere dokumentet?",
    a: "Vi lagrer aldri det signerte dokumentet på våre servere. Når alle har signert, sender vi den ferdige PDFen med audit-sertifikat til signantenes e-post, og deretter sletter vi alle data fra oss umiddelbart. Behold e-posten din — den er originalen.",
  },
  {
    q: "Kan AI-agenter opprette signeringsoppdrag på mine vegne?",
    a: "Ja. esign har en åpen REST-API og en MCP-server (@newcommerce/esign-mcp) som lar Claude eller andre AI-agenter opprette signeringsoppdrag, sjekke status og kansellere oppdrag direkte.",
  },
  {
    q: "Kan jeg avbryte et signeringsoppdrag som er sendt ut?",
    a: "Ja. Åpne statussiden for oppdraget og klikk Avbryt oppdraget. Signantene som ikke allerede har signert blir varslet. Allerede registrerte signaturer beholdes i audit-sporet.",
  },
];

export const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_PLAIN.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

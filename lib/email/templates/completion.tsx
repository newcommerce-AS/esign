import { Html, Head, Body, Container, Heading, Text } from "@react-email/components";

export function CompletionEmail({ recipientName, documentName, allSigners }: {
  recipientName: string; documentName: string; allSigners: string[];
}) {
  return (
    <Html><Head /><Body style={{ fontFamily: "system-ui, sans-serif" }}>
      <Container>
        <Heading>Dokumentet er signert</Heading>
        <Text>Hei {recipientName},</Text>
        <Text><b>{documentName}</b> er nå signert av alle parter: {allSigners.join(", ")}.</Text>
        <Text>Den endelige signerte PDFen ligger som vedlegg.</Text>
        <Text style={{ fontSize: 12, color: "#666" }}>Vi sletter dokumentet fra våre servere om 90 dager. Behold denne kopien.</Text>
      </Container>
    </Body></Html>
  );
}

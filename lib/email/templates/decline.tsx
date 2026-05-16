import { Html, Head, Body, Container, Heading, Text } from "@react-email/components";

export function DeclineEmail({ recipientName, documentName, declinerName, reason }: {
  recipientName: string; documentName: string; declinerName: string; reason: string;
}) {
  return (
    <Html><Head /><Body style={{ fontFamily: "system-ui, sans-serif" }}>
      <Container>
        <Heading>Signeringsoppdrag avbrutt</Heading>
        <Text>Hei {recipientName},</Text>
        <Text>{declinerName} har avvist å signere <b>{documentName}</b>.</Text>
        <Text>Begrunnelse: <i>{reason}</i></Text>
        <Text>Oppdraget er kansellert. Du må opprette et nytt hvis dere blir enige.</Text>
      </Container>
    </Body></Html>
  );
}

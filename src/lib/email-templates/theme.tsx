import * as React from "react";
import { Body, Container, Head, Heading, Hr, Html, Link, Section, Text } from "@react-email/components";

/** GalleyHQ email brand tokens — "Ink & Signal" (email-safe hex equivalents). */
export const brand = {
  name: "GalleyHQ",
  url: "https://galleyhq.com",
  supportEmail: "support@galleyhq.com",
  ink: "#16233d",
  inkSoft: "#4c5772",
  amber: "#f0a338",
  border: "#e3e6ee",
  muted: "#8a90a2",
};

export const styles = {
  main: { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif", margin: "0" },
  container: {
    maxWidth: "520px",
    margin: "0 auto",
    padding: "32px 28px 40px",
  },
  wordmark: {
    fontSize: "18px",
    fontWeight: "bold" as const,
    letterSpacing: "-0.02em",
    color: brand.ink,
    textDecoration: "none",
  },
  rule: { borderColor: brand.border, margin: "20px 0 28px" },
  h1: {
    fontSize: "23px",
    fontWeight: "bold" as const,
    letterSpacing: "-0.02em",
    color: brand.ink,
    margin: "0 0 18px",
  },
  text: { fontSize: "15px", color: brand.inkSoft, lineHeight: "1.6", margin: "0 0 20px" },
  button: {
    display: "inline-block",
    backgroundColor: brand.ink,
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "bold" as const,
    borderRadius: "10px",
    padding: "13px 24px",
    textDecoration: "none",
  },
  code: {
    display: "inline-block",
    fontFamily: "monospace",
    fontSize: "26px",
    letterSpacing: "0.18em",
    color: brand.ink,
    backgroundColor: "#f5f6fa",
    border: `1px solid ${brand.border}`,
    borderRadius: "10px",
    padding: "14px 20px",
  },
  link: { color: brand.ink, textDecoration: "underline" },
  footer: { fontSize: "12px", color: brand.muted, lineHeight: "1.6", margin: "28px 0 0" },
  accentBar: { height: "3px", backgroundColor: brand.amber, borderRadius: "3px", width: "44px", margin: "0 0 22px" },
};

export const EmailShell = ({
  preview,
  children,
}: {
  preview: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Html lang="en" dir="ltr">
    <Head />
    {preview}
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Link href={brand.url} style={styles.wordmark}>
          {brand.name}
        </Link>
        <Hr style={styles.rule} />
        <Section style={styles.accentBar} />
        {children}
        <Text style={styles.footer}>
          Need help? Email us at{" "}
          <Link href={`mailto:${brand.supportEmail}`} style={styles.link}>
            {brand.supportEmail}
          </Link>
          .
          <br />
          {brand.name} — social content workflow for agencies.
        </Text>
      </Container>
    </Body>
  </Html>
);

export { Heading, Text, Link };

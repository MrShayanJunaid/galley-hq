import * as React from "react";
import { Button, Heading, Preview, Text } from "@react-email/components";

import { EmailShell, styles } from "./theme";

interface MagicLinkEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <EmailShell preview={<Preview>Your {siteName} sign-in link</Preview>}>
    <Heading style={styles.h1}>Your sign-in link</Heading>
    <Text style={styles.text}>
      Click below to sign in to {siteName}. This link expires shortly and can only be used once.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Sign in to {siteName}
    </Button>
    <Text style={{ ...styles.text, margin: "26px 0 0" }}>
      If you didn&apos;t request this link, no action is needed.
    </Text>
  </EmailShell>
);

export default MagicLinkEmail;

import * as React from "react";
import { Button, Heading, Preview, Text } from "@react-email/components";

import { EmailShell, styles } from "./theme";

interface RecoveryEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <EmailShell preview={<Preview>Reset your {siteName} password</Preview>}>
    <Heading style={styles.h1}>Reset your password</Heading>
    <Text style={styles.text}>
      We received a request to reset the password for your {siteName} account. Choose a new password
      using the link below.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Reset password
    </Button>
    <Text style={{ ...styles.text, margin: "26px 0 0" }}>
      If you didn&apos;t request a reset, your password remains unchanged.
    </Text>
  </EmailShell>
);

export default RecoveryEmail;

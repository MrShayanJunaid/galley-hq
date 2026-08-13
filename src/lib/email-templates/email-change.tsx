import * as React from "react";
import { Button, Heading, Preview, Text } from "@react-email/components";

import { EmailShell, styles } from "./theme";

interface EmailChangeEmailProps {
  siteName: string;
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string;
  email: string;
  newEmail: string;
  confirmationUrl: string;
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailShell preview={<Preview>Confirm your new {siteName} email address</Preview>}>
    <Heading style={styles.h1}>Confirm your new email address</Heading>
    <Text style={styles.text}>
      You asked to change the email on your {siteName} account from{" "}
      <strong>{oldEmail}</strong> to <strong>{newEmail}</strong>.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Confirm email change
    </Button>
    <Text style={{ ...styles.text, margin: "26px 0 0" }}>
      If you didn&apos;t request this change, contact us right away.
    </Text>
  </EmailShell>
);

export default EmailChangeEmail;

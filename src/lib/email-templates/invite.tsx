import * as React from "react";
import { Button, Heading, Preview, Text } from "@react-email/components";

import { EmailShell, styles } from "./theme";

interface InviteEmailProps {
  siteName: string;
  siteUrl: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <EmailShell preview={<Preview>You&apos;ve been invited to a {siteName} workspace</Preview>}>
    <Heading style={styles.h1}>You&apos;ve been invited to {siteName}</Heading>
    <Text style={styles.text}>
      A teammate invited you to collaborate on their {siteName} workspace. Accept the invitation to
      set up your account.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Accept invitation
    </Button>
    <Text style={{ ...styles.text, margin: "26px 0 0" }}>
      If you weren&apos;t expecting this invitation, you can ignore this email.
    </Text>
  </EmailShell>
);

export default InviteEmail;

import * as React from "react";
import { Button, Heading, Link, Preview, Text } from "@react-email/components";

import { EmailShell, styles } from "./theme";

interface SignupEmailProps {
  siteName: string;
  siteUrl: string;
  recipient: string;
  confirmationUrl: string;
}

export const SignupEmail = ({ siteName, recipient, confirmationUrl }: SignupEmailProps) => (
  <EmailShell preview={<Preview>Verify your {siteName} account</Preview>}>
    <Heading style={styles.h1}>Verify your {siteName} account</Heading>
    <Text style={styles.text}>
      Thanks for signing up. Confirm{" "}
      <Link href={`mailto:${recipient}`} style={styles.link}>
        {recipient}
      </Link>{" "}
      to activate your workspace.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Verify email address
    </Button>
    <Text style={{ ...styles.text, margin: "26px 0 0" }}>
      If you didn&apos;t create an account, you can safely ignore this email.
    </Text>
  </EmailShell>
);

export default SignupEmail;

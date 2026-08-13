import * as React from "react";
import { Heading, Preview, Text } from "@react-email/components";

import { brand, EmailShell, styles } from "./theme";

interface ReauthenticationEmailProps {
  token: string;
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailShell preview={<Preview>Your {brand.name} verification code</Preview>}>
    <Heading style={styles.h1}>Your verification code</Heading>
    <Text style={styles.text}>
      Enter this code in {brand.name} to confirm it&apos;s really you:
    </Text>
    <Text style={styles.code}>{token}</Text>
    <Text style={{ ...styles.text, margin: "26px 0 0" }}>
      The code expires in a few minutes. If you didn&apos;t request it, you can ignore this email.
    </Text>
  </EmailShell>
);

export default ReauthenticationEmail;

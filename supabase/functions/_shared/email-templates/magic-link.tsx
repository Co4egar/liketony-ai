/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  token: string
}

export const MagicLinkEmail = ({ token }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code: {token}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={codeStyle}>{token}</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '40px 25px', textAlign: 'center' as const }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '36px',
  fontWeight: 'bold' as const,
  color: '#000000',
  letterSpacing: '8px',
  margin: '0',
}

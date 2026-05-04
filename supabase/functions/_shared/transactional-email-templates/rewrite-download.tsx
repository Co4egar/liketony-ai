import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  downloadUrl?: string
  sourceUrl?: string
  personaName?: string
}

export function RewriteDownloadEmail({
  downloadUrl = 'https://example.com',
  sourceUrl = 'example.com',
  personaName = 'Tony',
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>Your rewritten landing page is ready to download</Preview>
      <Body style={{ backgroundColor: '#0b0b0c', fontFamily: 'Inter, sans-serif', margin: 0, padding: '32px 0' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', backgroundColor: '#141416', borderRadius: 16, padding: 36, color: '#f5f5f7' }}>
          <Heading style={{ fontSize: 26, margin: 0, color: '#ffffff' }}>
            Your rewrite is ready 🎉
          </Heading>
          <Text style={{ fontSize: 15, lineHeight: 1.6, color: '#c7c7cf', marginTop: 14 }}>
            Thanks for your purchase! <strong style={{ color: '#fff' }}>{personaName}</strong> just rewrote{' '}
            <strong style={{ color: '#fff' }}>{sourceUrl}</strong> in their voice.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button
              href={downloadUrl}
              style={{
                backgroundColor: '#ff5a36',
                color: '#fff',
                padding: '14px 28px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Download HTML
            </Button>
          </Section>
          <Text style={{ fontSize: 13, color: '#8a8a93', textAlign: 'center' }}>
            Or copy this link:<br />
            <a href={downloadUrl} style={{ color: '#ff8a72', wordBreak: 'break-all' }}>{downloadUrl}</a>
          </Text>
          <Hr style={{ borderColor: '#26262a', margin: '28px 0 18px' }} />
          <Text style={{ fontSize: 12, color: '#6c6c75', textAlign: 'center', margin: 0 }}>
            LikeTony.ai · Your landing, in their voice.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RewriteDownloadEmail,
  subject: 'Your LikeTony.ai rewrite is ready to download',
  displayName: 'Rewrite Download',
  previewData: {
    downloadUrl: 'https://example.com/download',
    sourceUrl: 'example.com',
    personaName: 'Hormozi',
  },
} satisfies TemplateEntry

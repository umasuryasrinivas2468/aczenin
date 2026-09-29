/*
  /nova-api/docs/authentication — bearer keys: format, creation, revocation
  and the 401. Facts checked against src/lib/nova/apiKeys.ts (key shape) and
  app/nova-api/v1/[...path]/route.ts (401 body and WWW-Authenticate).
*/

// Metadata type for the tab title.
import type { Metadata } from "next";
// Client-side link to the keys page inside the shell.
import Link from "next/link";

// Shared docs blocks.
import { CodeBlock } from "@/components/nova/docs/CodeBlock";
import { C, Callout, DocsArticle, DocsHeader, DocsPager, DocsSection, P } from "@/components/nova/docs/primitives";
// Constants shared by every docs page.
import { BASE_URL, DOCS_ROOT, KEYS_PAGE, SAMPLE_KEY, curl, json, pagerFor } from "@/components/nova/docs/content";
// The real prefix constant, so the docs cannot advertise a different one.
import { API_KEY_PREFIX } from "@/lib/nova/apiKeys";
// The dashboard's own active-key cap, so the docs state the limit it enforces.
import { MAX_ACTIVE_KEYS } from "@/app/nova-api/(portal)/dashboard/keys";

// "Authentication | Nova API".
export const metadata: Metadata = { title: "Authentication" };

// The exact 401 body route.ts sends; request_id varies per call.
const UNAUTHORIZED = json({
  error: {
    type: "authentication_error",
    code: "invalid_api_key",
    message: `Missing or invalid API key. Send 'Authorization: Bearer ${API_KEY_PREFIX}...'.`,
  },
  request_id: "7d0f3c2a-9b1e-4c55-8a3f-2e6b1d9c4f10",
});

// Class for inline links in prose, kept in one place for consistency.
const LINK = "font-medium text-foreground underline underline-offset-4 hover:decoration-primary";

export default function NovaDocsAuthenticationPage() {
  // Bottom pager neighbours.
  const pager = pagerFor(`${DOCS_ROOT}/authentication`);
  return (
    <DocsArticle>
      {/* Page header. */}
      <DocsHeader
        eyebrow="Guides"
        title="Authentication"
        lead={
          <>
            Every endpoint except <C>/health</C> needs an API key, sent as a bearer token in the <C>Authorization</C>{" "}
            header.
          </>
        }
      />

      {/* The header format, plus a full request. */}
      <DocsSection id="bearer" title="Sending your key">
        <P>
          Keys start with <C>{API_KEY_PREFIX}</C> followed by 43 random characters. The scheme word <C>Bearer</C> is
          case-insensitive; the key itself is not.
        </P>
        <CodeBlock title="Header" code={`Authorization: Bearer ${API_KEY_PREFIX}...`} copyable={false} />
        <CodeBlock title="cURL" code={curl("me")} />
        <Callout tone="warning" title="Keep keys server-side">
          A key in browser or mobile code is a key anyone can copy. Call Nova from your backend and keep the key in an
          environment variable. The recognisable <C>{API_KEY_PREFIX}</C> prefix lets secret scanners flag a key that
          leaks into a repository.
        </Callout>
      </DocsSection>

      {/* Creation: where and the show-once rule. */}
      <DocsSection id="creating-keys" title="Creating a key">
        <P>
          Create keys on the{" "}
          <Link href={KEYS_PAGE} className={LINK}>
            API keys page
          </Link>
          . Each account can hold {MAX_ACTIVE_KEYS === 1 ? "one active key" : `${MAX_ACTIVE_KEYS} active keys`} at a
          time; to rotate, revoke the current key and create a new one. Name it after where it runs, such as{" "}
          <C>staging-worker</C>.
        </P>
        <Callout tone="tip" title="The full key is shown once">
          Nova stores only a SHA-256 hash of the key, never the key itself, so it cannot show it to you again. Copy it
          when it appears. If you lose it, revoke it and create a new one. The dashboard keeps the first 16
          characters (the prefix) so you can tell keys apart.
        </Callout>
        <P>
          To check which key a service is using, call <C>/me</C>. It returns the key&apos;s id, name, prefix, owner
          email, rate limit and creation time, plus your <C>team_slot</C> and <C>dataset_slice</C> (which slice of the
          sandbox your team reads). It never returns the secret.
        </P>
      </DocsSection>

      {/* Revocation semantics. */}
      <DocsSection id="revoking-keys" title="Revoking a key">
        <P>
          Revoke a key from the same page. Keys are checked on every request, so the next call made with a revoked key
          gets a 401; there is no cache to wait out. Revocation cannot be undone: create a new key instead.
        </P>
      </DocsSection>

      {/* The 401: one answer for every failure mode. */}
      <DocsSection id="unauthorized" title="401 responses">
        <P>
          A missing header, a malformed or unknown key, a revoked key and a key whose owner has lost access all get the
          same response. That is deliberate: the API does not tell a caller which of those it was.
        </P>
        <CodeBlock title={`cURL · no key`} code={`curl -i ${BASE_URL}/invoices`} />
        <CodeBlock
          title="Response 401"
          copyable={false}
          code={`HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer realm="nova-api"\nContent-Type: application/json\n\n${UNAUTHORIZED}`}
        />
        <Callout tone="info" title="Getting a 401 with a key you just created?">
          Check the base URL first. A request to <C>aczen.in</C> without <C>www</C> is redirected, and the redirect
          strips the <C>Authorization</C> header before it reaches Nova. Also check for whitespace or a line break
          pasted into the key: the example uses <C>{SAMPLE_KEY}</C> as a placeholder.
        </Callout>
      </DocsSection>

      {/* Pager. */}
      <DocsPager {...pager} />
    </DocsArticle>
  );
}

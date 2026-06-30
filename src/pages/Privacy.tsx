import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="font-display text-3xl mb-2">Alice Daily Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Effective date: June 18, 2026</p>

        <div className="space-y-6 text-[15px] leading-relaxed text-foreground">
          <section>
            <p><strong>Operator:</strong> Alice Daily</p>
            <p><strong>Website:</strong> <a className="underline" href="https://alicedaily.org">https://alicedaily.org</a></p>
            <p><strong>Contact:</strong> <a className="underline" href="mailto:alicearcadegg@gmail.com">alicearcadegg@gmail.com</a></p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">1. Overview</h2>
            <p>This Privacy Policy describes how Shisa Sorasivisut ("we", "us") handles information when you use Alice Daily (the "Service").</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">2. Information we do not collect</h2>
            <p><strong>We do not request, collect, or store your wallet private keys, seed phrases, or recovery phrases.</strong> Signing and approval flows are handled by your chosen wallet app; we do not receive your secret credentials.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">3. News and content usage</h2>
            <p>The Service displays news articles, summaries, feeds, and related metadata from third-party sources. When you read content, your device may request data from our servers and/or third-party APIs (for example, to load articles or translations). We do not require an account to browse news in the web app.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">4. Saved articles and local preferences</h2>
            <p>Saved articles, bookmarks, read-state, language preference, topic filters, and similar settings may be stored locally on your device (for example, in browser or app storage). This data is used to personalize your experience and is not sold. If you clear app or browser storage, local data may be removed.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">5. Wallet connection and public addresses</h2>
            <p>If you use wallet features in the mobile app, you may connect a wallet through your chosen wallet software. When connected, the Service may access your public wallet address and related public on-chain information (such as balances) to display wallet tools. Connection state may be stored locally on your device.</p>
            <p className="mt-2">When you approve a transaction or message signature, the request is sent to your wallet app. We do not control your wallet's handling of that data.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">6. Backend and API services</h2>
            <p>The Service may use backend and third-party API services to fetch news content, narratives, or related features. Requests to these services may include standard technical information such as IP address, device/browser type, and timestamps, as handled by those providers and our infrastructure.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">7. Third-party services and external links</h2>
            <p>The Service may link to original publishers, wallet apps, and other third parties. Their privacy practices apply when you interact with them. We are not responsible for third-party data handling.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">8. Analytics and diagnostics</h2>
            <p>We may use basic technical logs or diagnostics to operate, secure, and improve the Service.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">9. Children</h2>
            <p>The Service is not directed to children under 13 (or the minimum age required in your jurisdiction). We do not knowingly collect personal information from children.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">10. Changes</h2>
            <p>We may update this Privacy Policy from time to time. The updated effective date will be posted in this document.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">11. Contact</h2>
            <p>Privacy questions or requests: <a className="underline" href="mailto:alicearcadegg@gmail.com">alicearcadegg@gmail.com</a></p>
          </section>

          <section className="pt-6 border-t border-border">
            <Link to="/terms" className="underline text-sm">View Terms of Use</Link>
          </section>
        </div>
      </div>
    </div>
  );
}

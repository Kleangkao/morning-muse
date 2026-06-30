import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="font-display text-3xl mb-2">Alice Daily Terms of Use</h1>
        <p className="text-sm text-muted-foreground mb-8">Effective date: June 18, 2026</p>

        <div className="space-y-6 text-[15px] leading-relaxed text-foreground">
          <section>
            <p><strong>Publisher:</strong> Shisa Sorasivisut</p>
            <p><strong>Website:</strong> <a className="underline" href="https://fresh-start-news.lovable.app">https://fresh-start-news.lovable.app</a></p>
            <p><strong>Contact:</strong> <a className="underline" href="mailto:alicearcadegg@gmail.com">alicearcadegg@gmail.com</a></p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">1. Agreement</h2>
            <p>These Terms of Use ("Terms") govern your access to and use of Alice Daily (the "Service"). By using the Service, you agree to these Terms. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">2. Informational use only</h2>
            <p>The Service provides news headlines, summaries, curated feeds, and related informational tools across topics such as AI, crypto, investment, macro, technology, and commodities.</p>
            <p className="mt-2"><strong>The Service does not provide financial, investment, tax, or legal advice.</strong> Nothing in the Service is a recommendation to buy, sell, or hold any asset or security. You are solely responsible for your own research and decisions.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">3. Third-party content and links</h2>
            <p>Articles, summaries, and metadata may originate from third-party publishers, RSS feeds, APIs, or external websites. We do not control third-party content and are not responsible for its accuracy, completeness, timeliness, or availability. Links to external sites are provided for convenience; their terms and privacy practices apply when you leave the Service.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">4. Wallet and blockchain features</h2>
            <p>Optional wallet tools may be available in the mobile app, including wallet connection and transaction or message signing through your chosen wallet app.</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>We never request, collect, or store your private keys or seed phrases.</li>
              <li>You control whether to connect a wallet and whether to approve any signing prompt.</li>
              <li>Blockchain transactions are irreversible. You are solely responsible for reviewing transaction details, fees, network selection, and outcomes.</li>
              <li>Wallet providers and blockchain networks are third-party services; their availability and behavior are not guaranteed.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">5. No warranties</h2>
            <p>The Service is provided on an "as is" and "as available" basis. We do not guarantee accuracy, completeness, uptime, or any market, trading, or investment outcome.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">6. Your responsibilities</h2>
            <p>You agree to use the Service lawfully and not to misuse, disrupt, scrape, reverse engineer, or attempt to gain unauthorized access to the Service or related systems.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">7. Limitation of liability</h2>
            <p>To the fullest extent permitted by law, Shisa Sorasivisut and contributors will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, data, digital assets, or goodwill arising from your use of the Service.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">8. Changes</h2>
            <p>We may update these Terms from time to time. The updated effective date will be posted in this document. Continued use after changes means you accept the revised Terms.</p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">9. Contact</h2>
            <p>Questions about these Terms: <a className="underline" href="mailto:alicearcadegg@gmail.com">alicearcadegg@gmail.com</a></p>
          </section>

          <section className="pt-6 border-t border-border">
            <Link to="/privacy" className="underline text-sm">View Privacy Policy</Link>
          </section>
        </div>
      </div>
    </div>
  );
}

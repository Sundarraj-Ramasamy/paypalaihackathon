import { useMemo, useState } from 'react';

const defaultPrompt = `Draft a bill for 10 hours of consulting at $150/hr and a $500 setup fee for Alex Morgan, alex.morgan@example.com.`;
const samplePrompts = [
  'Create an invoice for 12 hours of UI design work at $90/hour for strategy@northstar.io',
  'Send a bill for the MVP build and launch support: 20 hours at $125/hr plus a $750 setup fee to hello@launchlabs.dev',
  'Bill Acme Studio for 5 website revisions and 2 QA rounds at $80/hour, invoice to finance@acmestudio.com',
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [text, setText] = useState(defaultPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const summary = useMemo(() => {
    if (!result?.parsedInvoice) return null;

    const recipient = result.parsedInvoice.primary_recipients?.[0]?.billing_info;
    const currency = result.parsedInvoice.detail?.currency_code || 'USD';
    const total = result.parsedInvoice.items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unit_amount?.value || 0);
    }, 0);

    return {
      client: `${recipient?.name?.given_name || 'Valued'} ${recipient?.name?.surname || 'Client'}`.trim(),
      email: recipient?.email_address || 'client@example.com',
      total: `${currency} ${total.toFixed(2)}`,
    };
  }, [result]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate invoice.');
      }

      setResult(payload);
    } catch (err) {
      setError(err.message || 'Something went wrong while generating the invoice.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-400">PayPal + AI</p>
          <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">Smart Invoice Generator</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
            Turn messy project notes into a polished, PayPal-ready invoice in seconds.
          </p>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/25 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">New invoice</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Describe the work</h2>
              </div>
              <button
                type="button"
                onClick={() => setText(defaultPrompt)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
              >
                Reset sample
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {samplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setText(prompt)}
                  className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
                >
                  Sample
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label htmlFor="invoice-text" className="block text-sm font-medium text-slate-200">
                Invoice request
              </label>

              <textarea
                id="invoice-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={12}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="Describe the project, hours, rate, and client email..."
              />

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                >
                  {isLoading ? 'Generating invoice...' : 'Generate & Send Invoice'}
                </button>

                <p className="text-xs text-slate-400">OpenAI parsing + PayPal Sandbox workflow</p>
              </div>
            </form>
          </section>

          <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-white">Result</h2>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            ) : result ? (
              <div className="mt-4 space-y-4 text-sm text-slate-300">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
                  {result.message}
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Invoice ID</p>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      {result.invoice?.status || 'Created'}
                    </span>
                  </div>
                  <p className="mt-2 break-all text-base font-medium text-white">{result.invoice?.id || 'N/A'}</p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Client</p>
                  <p className="mt-2 text-base font-medium text-white">{summary?.client || 'Valued Client'}</p>
                  <p className="mt-1 text-slate-300">{summary?.email || 'client@example.com'}</p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</p>
                  <p className="mt-2 text-xl font-semibold text-white">{summary?.total || 'USD 0.00'}</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">
                Your generated invoice details will appear here.
              </div>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}

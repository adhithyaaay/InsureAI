import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 text-white">
      {/* Background Glow */}
      <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex rounded-full border border-blue-500/40 bg-blue-500/10 px-5 py-2 text-sm text-blue-400">
          🚀 AI Decision Intelligence Platform
        </div>

        <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
          Smarter Insurance
          <br />
          <span className="text-blue-500">Underwriting with AI</span>
        </h1>

        <p className="mx-auto mt-8 max-w-3xl text-lg text-slate-400">
          Automate document verification, assess applicant risk,
          recommend premiums, detect fraud, and help underwriters
          make faster, explainable decisions.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/apply"
            className="rounded-xl bg-blue-600 px-7 py-3 font-semibold transition hover:bg-blue-700"
          >
            Get Started
          </Link>

          <button className="rounded-xl border border-slate-700 px-7 py-3 transition hover:bg-slate-900">
            Live Demo
          </button>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-3xl font-bold text-blue-500">95%</h2>
            <p className="mt-2 text-slate-400">Faster Decisions</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-3xl font-bold text-blue-500">80%</h2>
            <p className="mt-2 text-slate-400">Fraud Detection</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-3xl font-bold text-blue-500">5x</h2>
            <p className="mt-2 text-slate-400">Faster Underwriting</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-3xl font-bold text-blue-500">24/7</h2>
            <p className="mt-2 text-slate-400">AI Assistance</p>
          </div>
        </div>
      </div>
    </section>
  );
}
import { ShieldCheck } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-blue-500" />
          <h1 className="text-xl font-bold text-white">
            Insure<span className="text-blue-500">AI</span>
          </h1>
        </div>

        <div className="hidden gap-8 text-slate-300 md:flex">
          <a href="#" className="hover:text-white">Features</a>
          <a href="#" className="hover:text-white">Workflow</a>
          <a href="#" className="hover:text-white">Pricing</a>
          <a href="#" className="hover:text-white">Contact</a>
        </div>

        <button className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 transition">
          Login
        </button>
      </div>
    </nav>
  );
}
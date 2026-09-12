import { Link } from "react-router-dom";
import { ShieldCheck, LogOut, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 sm:px-8 py-4">
        <Link to="/" className="flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-blue-500" />
          <h1 className="text-xl font-bold text-white">
            Insure<span className="text-blue-500">AI</span>
          </h1>
        </Link>

        <div className="hidden gap-8 text-slate-300 md:flex text-sm font-medium">
          <Link to="/" className="hover:text-white transition">Home</Link>
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#workflow" className="hover:text-white transition">Workflow</a>
          {isAuthenticated && user?.role === "UNDERWRITER" && (
            <Link to="/underwriter" className="text-purple-400 hover:text-purple-300 font-semibold transition">
              Underwriter Queue
            </Link>
          )}
          {isAuthenticated && user?.role === "CUSTOMER" && (
            <Link to="/apply" className="text-blue-400 hover:text-blue-300 font-semibold transition">
              Apply for Policy
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end text-xs">
                <span className="font-semibold text-white flex items-center gap-1">
                  <User size={12} className="text-slate-400" />
                  {user.name}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    user.role === "UNDERWRITER"
                      ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                      : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                  }`}
                >
                  {user.role}
                </span>
              </div>

              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 text-xs font-medium transition"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-slate-300 hover:text-white text-sm font-medium px-3 py-1.5 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 transition shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
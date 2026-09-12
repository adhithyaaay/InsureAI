import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 text-slate-100">
      <div className="max-w-md w-full text-center bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>

        <h1 className="text-2xl font-extrabold text-white">403 — Access Denied</h1>
        <p className="text-sm text-slate-400 mt-2">
          You do not have the necessary permissions or role to view this restricted page.
        </p>

        {user && (
          <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono">
            Signed in as: <strong className="text-slate-200">{user.email}</strong>
            <br />
            Assigned Role: <span className="text-blue-400 font-bold">{user.role}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Link
            to={user?.role === "UNDERWRITER" ? "/underwriter" : "/apply"}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl transition text-sm shadow-md"
          >
            <ArrowLeft size={16} />
            Return to Authorized Portal
          </Link>
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Go to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { ShieldCheck, Vote, CheckCircle2, Lock } from "lucide-react";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";

export default function App() {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem("verifivote_user");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const [showAuth, setShowAuth] = useState(false);

    function handleLogin(loggedInUser) {
        localStorage.setItem("verifivote_user", JSON.stringify(loggedInUser));
        setUser(loggedInUser);
        setShowAuth(false);
    }

    function handleLogout() {
        localStorage.removeItem("verifivote_token");
        localStorage.removeItem("verifivote_user");
        setUser(null);
        setShowAuth(false);
    }

    // Authenticated → show dashboard
    if (user) {
        return <Dashboard user={user} onLogout={handleLogout} />;
    }

    // Auth form
    if (showAuth) {
        return <Auth onLogin={handleLogin} onBack={() => setShowAuth(false)} />;
    }

    // Landing page
    return (
        <div className="min-h-screen bg-slate-50">

            {/* Nav */}
            <nav className="border-b bg-white px-5 py-4">
                <div className="mx-auto flex max-w-5xl items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-brand-600 p-1.5 text-white">
                            <Vote size={18} />
                        </div>
                        <span className="font-bold text-lg">VerifiVote</span>
                    </div>
                    <button
                        onClick={() => setShowAuth(true)}
                        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                        Login / Register
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <section className="mx-auto max-w-5xl px-5 py-20 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
                    <Vote size={40} />
                </div>

                <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
                    VerifiVote
                </h1>

                <p className="mt-3 text-lg font-medium text-brand-600">
                    Blind Signature-Based Anonymous & Verifiable E-Voting
                </p>

                <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-600">
                    A Cryptography & Network Security academic project demonstrating how
                    <strong className="text-slate-800"> RSA blind signatures</strong> can decouple
                    voter identity from the ballot — allowing anonymous yet verifiable electronic
                    voting.
                </p>

                <button
                    onClick={() => setShowAuth(true)}
                    className="mt-8 rounded-xl bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-brand-700"
                >
                    Get Started
                </button>

                <p className="mt-4 text-xs text-slate-400">
                    Academic demonstration — not intended for real elections.
                </p>
            </section>

            {/* How it works */}
            <section className="border-y bg-white px-5 py-16">
                <div className="mx-auto max-w-5xl">
                    <h2 className="mb-2 text-center text-2xl font-bold">How the Protocol Works</h2>
                    <p className="mb-10 text-center text-sm text-slate-500">
                        Three phases — your identity is never attached to your ballot.
                    </p>

                    <div className="grid gap-6 sm:grid-cols-3">
                        {[
                            {
                                step: "01",
                                icon: <Lock size={24} />,
                                title: "Authentication",
                                desc: "Voter logs in with email + password. A JWT is issued to prove eligibility.",
                                color: "bg-indigo-100 text-indigo-700"
                            },
                            {
                                step: "02",
                                icon: <ShieldCheck size={24} />,
                                title: "Blind Authorization",
                                desc: "The voter blinds a random token using the authority's public RSA key and sends it for signing. The authority signs without seeing the token.",
                                color: "bg-emerald-100 text-emerald-700"
                            },
                            {
                                step: "03",
                                icon: <CheckCircle2 size={24} />,
                                title: "Anonymous Vote",
                                desc: "The voter unblinds the signature locally and casts the ballot — no JWT, no identity. The server verifies the signature and stores only a hash of the token.",
                                color: "bg-amber-100 text-amber-700"
                            }
                        ].map(({ step, icon, title, desc, color }) => (
                            <div key={step} className="rounded-2xl border bg-slate-50 p-6">
                                <div className={`mb-4 inline-flex items-center justify-center rounded-xl p-3 ${color}`}>
                                    {icon}
                                </div>
                                <p className="text-xs font-bold text-slate-400 mb-1">STEP {step}</p>
                                <h3 className="font-bold text-lg">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Privacy property */}
            <section className="mx-auto max-w-5xl px-5 py-16">
                <div className="rounded-2xl bg-brand-900 p-8 text-white">
                    <h2 className="text-xl font-bold">Key Privacy Property</h2>
                    <p className="mt-3 leading-7 text-indigo-200">
                        The <strong className="text-white">Authorization collection</strong> links{" "}
                        <code className="rounded bg-white/10 px-1">voterId → electionId</code> (who is authorized).
                        The <strong className="text-white">Vote collection</strong> links{" "}
                        <code className="rounded bg-white/10 px-1">tokenHash → candidateId</code> (what was voted).
                        These two cannot be joined — demonstrating the unlinking property of blind signatures.
                    </p>
                    <p className="mt-4 text-sm text-indigo-300">
                        ⚠ Educational disclaimer: This uses textbook RSA without production-grade padding
                        or key management. It demonstrates the concept only.
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-6 text-center text-xs text-slate-400">
                VerifiVote — Cryptography &amp; Network Security Academic Project &nbsp;|&nbsp;
                Educational Prototype Only
            </footer>
        </div>
    );
}
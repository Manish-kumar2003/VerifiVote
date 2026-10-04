import { useState } from "react";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";

export default function App() {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("verifivote_user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [showAuth, setShowAuth] = useState(false);

    function handleLogin(loggedInUser) {
        localStorage.setItem(
            "verifivote_user",
            JSON.stringify(loggedInUser)
        );
        setUser(loggedInUser);
        setShowAuth(false);
    }

    function handleLogout() {
        localStorage.removeItem("verifivote_token");
        localStorage.removeItem("verifivote_user");
        setUser(null);
        setShowAuth(false);
    }

    if(user) {
        return (
            <Dashboard
                user={user}
                onLogout={handleLogout}
            />
        );
    }

    if(showAuth) {
        return (
            <Auth
                onLogin={handleLogin}
                onBack={() => setShowAuth(false)}
            />
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-5 text-center">

            <div className="rounded-2xl bg-brand-600 p-4 text-white">
                <span className="text-3xl font-bold">V</span>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold">
                VerifiVote
            </h1>

            <p className="mt-4 max-w-lg leading-7 text-slate-600">
                An educational blind signature-based anonymous
                and verifiable electronic voting prototype.
            </p>

            <button
                onClick={() => setShowAuth(true)}
                className="mt-8 rounded-xl bg-brand-600 px-8 py-3 font-semibold text-white hover:bg-brand-700"
            >
                Login / Register
            </button>

            <p className="mt-6 text-xs text-slate-400">
                Academic demonstration — not intended for real elections.
            </p>
        </div>
    );
}
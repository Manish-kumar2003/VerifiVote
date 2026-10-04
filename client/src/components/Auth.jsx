import { useState } from "react";
import api from "../api";

export default function Auth({ onLogin, onBack }) {
    const [mode, setMode] = useState("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        try {
            if(mode === "register") {
                await api.post("/auth/register", {
                    name,
                    email,
                    password,
                });

                setMessage("Registration successful. Please log in.");
                setMode("login");
                setPassword("");

            } else {
                const response = await api.post("/auth/login", {
                    email,
                    password,
                });

                const token = response.data.token;
                const user = response.data.user;

                if(!token || !user) {
                    throw new Error(
                        "Login response is missing the token or user."
                    );
                }
                localStorage.setItem("verifivote_token", token);
                onLogin(user);
            }

        } catch(err) {
            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                "Something went wrong."
            );

        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">

            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">

                <button
                    onClick={onBack}
                    className="mb-6 text-sm font-medium text-brand-600 hover:underline"
                >
                    ← Back to home
                </button>

                <h1 className="text-3xl font-bold">
                    {mode === "login" ? "Welcome back" : "Create account"}
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    {mode === "login"
                        ? "Log in to access your VerifiVote workspace."
                        : "Register as a voter in the demonstration system."}
                </p>

                {error && (
                    <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">

                    {mode === "register" && (
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Full name
                            </label>

                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                minLength={2}
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                                placeholder="Your name"
                            />
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Email address
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                            placeholder="At least 8 characters"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                        {loading
                            ? "Please wait..."
                            : mode === "login"
                                ? "Login"
                                : "Create account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-600">
                    {mode === "login"
                        ? "Don't have an account?"
                        : "Already registered?"}

                    <button
                        onClick={() => {
                            setMode(mode === "login" ? "register" : "login");
                            setError("");
                            setMessage("");
                        }}
                        className="ml-2 font-semibold text-brand-600 hover:underline"
                    >
                        {mode === "login" ? "Register" : "Login"}
                    </button>
                </p>
            </div>
        </div>
    );
}
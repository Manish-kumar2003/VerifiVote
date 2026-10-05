/**
 * ElectionResults.jsx
 *
 * Displays election results using a horizontal bar chart (Recharts).
 * Shows candidate name, party, vote count, and percentage.
 *
 * Only available to:
 *   - Admin: at any time
 *   - Voter: only after election is closed
 */

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import { Trophy, X } from "lucide-react";

// Palette for candidate bars
const COLORS = [
    "#4f46e5", "#0891b2", "#059669", "#d97706",
    "#dc2626", "#7c3aed", "#db2777", "#0284c7"
];

export default function ElectionResults({ results, onClose }) {
    if (!results) return null;

    const { election: title, totalVotes, candidates } = results;

    // Sort by votes descending
    const sorted = [...candidates].sort((a, b) => b.votes - a.votes);

    const chartData = sorted.map((c) => ({
        name: c.name,
        party: c.party || "Independent",
        votes: c.votes,
        pct: totalVotes > 0
            ? ((c.votes / totalVotes) * 100).toFixed(1)
            : "0.0"
    }));

    const winner = sorted[0];

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        return (
            <div className="rounded-lg border bg-white p-3 shadow-lg text-sm">
                <p className="font-semibold">{d.name}</p>
                <p className="text-slate-500">{d.party}</p>
                <p className="mt-1 text-brand-600 font-bold">
                    {d.votes} votes ({d.pct}%)
                </p>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Trophy size={20} className="text-amber-500" />
                        <div>
                            <h2 className="font-bold">Election Results</h2>
                            <p className="text-xs text-slate-500 truncate max-w-[280px]">{title}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                        aria-label="Close results"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
                    {/* Summary */}
                    <div className="mb-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                        <span className="text-slate-500">Total votes cast</span>
                        <span className="text-xl font-bold text-brand-600">{totalVotes}</span>
                    </div>

                    {/* Winner banner */}
                    {totalVotes > 0 && (
                        <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
                            <Trophy size={22} className="text-amber-500 shrink-0" />
                            <div>
                                <p className="text-xs text-amber-600 font-medium">Leading Candidate</p>
                                <p className="font-bold">
                                    {winner.name}
                                    <span className="ml-2 text-sm text-slate-500">
                                        ({winner.party || "Independent"})
                                    </span>
                                </p>
                                <p className="text-sm text-amber-700">
                                    {winner.votes} votes — {totalVotes > 0
                                        ? ((winner.votes / totalVotes) * 100).toFixed(1)
                                        : 0}%
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Bar chart */}
                    {totalVotes > 0 ? (
                        <div className="mb-5">
                            <ResponsiveContainer width="100%" height={Math.max(160, sorted.length * 50)}>
                                <BarChart
                                    data={chartData}
                                    layout="vertical"
                                    margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 12 }} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={100}
                                        tick={{ fontSize: 12 }}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="votes" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 12, fill: "#64748b" }}>
                                        {chartData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="mb-5 rounded-xl border border-dashed py-8 text-center text-slate-500 text-sm">
                            No votes have been cast yet.
                        </div>
                    )}

                    {/* Table */}
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-slate-500">
                                <th className="pb-2 font-medium">#</th>
                                <th className="pb-2 font-medium">Candidate</th>
                                <th className="pb-2 font-medium">Party</th>
                                <th className="pb-2 font-medium text-right">Votes</th>
                                <th className="pb-2 font-medium text-right">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {chartData.map((c, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    <td className="py-2 text-slate-400">{i + 1}</td>
                                    <td className="py-2 font-medium">{c.name}</td>
                                    <td className="py-2 text-slate-500">{c.party}</td>
                                    <td className="py-2 text-right font-semibold">{c.votes}</td>
                                    <td className="py-2 text-right text-slate-500">{c.pct}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <p className="mt-4 text-center text-xs text-slate-400">
                        Results are publicly verifiable. Voter identities remain anonymous.
                    </p>
                </div>

                <div className="border-t px-6 py-4">
                    <button
                        onClick={onClose}
                        className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-medium hover:bg-slate-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

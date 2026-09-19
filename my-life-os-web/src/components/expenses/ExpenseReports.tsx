import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { GlassCard as Card } from '../ui/Card'
import type { ExpenseSummary } from '../../services/expense'

interface ExpenseReportsProps {
  summary: ExpenseSummary | null
}

const COLORS = [
  '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b',
  '#06b6d4', '#f43f5e', '#84cc16', '#a855f7', '#64748b'
]

export function ExpenseReports({ summary }: ExpenseReportsProps) {
  if (!summary) {
    return <div className="p-8 text-center text-slate-400">Loading reports data...</div>
  }

  const currency = summary.currency || 'INR'
  const monthlyTotal = summary.thisMonth?.total || 0
  const avgDaily = Math.round((monthlyTotal / Math.max(1, new Date().getDate())) * 100) / 100
  const largest = summary.largestExpenses?.[0]?.amount || 0

  const dailyData = summary.dailyTrend?.map((d) => ({
    date: d.date.slice(5), // MM-DD
    total: d.total,
  })) || []

  const categoryData = summary.thisMonth?.categories || []

  return (
    <div className="space-y-8">
      {/* Key Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-400">Total Spent This Month</p>
          <h3 className="mt-1 text-2xl font-bold text-white">
            {currency} {monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="mt-1 text-xs text-slate-500">Includes personal & group shares</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-400">Daily Average (MTD)</p>
          <h3 className="mt-1 text-2xl font-bold text-violet-brand">
            {currency} {avgDaily.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="mt-1 text-xs text-slate-500">Across active days this month</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-400">Largest Expense</p>
          <h3 className="mt-1 text-2xl font-bold text-rose-400">
            {currency} {Number(largest).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {summary.largestExpenses?.[0]?.title || 'None recorded'}
          </p>
        </Card>
      </div>

      {/* Spending Trend Area Chart */}
      <Card className="p-6">
        <h3 className="text-base font-bold text-white mb-4">7-Day Spending Trend</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="spendingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12 }}
                formatter={(val: any) => [`${currency} ${Number(val).toFixed(2)}`, 'Spent']}
              />
              <Area type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} fill="url(#spendingGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category Breakdown Bar / Donut */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-base font-bold text-white mb-4">Category Distribution</h3>
          {categoryData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-500">
              No category data for this month
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={12} width={90} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12 }}
                    formatter={(val: any) => [`${currency} ${Number(val).toFixed(2)}`, 'Total']}
                  />
                  <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Top 5 Largest Expenses */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-white mb-4">Top Expenses This Month</h3>
          {summary.largestExpenses?.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-500">
              No expenses recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {summary.largestExpenses?.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3 transition hover:bg-white/[0.05]"
                >
                  <div>
                    <h4 className="font-medium text-sm text-white">{exp.title}</h4>
                    <p className="text-xs text-slate-400">
                      {exp.category} • {new Date(exp.expenseDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-bold text-sm text-rose-400">
                    -{exp.currency} {Number(exp.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

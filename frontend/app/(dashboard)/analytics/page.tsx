"use client"

import { CheckCircle2, Clock3, FileText } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useAnalytics } from "@/hooks/use-analytics"

const volumeConfig = { count: { label: "Requests", color: "var(--chart-1)" } } satisfies ChartConfig
const turnaroundConfig = { days: { label: "Average days", color: "var(--chart-2)" } } satisfies ChartConfig
const outcomeConfig = { Approved: { label: "Approved", color: "var(--chart-2)" }, Rejected: { label: "Rejected", color: "var(--chart-4)" }, Pending: { label: "Pending", color: "var(--chart-1)" } } satisfies ChartConfig
const citationConfig = { count: { label: "Citations", color: "var(--chart-3)" } } satisfies ChartConfig

export default function AnalyticsPage() {
  const { analytics, isLoading } = useAnalytics()

  if (isLoading || !analytics) return <AnalyticsSkeleton />

  const categoryVolume = analytics.requestsByCategory.map((item) => ({ ...item, shortCategory: shortenCategory(item.category) }))
  const turnaround = analytics.turnaroundByCategory.map((item) => ({ ...item, shortCategory: shortenCategory(item.category) }))
  const approvalTotal = analytics.approvalOutcome.reduce((total, item) => total + item.value, 0)

  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="font-serif text-xl font-semibold">Analytics</h1><p className="mt-1 text-sm text-muted-foreground">Approval activity and retrieval trends across the sanction workflow.</p></div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={<FileText className="size-4 text-primary" />} label="Requests processed" value={analytics.totalRequests} detail="Current academic year" />
        <Metric icon={<Clock3 className="size-4 text-primary" />} label="Average turnaround" value={`${analytics.avgTurnaroundDays} days`} detail="Submission to final outcome" />
        <Metric icon={<CheckCircle2 className="size-4 text-primary" />} label="Approval rate" value={`${Math.round(analytics.approvalRate * 100)}%`} detail="Across completed decisions" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Request volume by category</CardTitle><CardDescription>Number of note sheets initiated this academic year.</CardDescription></CardHeader>
          <CardContent><ChartContainer config={volumeConfig} className="h-72 w-full"><BarChart data={categoryVolume} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}><CartesianGrid vertical={false} /><XAxis dataKey="shortCategory" tickLine={false} axisLine={false} tickMargin={8} interval={0} tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><ChartTooltip cursor={false} content={<ChartTooltipContent labelKey="category" />} /><Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Approval turnaround time</CardTitle><CardDescription>Average number of days by request category.</CardDescription></CardHeader>
          <CardContent><ChartContainer config={turnaroundConfig} className="h-72 w-full"><BarChart data={turnaround} layout="vertical" margin={{ top: 5, right: 20, left: 24, bottom: 5 }}><CartesianGrid horizontal={false} /><XAxis type="number" unit=" days" tickLine={false} axisLine={false} /><YAxis type="category" dataKey="shortCategory" width={100} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><ChartTooltip cursor={false} content={<ChartTooltipContent labelKey="category" />} /><Bar dataKey="days" fill="var(--color-days)" radius={[0, 4, 4, 0]} /></BarChart></ChartContainer></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Approval outcomes</CardTitle><CardDescription>Approved, returned, and currently pending note sheets.</CardDescription></CardHeader>
          <CardContent className="grid items-center gap-4 sm:grid-cols-[1fr_180px]"><ChartContainer config={outcomeConfig} className="h-64 w-full"><PieChart><ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} /><Pie data={analytics.approvalOutcome} dataKey="value" nameKey="name" innerRadius={56} outerRadius={82} paddingAngle={3}>{analytics.approvalOutcome.map((item) => <Cell key={item.name} fill={`var(--color-${item.name})`} />)}<Label content={({ viewBox }) => { const center = viewBox as { cx?: number; cy?: number }; return center.cx && center.cy ? <text x={center.cx} y={center.cy} textAnchor="middle" dominantBaseline="middle"><tspan x={center.cx} className="fill-foreground text-xl font-semibold">{approvalTotal}</tspan><tspan x={center.cx} dy="1.4em" className="fill-muted-foreground text-[10px]">TOTAL</tspan></text> : null }} /></Pie></PieChart></ChartContainer><div className="flex flex-col gap-3">{analytics.approvalOutcome.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><i className="size-2.5 rounded-sm" style={{ backgroundColor: `var(--color-${item.name})` }} />{item.name}</span><span className="font-mono text-xs text-muted-foreground">{item.value} · {Math.round((item.value / approvalTotal) * 100)}%</span></div>)}</div></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Most-cited retrieval sources</CardTitle><CardDescription>Rules and precedents used most frequently to ground AI drafts.</CardDescription></CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2"><CitationChart title="Rules" data={analytics.mostCitedRules.map((item) => ({ label: item.code, count: item.count }))} /><CitationChart title="Precedents" data={analytics.mostCitedPrecedents.map((item) => ({ label: item.title, count: item.count }))} /></CardContent>
        </Card>
      </div>
    </div>
  )
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string | number; detail: string }) {
  return <Card><CardContent className="flex items-center gap-3 py-4"><span className="flex size-9 items-center justify-center rounded-sm bg-primary/10">{icon}</span><div><p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 text-lg font-semibold">{value}</p><p className="text-[11px] text-muted-foreground">{detail}</p></div></CardContent></Card>
}

function CitationChart({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  return <div><p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{title}</p><ChartContainer config={citationConfig} className="h-48 w-full"><BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}><XAxis type="number" hide /><YAxis type="category" dataKey="label" width={118} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><ChartTooltip cursor={false} content={<ChartTooltipContent labelKey="label" />} /><Bar dataKey="count" fill="var(--color-count)" radius={[0, 3, 3, 0]} /></BarChart></ChartContainer></div>
}

function shortenCategory(category: string) {
  return { "Lab Equipment Purchase": "Lab equipment", "Event/Fest Expenditure": "Events / fest", "Guest Faculty Honorarium": "Honorarium", "Student Travel/TA-DA": "Student travel", "Club Budget": "Club budget" }[category] ?? category
}

function AnalyticsSkeleton() {
  return <div className="flex flex-col gap-6"><div><Skeleton className="h-7 w-32" /><Skeleton className="mt-2 h-4 w-80" /></div><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div><div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>
}

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart3, Package, ClipboardList, Users,
  Calendar, PieChart as PieChartIcon, Coins,
  Activity, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Palette ──────────────────────────────────────────────────────────────────

const COLORS = [
  "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#2dd4bf", "#f43f5e",
];

// ─── Report page cards ────────────────────────────────────────────────────────

const reportCards = [
  {
    title: "Stock Report",
    description: "Detailed inventory status and valuation",
    icon: Package,
    url: "/reports/stock",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Purchase Report",
    description: "Purchase history and spending",
    icon: ClipboardList,
    url: "/reports/purchase",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Customer Visits",
    description: "Recurring customer analytics",
    icon: Users,
    url: "/reports/customer-visit",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

// ─── Hover-only active shape (just outer glow ring — no text in SVG) ──────────

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      {/* main sector */}
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.95}
      />
      {/* outer glow ring */}
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.35}
      />
    </g>
  );
};

// ─── Custom tooltip (renders as HTML — never overlaps SVG) ────────────────────

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { value, payload: inner } = payload[0];
  const name = inner?.label ?? inner?.name ?? "";
  const color = inner?.fill ?? "#64748b";
  const total = inner?._total ?? value;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

  return (
    <div
      style={{
        background: "white",
        border: "none",
        borderRadius: 14,
        boxShadow: "0 10px 30px -5px rgba(0,0,0,0.18)",
        padding: "10px 14px",
        minWidth: 160,
        pointerEvents: "none",
      }}
    >
      {/* colour swatch + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", lineHeight: 1 }}>
          {name}
        </span>
      </div>
      {/* value row */}
      <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
        ₹{value.toLocaleString()}
      </div>
      {/* percentage row */}
      <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginTop: 3 }}>
        {pct}% of total
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsDashboard() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "custom">("monthly");
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const setTimeframe = (type: "daily" | "weekly" | "monthly") => {
    setPeriod(type);
    const today = new Date();
    if (type === "daily") {
      setDateRange({ from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") });
    } else if (type === "weekly") {
      setDateRange({ from: format(subDays(today, 7), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") });
    } else {
      setDateRange({ from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(endOfMonth(today), "yyyy-MM-dd") });
    }
  };

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["/api/reports/revenue-breakdown", dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await fetch(`/api/reports/revenue-breakdown?from=${dateRange.from}&to=${dateRange.to}`);
      if (!res.ok) throw new Error("Failed to fetch revenue data");
      return res.json();
    },
  });

  const [activeIndex, setActiveIndex] = useState([0, 0, 0, 0]);
  const onPieEnter = (chartIndex: number) => (_: any, segIndex: number) => {
    setActiveIndex((prev) => {
      const next = [...prev];
      next[chartIndex] = segIndex;
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-8 p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/30">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Reports Dashboard</h1>
            <p className="text-sm text-slate-500 font-medium">Analyze and track your clinic performance</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white border rounded-2xl shadow-sm">
          {[
            { id: "daily", label: "Today" },
            { id: "weekly", label: "7 Days" },
            { id: "monthly", label: "Month" },
            { id: "custom", label: "Custom" },
          ].map((btn) => (
            <Button
              key={btn.id}
              variant={period === btn.id ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-9 px-4 rounded-xl text-xs font-bold transition-all",
                period === btn.id ? "shadow-md" : "text-slate-500 hover:bg-slate-100"
              )}
              onClick={() => btn.id === "custom" ? setPeriod("custom") : setTimeframe(btn.id as any)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {period === "custom" && (
        <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-4 duration-300">
          <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-3 text-sm font-bold text-primary">
              <Calendar className="w-4 h-4" /> Custom Date Range:
            </div>
            <input
              type="date"
              className="h-10 px-4 rounded-xl border border-primary/20 bg-white text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
              value={dateRange.from}
              onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
            />
            <ArrowRight className="w-4 h-4 text-slate-300" />
            <input
              type="date"
              className="h-10 px-4 rounded-xl border border-primary/20 bg-white text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
              value={dateRange.to}
              onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Pie charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ChartCard title="Patient Split"        description="IP vs OP Revenue"          icon={Users}    data={revenueData?.ipOp}          loading={revenueLoading} activeIndex={activeIndex[0]} onEnter={onPieEnter(0)} />
        <ChartCard title="Revenue Mix"          description="Service vs Inventory"      icon={Coins}    data={revenueData?.itemTypes}     loading={revenueLoading} activeIndex={activeIndex[1]} onEnter={onPieEnter(1)} />
        <ChartCard title="Service Categories"   description="Revenue by Service Type"   icon={Activity} data={revenueData?.serviceCats}   loading={revenueLoading} activeIndex={activeIndex[2]} onEnter={onPieEnter(2)} />
        <ChartCard title="Inventory Sales"      description="Revenue by Product Cat."   icon={Package}  data={revenueData?.inventoryCats} loading={revenueLoading} activeIndex={activeIndex[3]} onEnter={onPieEnter(3)} />
      </div>

      {/* Detailed report links */}
      <div className="space-y-4">
        <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Detailed Analysis Reports
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCards.map((card) => (
            <Link key={card.url} href={card.url}>
              <Card className="group cursor-pointer h-full transition-all hover:border-primary/50 border-slate-100 bg-white shadow-sm overflow-hidden border-2">
                <CardContent className="p-6">
                  <div className="flex items-start gap-5">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-2xl ${card.bgColor} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                      <card.icon className={`w-7 h-7 ${card.color}`} />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <span className="text-base font-bold text-slate-800 group-hover:text-primary transition-colors">{card.title}</span>
                      <span className="text-sm text-slate-500 leading-snug font-medium">{card.description}</span>
                      <div className="mt-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                        View Details <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ChartCard ────────────────────────────────────────────────────────────────

function ChartCard({ title, description, icon: Icon, data, loading, activeIndex, onEnter }: any) {
  const hasData = data && data.length > 0;
  const total = useMemo(() => data?.reduce((s: number, r: any) => s + r.value, 0) || 0, [data]);

  // Attach _total to each entry so the tooltip can compute %
  const enriched = useMemo(
    () => data?.map((d: any) => ({ ...d, _total: total })) ?? [],
    [data, total]
  );

  return (
    <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl group overflow-visible">
      <CardHeader className="pb-0 px-6 pt-6 flex flex-row items-start justify-between">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-bold text-slate-800">{title}</CardTitle>
          <CardDescription className="text-xs font-medium text-slate-400">{description}</CardDescription>
        </div>
        <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-primary/10 transition-colors">
          <Icon className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
        </div>
      </CardHeader>

      <CardContent className="p-0 pb-4">
        {/* Donut area */}
        <div className="h-[200px] w-full mt-2 relative">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <Skeleton className="w-32 h-32 rounded-full" />
            </div>
          ) : !hasData ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
              <PieChartIcon className="w-12 h-12 opacity-20" />
              <span className="text-[10px] uppercase font-black tracking-widest">No data available</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={enriched}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="label"
                    onMouseEnter={onEnter}
                    strokeWidth={2}
                    stroke="white"
                  >
                    {enriched.map((_: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomTooltip />}
                    wrapperStyle={{ zIndex: 50, outline: "none" }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centre label — always readable, never inside SVG */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Total</div>
                <div className="text-lg font-black text-slate-800 tracking-tight leading-none">
                  ₹{(total / 1000).toFixed(1)}k
                </div>
              </div>
            </>
          )}
        </div>

        {/* Colour-swatch legend */}
        {hasData && !loading && (
          <div className="px-4 mt-1 flex flex-col gap-1.5">
            {enriched.map((entry: any, i: number) => {
              const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0.0";
              const color = COLORS[i % COLORS.length];
              return (
                <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: color }}
                    />
                    <span className="truncate font-medium text-slate-600">{entry.label ?? entry.name}</span>
                  </div>
                  <span className="font-bold text-slate-700 flex-shrink-0">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

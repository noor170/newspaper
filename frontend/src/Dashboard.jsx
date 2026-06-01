import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  DollarSign,
  Gauge,
  PackagePlus,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/_/backend" : "");
const RETURN_THRESHOLD = 10;
const HIGH_SPEND_ALERT_THRESHOLD = 30000;

async function parseJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const bodyPreview = (await response.text()).slice(0, 120);
    throw new Error(`Expected JSON but received ${contentType || "unknown content type"}: ${bodyPreview}`);
  }

  return response.json();
}

const thresholdLinePlugin = {
  id: "thresholdLine",
  afterDatasetsDraw(chart, _args, pluginOptions) {
    if (!pluginOptions?.xValue) return;
    const { ctx, chartArea, scales } = chart;
    const x = scales.x.getPixelForValue(pluginOptions.xValue);
    ctx.save();
    ctx.strokeStyle = pluginOptions.color || "#ff8a65";
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};
ChartJS.register(thresholdLinePlugin);

const defaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 89);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const defaultSimulation = {
  adSpendAdjustment: 0,
  supplierCogsShift: 0,
  pricePerUnitChange: 0,
};

const currency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);

const numberFormat = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value || 0);

function KPI({ title, value, subtitle, tone = "neutral", badge, icon: Icon }) {
  return (
    <div className={`kpi-card kpi-${tone}`}>
      <div className="kpi-title-row">
        <div className="kpi-title-stack">
          <span className="kpi-title">{title}</span>
          {Icon ? (
            <span className={`kpi-icon kpi-icon-${tone}`}>
              <Icon size={16} />
            </span>
          ) : null}
        </div>
        {badge ? <span className={`kpi-badge kpi-badge-${tone}`}>{badge}</span> : null}
      </div>
      <div className="kpi-value">{value}</div>
      {subtitle ? <div className="kpi-subtitle">{subtitle}</div> : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">RO</div>
          <div>
            <h1>Retail Ops</h1>
            <p>Unified commerce workspace</p>
          </div>
        </div>
        <div className="sidebar-panel">
          <div className="sidebar-label">Workspace Summary</div>
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      </aside>
      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Store performance</p>
            <h2>E-Commerce & Retail Operations Dashboard</h2>
            <p className="header-copy">Loading operating snapshot and analytics...</p>
          </div>
        </header>
        <section className="kpi-grid">
          {[0, 1, 2].map((item) => (
            <div key={item} className="kpi-card">
              <div className="skeleton skeleton-label" />
              <div className="skeleton skeleton-value" />
              <div className="skeleton skeleton-copy" />
            </div>
          ))}
        </section>
        <section className="content-grid">
          <div className="panel panel-large">
            <div className="skeleton skeleton-chart" />
          </div>
          <div className="panel">
            <div className="skeleton skeleton-chart" />
          </div>
        </section>
        <section className="table-grid">
          <div className="panel">
            <div className="skeleton skeleton-table" />
          </div>
          <div className="panel">
            <div className="skeleton skeleton-card-large" />
          </div>
        </section>
      </main>
    </div>
  );
}

function OperatingSnapshotPanel({
  metrics,
  filters,
  setFilters,
  netProfitMode,
  setNetProfitMode,
  exporting,
  exportReport,
}) {
  const [selectedPoItem, setSelectedPoItem] = useState(null);
  const [simulationOpen, setSimulationOpen] = useState(true);
  const [simulation, setSimulation] = useState(defaultSimulation);

  const headlineValue = netProfitMode ? metrics.net_profit : metrics.gross_revenue;
  const headlineTitle = netProfitMode ? "Net Profit" : "Gross Revenue";
  const topReturnCategory = metrics.category_return_rates[0] || null;
  const returnRate = topReturnCategory?.return_rate_pct || 0;
  const hasMarginLeakageAlert =
    Boolean(topReturnCategory) &&
    returnRate > RETURN_THRESHOLD &&
    metrics.ad_spend >= HIGH_SPEND_ALERT_THRESHOLD;

  const reorderFeed = metrics.low_stock_products.slice(0, 5);

  const baselineRunway = useMemo(() => {
    if (!metrics.inventory_overview.length) return 0;
    const finiteRunway = metrics.inventory_overview
      .map((item) => item.days_of_inventory_left)
      .filter((value) => Number.isFinite(value));
    if (!finiteRunway.length) return 0;
    return finiteRunway.reduce((total, value) => total + value, 0) / finiteRunway.length;
  }, [metrics.inventory_overview]);

  const scenario = useMemo(() => {
    const demandMultiplier =
      (1 + simulation.adSpendAdjustment / 100 * 0.45) *
      Math.max(0.35, 1 - simulation.pricePerUnitChange * 0.018);
    const cogsPressure = 1 - simulation.supplierCogsShift / 100 * 0.35;
    const runwayMultiplier = cogsPressure / Math.max(demandMultiplier, 0.25);
    const adjustedRunway = baselineRunway * runwayMultiplier;
    const baselinePercent = Math.min(100, baselineRunway / 60 * 100);
    const adjustedPercent = Math.min(100, adjustedRunway / 60 * 100);
    return {
      adjustedRunway,
      delta: adjustedRunway - baselineRunway,
      demandMultiplier,
      baselinePercent,
      adjustedPercent,
    };
  }, [baselineRunway, simulation]);

  const poDraft = useMemo(() => {
    if (!selectedPoItem) return null;
    const reorderVolume = Math.max(
      0,
      Math.ceil(selectedPoItem.sales_velocity_30d * 60 - selectedPoItem.stock_level)
    );
    return {
      reorderVolume,
      currentStock: selectedPoItem.stock_level,
      projectedCoverage: Math.round(selectedPoItem.sales_velocity_30d * 60),
    };
  }, [selectedPoItem]);

  return (
    <div className={`panel operating-snapshot-panel ${netProfitMode ? "net-mode" : ""}`}>
      <div className="panel-header operating-header">
        <div>
          <h3>Operating Snapshot</h3>
          <p>Bridge demand, margin, and replenishment risk in one operating panel.</p>
        </div>
        <div className="operating-header-actions">
          <button className="export-button snapshot-export header-export" type="button" onClick={exportReport} disabled={exporting}>
            <Download size={16} />
            <span>{exporting ? "Exporting..." : "Export Report"}</span>
          </button>
          <span className={`net-state-badge ${netProfitMode ? "active" : ""}`}>
            {netProfitMode ? "Net View Active" : "Gross View Active"}
          </span>
        </div>
      </div>

      <div className="snapshot-controls">
        <div className="control-group control-dates">
          <label>
            <span>Start</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) =>
                setFilters((current) => ({ ...current, startDate: event.target.value }))
              }
            />
          </label>
          <label>
            <span>End</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) =>
                setFilters((current) => ({ ...current, endDate: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="control-actions">
          <button
            type="button"
            className={`mode-control ${netProfitMode ? "on" : ""}`}
            aria-pressed={netProfitMode}
            onClick={() => setNetProfitMode((current) => !current)}
          >
            <span className="mode-copy">
              <strong>Dynamic Net Profit Mode</strong>
              <span>Gross revenue minus COGS, shipping buffers, and ad spend.</span>
            </span>
            <span className={`mode-switch ${netProfitMode ? "on" : ""}`}>
              <span />
            </span>
          </button>
        </div>
      </div>

      <div className="operating-kpi-grid">
        <KPI
          title={headlineTitle}
          value={currency(headlineValue)}
          subtitle={`${numberFormat(metrics.totals.orders)} orders in selected range`}
          tone={netProfitMode ? "positive" : "primary"}
          icon={DollarSign}
        />
        <KPI
          title="LTV:CAC Ratio"
          value={`${metrics.ltv_cac_ratio.toFixed(2)}:1`}
          subtitle={`Associated ad spend ${currency(metrics.ad_spend)}`}
          tone={metrics.ltv_cac_status === "warning" ? "warning" : "positive"}
          badge={metrics.ltv_cac_status === "warning" ? "Needs attention" : "Healthy"}
          icon={Gauge}
        />
        <KPI
          title="Return Frequency Tracker"
          value={`${returnRate.toFixed(2)}%`}
          subtitle={
            topReturnCategory
              ? `${topReturnCategory.category} vs ${RETURN_THRESHOLD}% safety threshold`
              : `Monitor against ${RETURN_THRESHOLD}% safety threshold`
          }
          tone={hasMarginLeakageAlert ? "danger" : returnRate > RETURN_THRESHOLD ? "warning" : "neutral"}
          badge={hasMarginLeakageAlert ? "Margin Leakage Alert" : returnRate > RETURN_THRESHOLD ? "Watchlist" : "Stable"}
          icon={TrendingDown}
        />
      </div>

      <div className="operating-grid">
        <div className="operating-feed">
          <div className="subpanel-header">
            <div>
              <h4>Critical Reorder Alert Feed</h4>
              <p>Under 15 days of inventory remaining.</p>
            </div>
            <span className="feed-count">{reorderFeed.length} flagged</span>
          </div>

          <div className="alert-feed">
            {reorderFeed.length ? (
              reorderFeed.map((item) => (
                <div key={item.product_id} className="alert-item">
                  <div className="alert-item-main">
                    <div className="alert-product">
                      <strong>{item.product_name}</strong>
                      <span>{item.category}</span>
                    </div>
                    <div className="alert-metrics">
                      <div>
                        <span>Velocity</span>
                        <strong>{item.sales_velocity_30d.toFixed(2)} units / day</strong>
                      </div>
                      <div>
                        <span>Runway</span>
                        <strong>{Math.round(item.days_of_inventory_left)} Days Left</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="draft-po-button"
                    onClick={() => setSelectedPoItem(item)}
                  >
                    <PackagePlus size={16} />
                    <span>Draft PO</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-feed">
                <TrendingUp size={18} />
                <span>No products are currently below the 15-day reorder threshold.</span>
              </div>
            )}
          </div>
        </div>

        <div className="simulation-panel">
          <button
            type="button"
            className="simulation-toggle"
            onClick={() => setSimulationOpen((current) => !current)}
            aria-expanded={simulationOpen}
          >
            <span className="simulation-toggle-copy">
              <SlidersHorizontal size={16} />
              <span>What-If Simulation</span>
            </span>
            <ChevronDown size={16} className={simulationOpen ? "chevron-open" : ""} />
          </button>

          {simulationOpen ? (
            <div className="simulation-body">
              <div className="simulation-slider-group">
                <label>
                  <span>Ad Spend Adjustment</span>
                  <strong>{simulation.adSpendAdjustment > 0 ? "+" : ""}{simulation.adSpendAdjustment}%</strong>
                </label>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  value={simulation.adSpendAdjustment}
                  onChange={(event) =>
                    setSimulation((current) => ({
                      ...current,
                      adSpendAdjustment: Number(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="simulation-slider-group">
                <label>
                  <span>Supplier COGS Shift</span>
                  <strong>{simulation.supplierCogsShift > 0 ? "+" : ""}{simulation.supplierCogsShift}%</strong>
                </label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="2"
                  value={simulation.supplierCogsShift}
                  onChange={(event) =>
                    setSimulation((current) => ({
                      ...current,
                      supplierCogsShift: Number(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="simulation-slider-group">
                <label>
                  <span>Price Per Unit Change</span>
                  <strong>{simulation.pricePerUnitChange > 0 ? "+" : ""}{currency(simulation.pricePerUnitChange)}</strong>
                </label>
                <input
                  type="range"
                  min="-10"
                  max="20"
                  step="1"
                  value={simulation.pricePerUnitChange}
                  onChange={(event) =>
                    setSimulation((current) => ({
                      ...current,
                      pricePerUnitChange: Number(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="runway-compare">
                <div className="runway-label-row">
                  <span>Average inventory runway</span>
                  <strong>{scenario.adjustedRunway.toFixed(1)} days</strong>
                </div>
                <div className="progress-stack">
                  <div className="progress-row">
                    <span>Base</span>
                    <div className="progress-track">
                      <div className="progress-bar base" style={{ width: `${scenario.baselinePercent}%` }} />
                    </div>
                    <strong>{baselineRunway.toFixed(1)}d</strong>
                  </div>
                  <div className="progress-row">
                    <span>Scenario</span>
                    <div className="progress-track">
                      <div className="progress-bar scenario" style={{ width: `${scenario.adjustedPercent}%` }} />
                    </div>
                    <strong>{scenario.adjustedRunway.toFixed(1)}d</strong>
                  </div>
                </div>
                <div className={`simulation-impact ${scenario.delta >= 0 ? "positive" : "danger"}`}>
                  {scenario.delta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>
                    {scenario.delta >= 0 ? "Extends" : "Shortens"} average runway by{" "}
                    <strong>{Math.abs(scenario.delta).toFixed(1)} days</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {selectedPoItem && poDraft ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedPoItem(null)}>
          <div
            className="po-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="po-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="po-modal-header">
              <div>
                <h4 id="po-modal-title">Draft Purchase Order</h4>
                <p>
                  {selectedPoItem.product_name} <span>|</span> {selectedPoItem.category}
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedPoItem(null)}>
                Close
              </button>
            </div>
            <div className="po-metric-grid">
              <div className="po-metric">
                <span>Current Stock</span>
                <strong>{numberFormat(poDraft.currentStock)} units</strong>
              </div>
              <div className="po-metric">
                <span>Sales Velocity</span>
                <strong>{selectedPoItem.sales_velocity_30d.toFixed(2)} units / day</strong>
              </div>
              <div className="po-metric">
                <span>60-Day Coverage Need</span>
                <strong>{numberFormat(poDraft.projectedCoverage)} units</strong>
              </div>
              <div className="po-metric accent">
                <span>Reorder Volume</span>
                <strong>{numberFormat(poDraft.reorderVolume)} units</strong>
              </div>
            </div>
            <div className="po-formula">
              Reorder Volume = (Sales Velocity × 60 Days) - Current Stock
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LegacySidebar({ metrics, netProfitMode }) {
  const averageRunway = useMemo(() => {
    if (!metrics?.inventory_overview?.length) return 0;
    const runway = metrics.inventory_overview
      .map((item) => item.days_of_inventory_left)
      .filter((value) => Number.isFinite(value));
    if (!runway.length) return 0;
    return runway.reduce((sum, value) => sum + value, 0) / runway.length;
  }, [metrics]);

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">RO</div>
        <div>
          <h1>Retail Ops</h1>
          <p>Unified commerce workspace</p>
        </div>
      </div>

      <div className="sidebar-panel">
        <div className="sidebar-label">Workspace Summary</div>
        <div className="sidebar-stat-list">
          <div className="sidebar-stat">
            <span>View Mode</span>
            <strong>{netProfitMode ? "Net Margin" : "Gross Revenue"}</strong>
          </div>
          <div className="sidebar-stat">
            <span>Coverage Window</span>
            <strong>
              {metrics.date_range.start_date} to {metrics.date_range.end_date}
            </strong>
          </div>
          <div className="sidebar-stat">
            <span>Average Runway</span>
            <strong>{averageRunway.toFixed(1)} days</strong>
          </div>
        </div>
      </div>

      <div className="sidebar-panel">
        <div className="sidebar-label">Live Signals</div>
        <div className="sidebar-signal-list">
          <div className="sidebar-signal">
            <span>At-Risk SKUs</span>
            <strong>{metrics.warning_count}</strong>
          </div>
          <div className="sidebar-signal">
            <span>LTV:CAC</span>
            <strong>{metrics.ltv_cac_ratio.toFixed(2)}:1</strong>
          </div>
          <div className="sidebar-signal">
            <span>Ad Spend</span>
            <strong>{currency(metrics.ad_spend)}</strong>
          </div>
        </div>
      </div>

      <div className="sidebar-panel sidebar-note-panel">
        <div className="sidebar-label">Operator Focus</div>
        <div className="mode-card sidebar-note">
          <div>
            <strong>Use the operating snapshot panel</strong>
            <p>Adjust the date range, simulate margin shifts, and draft replenishment from the main workspace.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [netProfitMode, setNetProfitMode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState(defaultDateRange);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.startDate) params.set("start_date", filters.startDate);
    if (filters.endDate) params.set("end_date", filters.endDate);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE}/api/v1/operations/dashboard?${queryString}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await parseJsonResponse(response);
        setMetrics(json.data);
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [queryString]);

  async function exportReport() {
    setExporting(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/operations/export?${queryString}&file_format=csv`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `operations-summary-${filters.startDate}-to-${filters.endDate}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (exportError) {
      setError(exportError.message);
    } finally {
      setExporting(false);
    }
  }

  const lineData = useMemo(() => {
    if (!metrics) return null;
    return {
      labels: metrics.time_series.labels,
      datasets: [
        {
          label: netProfitMode ? "Net Profit" : "Gross Sales",
          data: netProfitMode ? metrics.time_series.net_profit : metrics.time_series.gross_sales,
          borderColor: netProfitMode ? "#58c4a8" : "#5b8cff",
          backgroundColor: netProfitMode
            ? "rgba(88,196,168,0.15)"
            : "rgba(91,140,255,0.14)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2.5,
        },
      ],
    };
  }, [metrics, netProfitMode]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 450,
      easing: "easeOutQuart",
    },
    plugins: {
      legend: {
        labels: { color: "#94a3b8" },
      },
      tooltip: {
        backgroundColor: "#0f172a",
        borderColor: "rgba(148,163,184,0.2)",
        borderWidth: 1,
        callbacks: {
          label: (context) => currency(context.parsed.y),
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        grid: { color: "rgba(148,163,184,0.08)" },
      },
      y: {
        ticks: {
          color: "#94a3b8",
          callback: (value) => currency(value),
        },
        grid: { color: "rgba(148,163,184,0.08)" },
      },
    },
  };

  const returnChartData = useMemo(() => {
    if (!metrics) return null;
    return {
      labels: metrics.category_return_rates.map((item) => item.category),
      datasets: [
        {
          label: "Return Rate %",
          data: metrics.category_return_rates.map((item) => item.return_rate_pct),
          backgroundColor: metrics.category_return_rates.map((item) =>
            item.return_rate_pct >= 10 ? "#ff7b72" : "#f4b860"
          ),
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }, [metrics]);

  const returnChartOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
      easing: "easeOutQuart",
    },
    plugins: {
      legend: { display: false },
      thresholdLine: {
        xValue: 10,
        color: "#e85d75",
      },
      tooltip: {
        backgroundColor: "#0f172a",
        callbacks: {
          label: (context) => `${context.parsed.x.toFixed(2)}%`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: "#94a3b8",
          callback: (value) => `${value}%`,
        },
        grid: { color: "rgba(148,163,184,0.08)" },
      },
      y: {
        ticks: { color: "#cbd5e1" },
        grid: { display: false },
      },
    },
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!metrics) {
    return (
      <div className="loading-shell">
        <p>Dashboard data unavailable.</p>
        {error ? <p className="error-copy">{error}</p> : null}
      </div>
    );
  }

  const headlineValue = netProfitMode ? metrics.net_profit : metrics.gross_revenue;

  return (
    <div className="workspace-shell">
      <LegacySidebar
        metrics={metrics}
        netProfitMode={netProfitMode}
      />

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Store performance</p>
            <h2>E-Commerce & Retail Operations Dashboard</h2>
            <p className="header-copy">
              Balance ad efficiency against inventory velocity and margin pressure in one view.
            </p>
          </div>
          <div className={`status-pill ${metrics.ltv_cac_status}`}>
            LTV:CAC {metrics.ltv_cac_ratio.toFixed(2)}:1
          </div>
        </header>

        {error ? <div className="error-banner">Backend request failed: {error}</div> : null}

        <section className="kpi-grid">
          <KPI
            title={netProfitMode ? "Net Profit" : "Gross Revenue"}
            value={currency(headlineValue)}
            subtitle={`${metrics.totals.orders} orders in selected range`}
            tone={netProfitMode ? "positive" : "primary"}
            icon={DollarSign}
          />
          <KPI
            title="Operational Warnings"
            value={metrics.warning_count}
            subtitle="Products under 15 days of inventory"
            tone={metrics.warning_count > 0 ? "danger" : "positive"}
            icon={AlertTriangle}
          />
          <KPI
            title="LTV to CAC Ratio"
            value={`${metrics.ltv_cac_ratio.toFixed(2)}:1`}
            subtitle={`Ad spend ${currency(metrics.ad_spend)}`}
            tone={metrics.ltv_cac_status === "warning" ? "warning" : "positive"}
            badge={metrics.ltv_cac_status === "warning" ? "Needs attention" : "Healthy"}
            icon={Gauge}
          />
        </section>

        <section className="content-grid">
          <div className="panel panel-large">
            <div className="panel-header">
              <div>
                <h3>{netProfitMode ? "Net Profit Trend" : "Gross Sales Trend"}</h3>
                <p>
                  {netProfitMode
                    ? "Net view includes product cost, shipping buffers, and full ad spend."
                    : "Gross view shows top-line sales before operating deductions."}
                </p>
              </div>
              <div className="panel-metric">{currency(headlineValue)}</div>
            </div>
            <div className="chart-panel">
              {lineData ? <Line data={lineData} options={lineOptions} /> : null}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Return Frequency</h3>
                <p>Threshold line marks 10% return rate.</p>
              </div>
            </div>
            <div className="bar-chart-panel">
              {returnChartData ? <Bar data={returnChartData} options={returnChartOptions} /> : null}
            </div>
          </div>
        </section>

        <section className="full-width-section">
          <OperatingSnapshotPanel
            metrics={metrics}
            filters={filters}
            setFilters={setFilters}
            netProfitMode={netProfitMode}
            setNetProfitMode={setNetProfitMode}
            exporting={exporting}
            exportReport={exportReport}
          />
        </section>

        <section className="table-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Inventory Coverage</h3>
                <p>Current stock, sales velocity, and runway by product.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stock</th>
                    <th>Velocity</th>
                    <th>Runway</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.inventory_overview.length ? (
                    metrics.inventory_overview.slice(0, 6).map((item) => (
                      <tr key={item.product_id}>
                        <td>
                          <div className="table-product">{item.product_name}</div>
                          <div className="table-meta">{item.category}</div>
                        </td>
                        <td>{item.stock_level}</td>
                        <td>{item.sales_velocity_30d.toFixed(2)}/day</td>
                        <td>
                          {Number.isFinite(item.days_of_inventory_left) ? (
                            <span className={`days-badge ${item.days_of_inventory_left < 15 ? "" : "days-badge-stable"}`}>
                              {Math.round(item.days_of_inventory_left)} Days Left
                            </span>
                          ) : (
                            <span className="days-badge days-badge-stable">Stable</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="empty-cell">
                        No products are currently below the reorder threshold.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Commerce Coverage Summary</h3>
                <p>High-level throughput and margin context for the selected period.</p>
              </div>
            </div>
            <div className="snapshot-list">
              <div className="snapshot-row">
                <span>Recognized Revenue</span>
                <strong>{currency(metrics.recognized_revenue)}</strong>
              </div>
              <div className="snapshot-row">
                <span>Returned Orders</span>
                <strong>{numberFormat(metrics.totals.returned_orders)}</strong>
              </div>
              <div className="snapshot-row">
                <span>Units Sold</span>
                <strong>{numberFormat(metrics.totals.units_sold)}</strong>
              </div>
              <div className="snapshot-row">
                <span>Flagged Reorders</span>
                <strong>{numberFormat(metrics.warning_count)}</strong>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

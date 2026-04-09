import { useEffect, useRef, useState, useCallback } from "react";
import { OrgChart as D3OrgChart } from "d3-org-chart";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Paper,
  InputAdornment,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import HubIcon from "@mui/icons-material/Hub";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import PropTypes from "prop-types";
import { getEmployees } from "../services/employeeService";

/** Role display configuration for badges and avatars. */
const ROLE_CONFIG = {
  admin:       { label: "Admin",       bg: "#fef2f2", color: "#c62828", avatarBg: "#c62828" },
  org_leader:  { label: "Org Leader",  bg: "#f3e8ff", color: "#6a1b9a", avatarBg: "#6a1b9a" },
  manager:     { label: "Manager",     bg: "#e8f0fe", color: "#1a3a6b", avatarBg: "#1a3a6b" },
  team_lead:   { label: "Team Lead",   bg: "#e8f5e9", color: "#2e7d32", avatarBg: "#2e7d32" },
  team_member: { label: "Team Member", bg: "#e3f2fd", color: "#01579b", avatarBg: "#01579b" },
};

const VIRTUAL_ROOT_ID = "__org_root__";

/**
 * Gets two-character initials from a full name.
 * @param {string} name
 * @returns {string}
 */
const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

/**
 * Builds the HTML string for a single org chart node card.
 * @param {object} d - d3-org-chart node object containing layout + data.
 * @returns {string} HTML string for the node.
 */
const buildNodeHtml = (d) => {
  const emp = d.data;
  const cfg = ROLE_CONFIG[emp.role] || ROLE_CONFIG.team_member;
  const initials = getInitials(emp.name);

  const roleBadge = `
    <span style="
      background:${cfg.bg};color:${cfg.color};
      font-size:10px;font-weight:700;
      padding:2px 9px;border-radius:999px;
      white-space:nowrap;flex-shrink:0;
      border: 1px solid ${cfg.color}33;
    ">${cfg.label}</span>`;

  const reportsBadge = emp.directReports > 0 ? `
    <span style="
      background:#e8f0fe;color:#1a3a6b;
      font-size:10px;font-weight:700;
      padding:2px 9px;border-radius:999px;
      white-space:nowrap;flex-shrink:0;
      border: 1px solid #1a3a6b33;
    ">${emp.directReports} report${emp.directReports !== 1 ? "s" : ""}</span>` : "";

  const locationLine = emp.location ? `
    <p style="font-size:10.5px;color:#94a3b8;margin:0 0 7px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
      ${emp.location}
    </p>` : `<div style="margin-bottom:7px;"></div>`;

  return `
    <div style="
      background:#ffffff;
      border:1.5px solid #e2e8f0;
      border-radius:14px;
      width:${d.width}px;
      height:${d.height}px;
      display:flex;align-items:center;
      padding:0 16px;gap:14px;
      box-shadow:0 4px 16px rgba(26,58,107,0.10);
      font-family:Inter,'Segoe UI',system-ui,sans-serif;
      box-sizing:border-box;cursor:pointer;
    ">
      <div style="
        width:52px;height:52px;border-radius:50%;
        background:linear-gradient(135deg,${cfg.avatarBg},${cfg.avatarBg}bb);
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:18px;font-weight:800;
        flex-shrink:0;letter-spacing:0.5px;
        box-shadow:0 3px 8px ${cfg.avatarBg}44;
      ">${initials}</div>
      <div style="flex:1;min-width:0;overflow:hidden;">
        <p style="
          font-weight:700;font-size:13.5px;color:#1a1a2e;
          margin:0 0 2px 0;white-space:nowrap;overflow:hidden;
          text-overflow:ellipsis;line-height:1.3;
        ">${emp.name}</p>
        <p style="
          font-size:11.5px;color:#475569;
          margin:0 0 2px 0;white-space:nowrap;overflow:hidden;
          text-overflow:ellipsis;line-height:1.3;
        ">${emp.title || "&nbsp;"}</p>
        ${locationLine}
        <div style="display:flex;gap:5px;align-items:center;flex-wrap:nowrap;overflow:hidden;">
          ${roleBadge}${reportsBadge}
        </div>
      </div>
    </div>`;
};

/**
 * Workday-style interactive Organizational Chart page.
 * Uses d3-org-chart to render a fully interactive hierarchy.
 * @returns {JSX.Element}
 */
function OrgChart() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState(null);
  const [foundEmployee, setFoundEmployee] = useState(null);
  const [expanded, setExpanded] = useState(true);

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    getEmployees()
      .then((emps) => setEmployees(emps))
      .catch(() => setError("Failed to load employee data for the org chart."))
      .finally(() => setLoading(false));
  }, []);

  // ── Chart initialisation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current || loading || !employees.length) return;

    // Build direct-reports count from manager_id references
    const reportsMap = {};
    employees.forEach((e) => {
      if (e.manager_id) reportsMap[e.manager_id] = (reportsMap[e.manager_id] || 0) + 1;
    });

    // Detect whether multiple roots exist; if so inject a virtual root
    const roots = employees.filter((e) => !e.manager_id);
    const multiRoot = roots.length > 1;

    const chartData = employees.map((e) => ({
      id: String(e.id),
      parentId: multiRoot && !e.manager_id
        ? VIRTUAL_ROOT_ID
        : e.manager_id ? String(e.manager_id) : "",
      name: e.full_name || "Unknown",
      title: e.designation || "",
      role: e.role || "team_member",
      location: e.location || "",
      directReports: reportsMap[e.id] || 0,
    }));

    if (multiRoot) {
      chartData.unshift({
        id: VIRTUAL_ROOT_ID,
        parentId: "",
        name: "Organization",
        title: "Top Level",
        role: "admin",
        location: "",
        directReports: roots.length,
      });
    }

    if (!chartRef.current) {
      chartRef.current = new D3OrgChart();
    }

    chartRef.current
      .container(chartContainerRef.current)
      .data(chartData)
      .nodeWidth(() => 290)
      .nodeHeight(() => 140)
      .childrenMargin(() => 70)
      .compactMarginBetween(() => 25)
      .compactMarginPair(() => 30)
      .siblingsMargin(() => 30)
      .nodeContent(buildNodeHtml)
      .buttonContent(({ node }) => {
        const count = node.data._directSubordinates;
        return `
          <div style="
            border-radius:999px;
            padding:2px 10px;
            font-size:11px;font-weight:700;
            background:#1a3a6b;color:#fff;
            font-family:Inter,'Segoe UI',sans-serif;
            box-shadow:0 2px 6px rgba(26,58,107,0.35);
          ">${node.children ? "▲" : "▼"} ${count}</div>`;
      })
      .onNodeClick((d) => {
        chartRef.current.setCentered(d.data.id).render();
      })
      .render();
  }, [employees, loading]);

  // ── Resize handling ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => chartRef.current?.fit();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    if (!chartRef.current) return;
    if (!searchQuery.trim()) {
      chartRef.current.clearHighlighting().render();
      setSearchStatus(null);
      setFoundEmployee(null);
      return;
    }
    const q = searchQuery.trim().toLowerCase();
    const match = employees.find((e) => (e.full_name || "").toLowerCase().includes(q));
    if (match) {
      chartRef.current
        .setHighlighted(String(match.id))
        .setCentered(String(match.id))
        .render();
      setSearchStatus("found");
      setFoundEmployee(match);
    } else {
      chartRef.current.clearHighlighting().render();
      setSearchStatus("not_found");
      setFoundEmployee(null);
    }
  }, [searchQuery, employees]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchStatus(null);
    setFoundEmployee(null);
    chartRef.current?.clearHighlighting().render();
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSearch(); };

  // ── Chart controls ────────────────────────────────────────────────────────
  const handleZoomIn  = ()  => chartRef.current?.zoomIn(0.3);
  const handleZoomOut = ()  => chartRef.current?.zoomOut(0.3);
  const handleFit     = ()  => chartRef.current?.fit();

  const handleExpandAll = () => {
    chartRef.current?.expandAll().render();
    setExpanded(true);
  };
  const handleCollapseAll = () => {
    chartRef.current?.collapseAll().render();
    setExpanded(false);
  };

  const handleExportPNG = () =>
    chartRef.current?.exportImg({ full: true, scale: 3, exportFileName: "org-chart" });

  const handleExportPDF = () =>
    chartRef.current?.exportPdf({ margin: [20, 20, 20, 20], landscape: true, exportFileName: "org-chart" });

  // ── Legend items ──────────────────────────────────────────────────────────
  const legendItems = Object.entries(ROLE_CONFIG).map(([, cfg]) => cfg);

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2.5 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: 2, bgcolor: "primary.main",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <HubIcon sx={{ color: "white", fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>Organizational Chart</Typography>
          <Typography variant="body2" color="text.secondary">
            Interactive hierarchy — click nodes to center, expand/collapse branches
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 2, py: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>

          {/* Search */}
          <TextField
            size="small"
            placeholder="Search employee by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{ minWidth: 260 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Button variant="contained" size="small" onClick={handleSearch} sx={{ px: 2.5 }}>
            Find
          </Button>

          {searchStatus === "found" && foundEmployee && (
            <Chip
              label={`Found: ${foundEmployee.full_name}`}
              color="success" size="small"
              onDelete={handleClearSearch}
              sx={{ fontWeight: 600 }}
            />
          )}
          {searchStatus === "not_found" && (
            <Chip label="No match found" color="warning" size="small" onDelete={handleClearSearch} sx={{ fontWeight: 600 }} />
          )}

          <Box sx={{ flex: 1 }} />

          {/* Expand / Collapse */}
          <Tooltip title="Expand all">
            <IconButton size="small" onClick={handleExpandAll} color={expanded ? "primary" : "default"}>
              <UnfoldMoreIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Collapse all">
            <IconButton size="small" onClick={handleCollapseAll} color={!expanded ? "primary" : "default"}>
              <UnfoldLessIcon />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Zoom */}
          <Tooltip title="Zoom in">
            <IconButton size="small" onClick={handleZoomIn}><ZoomInIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Zoom out">
            <IconButton size="small" onClick={handleZoomOut}><ZoomOutIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Fit to screen">
            <IconButton size="small" onClick={handleFit}><FitScreenIcon /></IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Export */}
          <Tooltip title="Export as PNG">
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleExportPNG}>
              PNG
            </Button>
          </Tooltip>
          <Tooltip title="Export as PDF">
            <Button variant="outlined" size="small" startIcon={<PictureAsPdfIcon />} onClick={handleExportPDF}>
              PDF
            </Button>
          </Tooltip>
        </Stack>
      </Paper>

      {/* ── Chart Canvas ────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid", borderColor: "divider", borderRadius: 2,
          overflow: "hidden", position: "relative",
          height: "calc(100vh - 320px)", minHeight: 540,
          bgcolor: "#f8fafc",
          backgroundImage: [
            "radial-gradient(circle, rgba(26,58,107,0.12) 1px, transparent 1px)",
          ].join(","),
          backgroundSize: "28px 28px",
        }}
      >
        {/* Loading overlay */}
        {loading && (
          <Box sx={{
            position: "absolute", inset: 0, zIndex: 2,
            display: "flex", alignItems: "center", justifyContent: "center",
            bgcolor: "rgba(248,250,252,0.9)",
          }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">Loading organization chart...</Typography>
            </Stack>
          </Box>
        )}

        {/* Empty state */}
        {!loading && !error && employees.length === 0 && (
          <Box sx={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Stack alignItems="center" spacing={1.5}>
              <HubIcon sx={{ fontSize: 60, color: "text.disabled" }} />
              <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
                No employees found
              </Typography>
              <Typography variant="body2" color="text.disabled">
                Add employees to visualize the organizational hierarchy
              </Typography>
            </Stack>
          </Box>
        )}

        {/* d3-org-chart mount point */}
        <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }} />
      </Paper>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 2.5, py: 1.5 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Role Legend
          </Typography>
          {legendItems.map((cfg) => (
            <Stack key={cfg.label} direction="row" alignItems="center" spacing={0.75}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: cfg.avatarBg, flexShrink: 0 }} />
              <Typography variant="caption" fontWeight={600} sx={{ color: cfg.color }}>
                {cfg.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

OrgChart.propTypes = {};

export default OrgChart;

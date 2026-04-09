import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Skeleton,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  LabelList,
} from "recharts";
import PeopleIcon from "@mui/icons-material/People";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BarChartIcon from "@mui/icons-material/BarChart";
import LocationOffIcon from "@mui/icons-material/LocationOff";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import { getEmployees } from "../services/employeeService";
import { getTeams, getDepartments, getBranches, getOrgLeaderTeams } from "../services/organizationService";
import { getAchievements, getTeamMonthlyStats } from "../services/achievementService";

const PALETTE = {
  navy:    "#1a3a6b",
  green:   "#2e7d32",
  blue:    "#01579b",
  orange:  "#e65100",
  purple:  "#6a1b9a",
  red:     "#c62828",
  teal:    "#00695c",
  amber:   "#f57f17",
};

const PIE_COLORS = Object.values(PALETTE);
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ROLE_LABELS = {
  admin: "Administrator",
  org_leader: "Org Leader",
  manager: "Manager",
  team_lead: "Team Lead",
  team_member: "Team Member",
};

const NON_DIRECT_ROLES = ["manager", "org_leader", "admin"];

/** Custom tooltip for recharts */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1.5, boxShadow: 3 }}>
      {label && <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>{label}</Typography>}
      {payload.map((p) => (
        <Typography key={p.name} variant="caption" display="block" sx={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </Typography>
      ))}
    </Box>
  );
}

/** Section header with an icon badge */
function SectionHeader({ icon: Icon, color, title, subtitle, chip }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
      <Stack direction="row" alignItems="center" gap={1.5}>
        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon sx={{ color: "white", fontSize: 18 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
      </Stack>
      {chip}
    </Stack>
  );
}

/**
 * Analytics and insights page.
 * @returns {JSX.Element}
 */
function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const buildAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, teamRes, deptRes, branchRes, achRes, orgLeaderTeamsRes, teamMonthlyRes] =
        await Promise.allSettled([
          getEmployees(),
          getTeams(),
          getDepartments(),
          getBranches(),
          getAchievements(),
          getOrgLeaderTeams(),
          getTeamMonthlyStats({ year: new Date().getFullYear() }),
        ]);

      const employees      = empRes.status            === "fulfilled" ? empRes.value            : [];
      const teams          = teamRes.status           === "fulfilled" ? teamRes.value           : [];
      const departments    = deptRes.status           === "fulfilled" ? deptRes.value           : [];
      const branches       = branchRes.status         === "fulfilled" ? branchRes.value         : [];
      const achievements   = achRes.status            === "fulfilled" ? achRes.value            : [];
      const orgLeaderTeams = orgLeaderTeamsRes.status === "fulfilled" ? orgLeaderTeamsRes.value : [];
      const teamMonthlyRaw = teamMonthlyRes.status    === "fulfilled" ? teamMonthlyRes.value    : [];

      // ── Role distribution ────────────────────────────────────────────────
      const roleCounts = employees.reduce((acc, emp) => {
        const label = ROLE_LABELS[emp.role] || emp.role;
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {});
      const roleData = Object.entries(roleCounts).map(([name, value]) => ({ name, value }));

      // ── Achievement status breakdown ───────────────────────────────────
      const statusCounts = achievements.reduce(
        (acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; },
        { pending: 0, approved: 0, rejected: 0 }
      );
      const statusBarData = [
        { name: "Approved", value: statusCounts.approved, fill: PALETTE.green },
        { name: "Pending",  value: statusCounts.pending,  fill: PALETTE.amber },
        { name: "Rejected", value: statusCounts.rejected, fill: PALETTE.red },
      ];

      // ── Monthly trend (all achievements, current year) ────────────────
      const currentYear = new Date().getFullYear();
      const monthlyMap = achievements
        .filter((a) => a.year === currentYear)
        .reduce((acc, a) => { acc[a.month] = (acc[a.month] || 0) + 1; return acc; }, {});
      const monthlyData = MONTHS_SHORT.map((name, i) => ({
        name,
        achievements: monthlyMap[i + 1] || 0,
      }));

      // ── Teams per department ───────────────────────────────────────────
      const teamsByDept = departments.map((dept) => ({
        name: dept.name,
        teams: teams.filter((t) => t.department_id === dept.id).length,
      }));

      // ── Q4: Cross-location teams (team leader NOT co-located) ─────────
      const crossLocTeams = teams
        .filter((t) => {
          if (!t.team_lead_id || !t.location) return false;
          const lead = employees.find((e) => e.id === t.team_lead_id);
          return lead && lead.location && lead.location !== t.location;
        })
        .map((t) => {
          const lead = employees.find((e) => e.id === t.team_lead_id);
          return {
            teamName: t.name,
            teamLocation: t.location,
            leaderName: lead?.full_name || "Unknown",
            leaderLocation: lead?.location || "Unknown",
          };
        });

      // ── Q5: Teams whose leader has a non-direct role ───────────────────
      // "Non-direct" = manager, org_leader, or admin — a senior role
      // taking on team-lead responsibility directly.
      const nonDirectLeaderTeams = teams
        .filter((t) => {
          if (!t.team_lead_id) return false;
          const lead = employees.find((e) => e.id === t.team_lead_id);
          return lead && NON_DIRECT_ROLES.includes(lead.role);
        })
        .map((t) => {
          const lead = employees.find((e) => e.id === t.team_lead_id);
          return {
            teamName: t.name,
            teamLocation: t.location || "—",
            leaderName: lead?.full_name || "Unknown",
            leaderRole: ROLE_LABELS[lead?.role] || lead?.role || "Unknown",
          };
        });

      // ── Q6: Per-team non-direct staff ratio ───────────────────────────
      const teamEmployeeMap = employees.reduce((acc, emp) => {
        if (!emp.team_id) return acc;
        if (!acc[emp.team_id]) acc[emp.team_id] = { total: 0, nonDirect: 0 };
        acc[emp.team_id].total += 1;
        if (NON_DIRECT_ROLES.includes(emp.role)) acc[emp.team_id].nonDirect += 1;
        return acc;
      }, {});

      const perTeamRatios = teams
        .map((t) => {
          const counts = teamEmployeeMap[t.id] || { total: 0, nonDirect: 0 };
          const ratio = counts.total > 0
            ? parseFloat(((counts.nonDirect / counts.total) * 100).toFixed(1))
            : 0;
          return {
            teamName: t.name,
            total: counts.total,
            nonDirect: counts.nonDirect,
            ratio,
            overThreshold: ratio > 20,
          };
        })
        .filter((t) => t.total > 0)
        .sort((a, b) => b.ratio - a.ratio);

      const teamsOver20Pct = perTeamRatios.filter((t) => t.overThreshold);

      // ── Org-wide non-direct ratio ─────────────────────────────────────
      const totalEmployees = employees.length;
      const nonDirectCount = employees.filter((e) => NON_DIRECT_ROLES.includes(e.role)).length;
      const nonDirectRatio = totalEmployees > 0
        ? ((nonDirectCount / totalEmployees) * 100).toFixed(1)
        : 0;

      // ── Q7: Teams per org leader — resolved from backend ─────────────
      const orgLeaderData = orgLeaderTeams.map((row) => {
        const leader = employees.find((e) => e.id === row.org_leader_id);
        return {
          branchName: row.branch_name,
          orgLeaderName: leader?.full_name || (row.org_leader_id ? "Assigned" : "Unassigned"),
          location: row.branch_location || "—",
          departmentCount: row.department_count,
          teamCount: row.team_count,
        };
      });
      const totalReportingTeams = orgLeaderTeams.reduce((s, r) => s + r.team_count, 0);

      // ── Q3: Team monthly approved achievements ────────────────────────
      const teamTotals = teamMonthlyRaw.reduce((acc, row) => {
        acc[row.team_id] = (acc[row.team_id] || 0) + row.approved_count;
        return acc;
      }, {});
      const topTeamIds = Object.entries(teamTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id]) => id);
      const teamMonthlyChart = MONTHS_SHORT.map((name, i) => {
        const month = i + 1;
        const entry = { name };
        topTeamIds.forEach((tid) => {
          const teamName = teams.find((t) => t.id === tid)?.name || tid.slice(0, 8);
          const row = teamMonthlyRaw.find((r) => r.team_id === tid && r.month === month);
          entry[teamName] = row?.approved_count || 0;
        });
        return entry;
      });
      const topTeamNames = topTeamIds.map(
        (tid) => teams.find((t) => t.id === tid)?.name || tid.slice(0, 8)
      );

      setData({
        roleData, statusCounts, statusBarData, monthlyData,
        crossLocTeams, nonDirectLeaderTeams, perTeamRatios, teamsOver20Pct,
        nonDirectRatio, nonDirectCount, teamsByDept,
        orgLeaderData, totalReportingTeams,
        teamMonthlyChart, topTeamNames,
        totalEmployees,
        totalAchievements: achievements.length,
        totalTeams: teams.length,
        totalBranches: branches.length,
      });
    } catch {
      setError("Failed to compute analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { buildAnalytics(); }, [buildAnalytics]);

  const skeletonCard = (height = 340) => (
    <Skeleton variant="rectangular" width="100%" height={height} sx={{ borderRadius: 2 }} />
  );

  const CURRENT_YEAR = new Date().getFullYear();

  // Colors for the team monthly stacked bars
  const TEAM_COLORS = Object.values(PALETTE);

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 3 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "primary.main", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <BarChartIcon sx={{ color: "white", fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>Analytics</Typography>
          <Typography variant="body2" color="text.secondary">
            Organizational performance insights and metrics
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="warning" onClose={() => setError("")}>{error}</Alert>}

      {/* ── KPI Row ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }, gap: 2 }}>
        {[
          { label: "Total Employees",        value: data?.totalEmployees ?? 0,           icon: PeopleIcon,           color: PALETTE.navy   },
          { label: "Total Achievements",     value: data?.totalAchievements ?? 0,        icon: EmojiEventsIcon,      color: PALETTE.green  },
          { label: "Total Teams",            value: data?.totalTeams ?? 0,               icon: AccountTreeIcon,      color: PALETTE.blue   },
          { label: "Cross-Location Teams",   value: data?.crossLocTeams?.length ?? 0,    icon: LocationOffIcon,      color: PALETTE.orange },
          { label: "Non-Direct Leader Teams",value: data?.nonDirectLeaderTeams?.length ?? 0, icon: SupervisorAccountIcon, color: PALETTE.purple },
          { label: "Teams w/ Org Leader",    value: data?.totalReportingTeams ?? 0,      icon: WarningAmberIcon,     color: PALETTE.teal   },
        ].map(({ label, value, icon: Icon, color }) =>
          loading ? (
            <Skeleton key={label} variant="rectangular" height={96} sx={{ borderRadius: 2 }} />
          ) : (
            <Card key={label} elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 }, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon sx={{ color: "white", fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, lineHeight: 1.2, display: "block" }}>
                    {label}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} lineHeight={1.2}>{value}</Typography>
                </Box>
              </CardContent>
            </Card>
          )
        )}
      </Box>

      {/* ── Monthly Trend — full width ───────────────────────────────────── */}
      {loading ? skeletonCard(380) : (
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Monthly Achievement Trend</Typography>
                <Typography variant="caption" color="text.secondary">{CURRENT_YEAR} — total submissions per month</Typography>
              </Box>
              <Chip label={`${data?.totalAchievements ?? 0} total`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
            </Stack>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={data?.monthlyData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="achGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE.navy} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={PALETTE.navy} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone" dataKey="achievements" name="Achievements"
                  stroke={PALETTE.navy} strokeWidth={3}
                  fill="url(#achGrad)"
                  dot={{ fill: PALETTE.navy, r: 5, strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 7 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Q3: Team Monthly Approved Achievements ────────────────────────── */}
      {loading ? skeletonCard(400) : (
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader
              icon={EmojiEventsIcon}
              color={PALETTE.green}
              title="Team Monthly Approved Achievements"
              subtitle={`${CURRENT_YEAR} — approved submissions per team per month (top 8 teams)`}
            />
            {(data?.topTeamNames?.length ?? 0) === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>No approved achievements found for {CURRENT_YEAR}.</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={data?.teamMonthlyChart || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: "0.78rem", paddingTop: 12 }} />
                  {(data?.topTeamNames || []).map((name, i) => (
                    <Bar key={name} dataKey={name} stackId="a" fill={TEAM_COLORS[i % TEAM_COLORS.length]} radius={i === (data.topTeamNames.length - 1) ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Two-column row: Role Distribution + Achievement Status ──────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>

        {/* Role Distribution — donut */}
        {loading ? skeletonCard(380) : (
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Role Distribution</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Breakdown of {data?.totalEmployees ?? 0} employees by role
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={data?.roleData || []}
                    dataKey="value"
                    cx="50%" cy="45%"
                    innerRadius={70} outerRadius={120}
                    paddingAngle={3}
                    labelLine={false}
                  >
                    {(data?.roleData || []).map((entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                    <LabelList dataKey="value" position="inside" style={{ fill: "#fff", fontSize: 13, fontWeight: 700 }} />
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={10}
                    wrapperStyle={{ fontSize: "0.82rem", paddingTop: 16 }}
                    formatter={(value) => <span style={{ color: "#1a1a2e" }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Achievement Status — horizontal bars */}
        {loading ? skeletonCard(380) : (
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Achievement Status</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Distribution of all achievement submissions
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={data?.statusBarData || []}
                  layout="vertical"
                  margin={{ top: 8, right: 40, left: 10, bottom: 8 }}
                  barSize={40}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]}>
                    {(data?.statusBarData || []).map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                    <LabelList dataKey="value" position="right" style={{ fontSize: 13, fontWeight: 700, fill: "#1a1a2e" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* ── Teams per Department — full width ───────────────────────────── */}
      {loading ? skeletonCard(360) : (
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Teams per Department</Typography>
                <Typography variant="caption" color="text.secondary">Number of teams allocated to each department</Typography>
              </Box>
              <Chip label={`${data?.totalTeams ?? 0} teams`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
            </Stack>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.teamsByDept || []} margin={{ top: 10, right: 10, left: 0, bottom: 24 }} barSize={36}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.navy} stopOpacity={1} />
                    <stop offset="100%" stopColor={PALETTE.blue} stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={48}
                />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="teams" name="Teams" fill="url(#barGrad)" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="teams" position="top" style={{ fontSize: 12, fontWeight: 700, fill: PALETTE.navy }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Q4: Cross-Location Teams Detail ─────────────────────────────── */}
      {loading ? skeletonCard(200) : (
        <Card elevation={0} sx={{ border: "1px solid", borderColor: (data?.crossLocTeams?.length ?? 0) > 0 ? "warning.main" : "divider", borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader
              icon={LocationOffIcon}
              color={PALETTE.orange}
              title="Teams with Non-Co-Located Leader"
              subtitle="Teams where the team leader is based in a different location from the team"
              chip={
                <Chip
                  label={`${data?.crossLocTeams?.length ?? 0} team(s)`}
                  size="small"
                  color={(data?.crossLocTeams?.length ?? 0) > 0 ? "warning" : "default"}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              }
            />
            {(data?.crossLocTeams?.length ?? 0) === 0 ? (
              <Typography variant="body2" color="text.secondary">All team leaders are co-located with their teams.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "action.hover" } }}>
                      <TableCell>Team</TableCell>
                      <TableCell>Team Location</TableCell>
                      <TableCell>Leader Name</TableCell>
                      <TableCell>Leader Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.crossLocTeams || []).map((row, i) => (
                      <TableRow key={i} hover>
                        <TableCell><Typography variant="body2" fontWeight={600}>{row.teamName}</Typography></TableCell>
                        <TableCell><Chip label={row.teamLocation} size="small" variant="outlined" /></TableCell>
                        <TableCell>{row.leaderName}</TableCell>
                        <TableCell><Chip label={row.leaderLocation} size="small" color="warning" variant="outlined" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Q5: Non-Direct Leader Teams ─────────────────────────────────── */}
      {loading ? skeletonCard(200) : (
        <Card elevation={0} sx={{ border: "1px solid", borderColor: (data?.nonDirectLeaderTeams?.length ?? 0) > 0 ? "secondary.main" : "divider", borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader
              icon={SupervisorAccountIcon}
              color={PALETTE.purple}
              title="Teams with Non-Direct Staff as Leader"
              subtitle="Teams whose designated leader holds a manager, org-leader, or admin role"
              chip={
                <Chip
                  label={`${data?.nonDirectLeaderTeams?.length ?? 0} team(s)`}
                  size="small"
                  color={(data?.nonDirectLeaderTeams?.length ?? 0) > 0 ? "secondary" : "default"}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              }
            />
            {(data?.nonDirectLeaderTeams?.length ?? 0) === 0 ? (
              <Typography variant="body2" color="text.secondary">All team leaders have the standard Team Lead role.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "action.hover" } }}>
                      <TableCell>Team</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Leader Name</TableCell>
                      <TableCell>Leader Role</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.nonDirectLeaderTeams || []).map((row, i) => (
                      <TableRow key={i} hover>
                        <TableCell><Typography variant="body2" fontWeight={600}>{row.teamName}</Typography></TableCell>
                        <TableCell>{row.teamLocation}</TableCell>
                        <TableCell>{row.leaderName}</TableCell>
                        <TableCell><Chip label={row.leaderRole} size="small" color="secondary" variant="outlined" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Q6: Per-Team Non-Direct Staff Ratio ─────────────────────────── */}
      {loading ? skeletonCard(220) : (
        <Card
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: (data?.teamsOver20Pct?.length ?? 0) > 0 ? "error.main" : "divider",
            borderRadius: 2,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <SectionHeader
              icon={WarningAmberIcon}
              color={(data?.teamsOver20Pct?.length ?? 0) > 0 ? PALETTE.red : PALETTE.purple}
              title="Non-Direct Staff Ratio per Team"
              subtitle="Teams with >20% non-direct staff (managers, org leaders, admins) are highlighted"
              chip={
                <Chip
                  label={`${data?.teamsOver20Pct?.length ?? 0} team(s) above 20%`}
                  size="small"
                  color={(data?.teamsOver20Pct?.length ?? 0) > 0 ? "error" : "default"}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              }
            />
            <Box sx={{ mb: 2, p: 1.5, borderRadius: 1, bgcolor: "action.hover", display: "inline-flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">Org-wide ratio:</Typography>
              <Typography variant="body2" fontWeight={700} color={parseFloat(data?.nonDirectRatio) > 20 ? "error.main" : "text.primary"}>
                {data?.nonDirectRatio ?? 0}% ({data?.nonDirectCount ?? 0} / {data?.totalEmployees ?? 0})
              </Typography>
            </Box>
            {(data?.perTeamRatios?.length ?? 0) === 0 ? (
              <Typography variant="body2" color="text.secondary">No team employee data available.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "action.hover" } }}>
                      <TableCell>Team</TableCell>
                      <TableCell align="right">Total Members</TableCell>
                      <TableCell align="right">Non-Direct</TableCell>
                      <TableCell align="right">Ratio</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.perTeamRatios || []).map((row, i) => (
                      <TableRow key={i} hover sx={{ bgcolor: row.overThreshold ? "error.light" : "inherit" }}>
                        <TableCell><Typography variant="body2" fontWeight={600}>{row.teamName}</Typography></TableCell>
                        <TableCell align="right">{row.total}</TableCell>
                        <TableCell align="right">{row.nonDirect}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color={row.overThreshold ? "error.main" : "text.primary"}>
                            {row.ratio}%
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {row.overThreshold
                            ? <Chip label="Above 20%" color="error" size="small" sx={{ fontWeight: 600 }} />
                            : <Chip label="OK" color="success" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Q7: Teams Reporting to Each Org Leader ───────────────────────── */}
      {loading ? skeletonCard(200) : (
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader
              icon={AccountTreeIcon}
              color={PALETTE.teal}
              title="Teams Reporting to Organization Leaders"
              subtitle="Number of teams under each branch / organization leader"
              chip={
                <Chip
                  label={`${data?.totalReportingTeams ?? 0} total team(s)`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              }
            />
            {(data?.orgLeaderData?.length ?? 0) === 0 ? (
              <Typography variant="body2" color="text.secondary">No branches configured.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "action.hover" } }}>
                      <TableCell>Branch</TableCell>
                      <TableCell>Org Leader</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell align="right">Departments</TableCell>
                      <TableCell align="right">Teams</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.orgLeaderData || []).map((row, i) => (
                      <TableRow key={i} hover>
                        <TableCell><Typography variant="body2" fontWeight={600}>{row.branchName}</Typography></TableCell>
                        <TableCell>{row.orgLeaderName}</TableCell>
                        <TableCell>{row.location}</TableCell>
                        <TableCell align="right">{row.departmentCount}</TableCell>
                        <TableCell align="right">
                          <Chip label={row.teamCount} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableBody>
                    <TableRow sx={{ bgcolor: "action.hover" }}>
                      <TableCell colSpan={4}><Typography variant="body2" fontWeight={700}>Total</Typography></TableCell>
                      <TableCell align="right">
                        <Chip label={data?.totalReportingTeams ?? 0} size="small" color="primary" sx={{ fontWeight: 700 }} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

    </Box>
  );
}

export default Analytics;

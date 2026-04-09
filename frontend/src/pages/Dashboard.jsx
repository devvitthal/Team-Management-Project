import { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  Skeleton,
  Paper,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import BusinessIcon from "@mui/icons-material/Business";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import PropTypes from "prop-types";
import { getEmployees } from "../services/employeeService";
import { getTeams, getBranches, getDepartments } from "../services/organizationService";
import { getAchievements } from "../services/achievementService";
import { useAuth } from "../contexts/AuthContext";

const ROLE_LABELS = {
  admin: "Administrator",
  org_leader: "Organization Leader",
  manager: "Manager",
  team_lead: "Team Lead",
  team_member: "Team Member",
};

/**
 * Summary stat card component.
 * @param {object} props
 * @param {string} props.title
 * @param {number|string} props.value
 * @param {React.ElementType} props.icon
 * @param {string} props.color - MUI color name
 * @param {boolean} props.loading
 */
function StatCard({ title, value, icon: Icon, color, loading }) {
  return (
    <Card elevation={1} sx={{ height: "100%", borderRadius: 2 }}>
      <CardContent className="flex items-center gap-4 p-5">
        <Box
          className="flex items-center justify-center rounded-xl shrink-0"
          sx={{ width: 52, height: 52, bgcolor: `${color}.main` }}
        >
          <Icon sx={{ color: "white", fontSize: 24 }} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" className="uppercase tracking-wider font-semibold">
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={48} height={36} />
          ) : (
            <Typography variant="h4" fontWeight={700} lineHeight={1.2}>
              {value}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
};

/**
 * Dashboard overview page.
 * @returns {JSX.Element}
 */
function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [employees, teams, branches, departments, achievements] = await Promise.allSettled([
          getEmployees(),
          getTeams(),
          getBranches(),
          getDepartments(),
          getAchievements(),
        ]);

        const e = employees.status === "fulfilled" ? employees.value : [];
        const t = teams.status === "fulfilled" ? teams.value : [];
        const b = branches.status === "fulfilled" ? branches.value : [];
        const d = departments.status === "fulfilled" ? departments.value : [];
        const a = achievements.status === "fulfilled" ? achievements.value : [];

        setStats({
          employees: e.length,
          teams: t.length,
          branches: b.length,
          departments: d.length,
          achievements: a.length,
          pending: a.filter((x) => x.status === "pending").length,
          approved: a.filter((x) => x.status === "approved").length,
          rejected: a.filter((x) => x.status === "rejected").length,
        });
      } catch {
        setError("Failed to load dashboard statistics.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const orgStats = [
    { title: "Total Employees", value: stats?.employees ?? 0, icon: PeopleIcon, color: "primary" },
    { title: "Branches", value: stats?.branches ?? 0, icon: BusinessIcon, color: "secondary" },
    { title: "Departments", value: stats?.departments ?? 0, icon: CorporateFareIcon, color: "info" },
    { title: "Teams", value: stats?.teams ?? 0, icon: GroupWorkIcon, color: "warning" },
  ];

  const achStats = [
    { title: "Total Achievements", value: stats?.achievements ?? 0, icon: EmojiEventsIcon, color: "warning" },
    { title: "Pending Review", value: stats?.pending ?? 0, icon: HourglassEmptyIcon, color: "error" },
    { title: "Approved", value: stats?.approved ?? 0, icon: CheckCircleOutlineIcon, color: "success" },
    { title: "Rejected", value: stats?.rejected ?? 0, icon: AccountTreeIcon, color: "error" },
  ];

  return (
    <Box>
      <Box className="mb-6">
        <Typography variant="h4" fontWeight={700}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Welcome back, <strong>{user?.full_name}</strong> &mdash; {ROLE_LABELS[user?.role] || user?.role}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {currentDate}
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" fontWeight={600} className="mb-3" sx={{ mb: 2 }}>
        Organization Overview
      </Typography>
      <Grid container spacing={3} className="mb-6" sx={{ mb: 4 }}>
        {orgStats.map((s) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={s.title}>
            <StatCard {...s} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Achievement Overview
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {achStats.map((s) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={s.title}>
            <StatCard {...s} loading={loading} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Dashboard;

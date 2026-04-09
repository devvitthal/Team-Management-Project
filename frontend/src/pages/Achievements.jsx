import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Skeleton,
  Divider,
  Grid,
  Tabs,
  Tab,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SummarizeIcon from "@mui/icons-material/Summarize";
import PropTypes from "prop-types";
import {
  getAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  getTeamSummaries,
  createTeamSummary,
  deleteTeamSummary,
} from "../services/achievementService";
import { getEmployees } from "../services/employeeService";
import { getTeams } from "../services/organizationService";
import { useAuth } from "../contexts/AuthContext";

const STATUS_COLOR = { pending: "warning", approved: "success", rejected: "error" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

/**
 * Achievement form dialog.
 * @param {object} props
 */
function AchievementDialog({ open, onClose, onSave, editing, employees, error }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "",
    description: "",
    month: new Date().getMonth() + 1,
    year: CURRENT_YEAR,
    employee_id: "",
  });

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title || "",
        description: editing.description || "",
        month: editing.month || new Date().getMonth() + 1,
        year: editing.year || CURRENT_YEAR,
        employee_id: editing.employee_id || "",
      });
    } else {
      setForm({
        title: "",
        description: "",
        month: new Date().getMonth() + 1,
        year: CURRENT_YEAR,
        employee_id: employees.find((e) => e.user_id === user?.id)?.id || "",
      });
    }
  }, [editing, open, user, employees]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? "Edit Achievement" : "Submit Achievement"}</DialogTitle>
      <Divider />
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Title *" name="title" value={form.title} onChange={handleChange} />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth size="small" multiline rows={3}
              label="Description" name="description" value={form.description} onChange={handleChange}
            />
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Employee *</InputLabel>
              <Select
                name="employee_id"
                value={form.employee_id}
                onChange={handleChange}
                label="Employee *"
                disabled={!!editing || user?.role === "team_member"}
              >
                {(user?.role === "team_member"
                  ? employees.filter((e) => e.user_id === user?.id)
                  : employees
                ).map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Month *</InputLabel>
              <Select name="month" value={form.month} onChange={handleChange} label="Month *">
                {MONTHS.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Year *</InputLabel>
              <Select name="year" value={form.year} onChange={handleChange} label="Year *">
                {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" size="small">Cancel</Button>
        <Button onClick={() => onSave(form)} variant="contained" size="small">Save</Button>
      </DialogActions>
    </Dialog>
  );
}

AchievementDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  editing: PropTypes.object,
  employees: PropTypes.array.isRequired,
  error: PropTypes.string,
};

AchievementDialog.defaultProps = { editing: null, error: "" };

/**
 * Team Summary form dialog.
 * @param {object} props
 */
function TeamSummaryDialog({ open, onClose, onSave, teams, error }) {
  const [form, setForm] = useState({
    team_id: "",
    month: new Date().getMonth() + 1,
    year: CURRENT_YEAR,
    title: "",
    summary: "",
  });

  useEffect(() => {
    if (open) {
      setForm({ team_id: "", month: new Date().getMonth() + 1, year: CURRENT_YEAR, title: "", summary: "" });
    }
  }, [open]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Team Summary</DialogTitle>
      <Divider />
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Team *</InputLabel>
              <Select name="team_id" value={form.team_id} onChange={handleChange} label="Team *">
                {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Summary Title *" name="title" value={form.title} onChange={handleChange} />
          </Grid>
          <Grid size={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Month *</InputLabel>
              <Select name="month" value={form.month} onChange={handleChange} label="Month *">
                {MONTHS.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Year *</InputLabel>
              <Select name="year" value={form.year} onChange={handleChange} label="Year *">
                {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth size="small" multiline rows={4}
              label="Summary Notes" name="summary" value={form.summary} onChange={handleChange}
              placeholder="Describe the team's highlights for this month..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" size="small">Cancel</Button>
        <Button onClick={() => onSave(form)} variant="contained" size="small">Create Summary</Button>
      </DialogActions>
    </Dialog>
  );
}

TeamSummaryDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  teams: PropTypes.array.isRequired,
  error: PropTypes.string,
};
TeamSummaryDialog.defaultProps = { error: "" };

/**
 * Achievements management page.
 * @returns {JSX.Element}
 */
function Achievements() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState(0);

  // -- Individual achievements state ----------------------------------------
  const [achievements, setAchievements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", month: 0, year: 0 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  // -- Team summaries state -------------------------------------------------
  const [summaries, setSummaries] = useState([]);
  const [teams, setTeams] = useState([]);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryFormError, setSummaryFormError] = useState("");
  const [summaryDeleteTarget, setSummaryDeleteTarget] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const canManageSummaries = ["admin", "org_leader", "manager", "team_lead"].includes(user?.role);
  const canEdit = ["admin", "org_leader", "manager", "team_lead"].includes(user?.role);
  const canDelete = ["admin", "org_leader", "manager"].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.month) params.month = filters.month;
      if (filters.year) params.year = filters.year;
      const [a, e] = await Promise.allSettled([getAchievements(params), getEmployees()]);
      setAchievements(a.status === "fulfilled" ? a.value : []);
      setEmployees(e.status === "fulfilled" ? e.value : []);
    } catch {
      setError("Failed to load achievements.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchSummaries = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const [s, t] = await Promise.allSettled([getTeamSummaries(), getTeams()]);
      setSummaries(s.status === "fulfilled" ? s.value : []);
      setTeams(t.status === "fulfilled" ? t.value : []);
    } catch {
      setError("Failed to load team summaries.");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  const handleSave = async (form) => {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    if (!form.employee_id) { setFormError("Employee is required."); return; }
    try {
      const payload = { ...form, month: Number(form.month), year: Number(form.year), submitted_by: user?.id };
      if (editing) {
        await updateAchievement(editing.id, payload);
      } else {
        await createAchievement(payload);
      }
      setDialogOpen(false);
      setEditing(null);
      setFormError("");
      fetchData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setFormError(typeof detail === "string" ? detail : "Save failed.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAchievement(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch {
      setError("Failed to delete achievement.");
      setDeleteTarget(null);
    }
  };

  const handleSummaryCreate = async (form) => {
    if (!form.team_id) { setSummaryFormError("Team is required."); return; }
    if (!form.title.trim()) { setSummaryFormError("Title is required."); return; }
    try {
      await createTeamSummary({ ...form, month: Number(form.month), year: Number(form.year) });
      setSummaryDialogOpen(false);
      setSummaryFormError("");
      fetchSummaries();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setSummaryFormError(typeof detail === "string" ? detail : "Failed to create summary.");
    }
  };

  const handleSummaryDelete = async () => {
    if (!summaryDeleteTarget) return;
    try {
      await deleteTeamSummary(summaryDeleteTarget.id);
      setSummaryDeleteTarget(null);
      fetchSummaries();
    } catch {
      setError("Failed to delete team summary.");
      setSummaryDeleteTarget(null);
    }
  };

  const getEmployeeName = (id) => employees.find((e) => e.id === id)?.full_name || id;
  const getTeamName = (id) => teams.find((t) => t.id === id)?.name || id;
  const paged = achievements.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box className="flex items-center justify-between mb-4">
        <Box>
          <Typography variant="h4" fontWeight={700}>Achievements</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Submit and track individual and team achievement records
          </Typography>
        </Box>
        {mainTab === 0 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditing(null); setFormError(""); setDialogOpen(true); }}
          >
            Submit Achievement
          </Button>
        )}
        {mainTab === 1 && canManageSummaries && (
          <Button
            variant="contained"
            startIcon={<SummarizeIcon />}
            onClick={() => { setSummaryFormError(""); setSummaryDialogOpen(true); }}
          >
            Create Team Summary
          </Button>
        )}
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)}>
          <Tab label={`Individual (${achievements.length})`} />
          <Tab label={`Team Summaries (${summaries.length})`} />
        </Tabs>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {/* -- Individual Achievements Tab ----------------------------------- */}
      {mainTab === 0 && (
        <>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Card elevation={1} sx={{ mb: 3, p: 2, borderRadius: 2 }}>
        <Box className="flex flex-wrap gap-3 items-center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(0); }} label="Status">
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Month</InputLabel>
            <Select value={filters.month} onChange={(e) => { setFilters((f) => ({ ...f, month: e.target.value })); setPage(0); }} label="Month">
              <MenuItem value={0}>All Months</MenuItem>
              {MONTHS.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Year</InputLabel>
            <Select value={filters.year} onChange={(e) => { setFilters((f) => ({ ...f, year: e.target.value })); setPage(0); }} label="Year">
              <MenuItem value={0}>All Years</MenuItem>
              {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            {achievements.length} record{achievements.length !== 1 ? "s" : ""}
          </Typography>
        </Box>
      </Card>

      <Card elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "background.default" }}>
                {["Title", "Employee", "Month / Year", "Status", ...(canEdit || canDelete ? ["Actions"] : [])].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                    </TableRow>
                  ))
                : paged.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell sx={{ fontWeight: 600, maxWidth: 240 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{a.title}</Typography>
                        {a.description && (
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {a.description.substring(0, 80)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{getEmployeeName(a.employee_id)}</TableCell>
                      <TableCell>{MONTHS[a.month - 1]} {a.year}</TableCell>
                      <TableCell>
                        <Chip size="small" label={a.status} color={STATUS_COLOR[a.status] || "default"} variant="outlined" />
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell>
                          {canEdit && (
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => { setEditing(a); setFormError(""); setDialogOpen(true); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => setDeleteTarget(a)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
              {!loading && achievements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No achievements found. Submit one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={achievements.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Card>

      <AchievementDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); setFormError(""); }}
        onSave={handleSave}
        editing={editing}
        employees={employees}
        error={formError}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setDeleteTarget(null)} variant="outlined" size="small">Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" size="small">Delete</Button>
        </DialogActions>
      </Dialog>
      </>
      )}

      {/* -- Team Summaries Tab -------------------------------------------- */}
      {mainTab === 1 && (
        <>
          <Card elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "background.default" }}>
                    {["Team", "Period", "Title", "Approved #", "Notes", "Actions"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summaryLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                        </TableRow>
                      ))
                    : summaries.map((s) => (
                        <TableRow key={s.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{getTeamName(s.team_id)}</TableCell>
                          <TableCell>{MONTHS[s.month - 1]} {s.year}</TableCell>
                          <TableCell>{s.title}</TableCell>
                          <TableCell>
                            <Chip size="small" label={s.approved_count} color="success" variant="outlined" />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200 }}>
                            <Typography variant="body2" noWrap>{s.summary || "�"}</Typography>
                          </TableCell>
                          <TableCell>
                            {canManageSummaries && (
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => setSummaryDeleteTarget(s)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  {!summaryLoading && summaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                        No team summaries created yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <TeamSummaryDialog
            open={summaryDialogOpen}
            onClose={() => { setSummaryDialogOpen(false); setSummaryFormError(""); }}
            onSave={handleSummaryCreate}
            teams={teams}
            error={summaryFormError}
          />

          <Dialog open={!!summaryDeleteTarget} onClose={() => setSummaryDeleteTarget(null)} maxWidth="xs" fullWidth>
            <DialogTitle>Delete Team Summary</DialogTitle>
            <DialogContent>
              <Typography variant="body2">
                Delete summary <strong>{summaryDeleteTarget?.title}</strong>? This cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5 }}>
              <Button onClick={() => setSummaryDeleteTarget(null)} variant="outlined" size="small">Cancel</Button>
              <Button onClick={handleSummaryDelete} variant="contained" color="error" size="small">Delete</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
}

export default Achievements;

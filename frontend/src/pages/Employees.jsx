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
  InputAdornment,
  Grid,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PropTypes from "prop-types";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../services/employeeService";
import { getBranches, getDepartments, getTeams } from "../services/organizationService";
import { useAuth } from "../contexts/AuthContext";

const ROLES = [
  { value: "team_member", label: "Team Member" },
  { value: "team_lead", label: "Team Lead" },
  { value: "manager", label: "Manager" },
  { value: "org_leader", label: "Organization Leader" },
  { value: "admin", label: "Administrator" },
];

const ROLE_COLOR = {
  admin: "error",
  org_leader: "secondary",
  manager: "primary",
  team_lead: "info",
  team_member: "default",
};

const EMPTY_FORM = {
  full_name: "",
  email: "",
  phone: "",
  role: "team_member",
  designation: "",
  location: "",
  employee_code: "",
  manager_id: "",
  team_id: "",
  department_id: "",
  branch_id: "",
};

/**
 * Employee create/edit dialog.
 * @param {object} props
 */
function EmployeeDialog({ open, onClose, onSave, editing, error, employees, branches, departments, teams }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              full_name: editing.full_name || "",
              email: editing.email || "",
              phone: editing.phone || "",
              role: editing.role || "team_member",
              designation: editing.designation || "",
              location: editing.location || "",
              employee_code: editing.employee_code || "",
              manager_id: editing.manager_id || "",
              team_id: editing.team_id || "",
              department_id: editing.department_id || "",
              branch_id: editing.branch_id || "",
            }
          : EMPTY_FORM
      );
    }
  }, [editing, open]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // Filter managers: employees who can manage others
  const managerOptions = employees.filter(
    (e) => ["manager", "org_leader", "admin", "team_lead"].includes(e.role) && e.id !== editing?.id
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
      <Divider />
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Basic Info */}
          <Grid size={12}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Basic Information
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Full Name *" name="full_name" value={form.full_name} onChange={handleChange} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Email *" name="email" type="email" value={form.email} onChange={handleChange} disabled={!!editing} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Phone" name="phone" value={form.phone} onChange={handleChange} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Employee Code" name="employee_code" value={form.employee_code} onChange={handleChange} placeholder="EMP001" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Designation" name="designation" value={form.designation} onChange={handleChange} placeholder="Software Engineer" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Location" name="location" value={form.location} onChange={handleChange} placeholder="City, Country" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Role *</InputLabel>
              <Select name="role" value={form.role} onChange={handleChange} label="Role *">
                {ROLES.map(({ value, label }) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Reporting Manager</InputLabel>
              <Select name="manager_id" value={form.manager_id} onChange={handleChange} label="Reporting Manager">
                <MenuItem value=""><em>None</em></MenuItem>
                {managerOptions.map((e) => (
                  <MenuItem key={e.id} value={e.id}>{e.full_name} ({ROLES.find((r) => r.value === e.role)?.label || e.role})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Organization Assignment */}
          <Grid size={12} sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Organization Assignment
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Branch</InputLabel>
              <Select name="branch_id" value={form.branch_id} onChange={handleChange} label="Branch">
                <MenuItem value=""><em>None</em></MenuItem>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select name="department_id" value={form.department_id} onChange={handleChange} label="Department">
                <MenuItem value=""><em>None</em></MenuItem>
                {departments
                  .filter((d) => !form.branch_id || d.branch_id === form.branch_id)
                  .map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Team</InputLabel>
              <Select name="team_id" value={form.team_id} onChange={handleChange} label="Team">
                <MenuItem value=""><em>None</em></MenuItem>
                {teams
                  .filter((t) => !form.department_id || t.department_id === form.department_id)
                  .map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
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

EmployeeDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  editing: PropTypes.object,
  error: PropTypes.string,
  employees: PropTypes.array.isRequired,
  branches: PropTypes.array.isRequired,
  departments: PropTypes.array.isRequired,
  teams: PropTypes.array.isRequired,
};

EmployeeDialog.defaultProps = { editing: null, error: "" };

/**
 * Employees management page.
 * @returns {JSX.Element}
 */
const WRITER_ROLES = ["admin", "org_leader", "manager"];

function Employees() {
  const { user } = useAuth();
  const canWrite = WRITER_ROLES.includes(user?.role);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const [empRes, brRes, deptRes, teamRes] = await Promise.allSettled([
        getEmployees(params),
        getBranches(),
        getDepartments(),
        getTeams(),
      ]);
      setEmployees(empRes.status === "fulfilled" ? empRes.value : []);
      setBranches(brRes.status === "fulfilled" ? brRes.value : []);
      setDepartments(deptRes.status === "fulfilled" ? deptRes.value : []);
      setTeams(teamRes.status === "fulfilled" ? teamRes.value : []);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (form) => {
    if (!form.full_name.trim() || !form.email.trim()) {
      setFormError("Full name and email are required.");
      return;
    }
    try {
      // Convert empty strings to null for optional FK fields
      const payload = {
        ...form,
        manager_id: form.manager_id || null,
        team_id: form.team_id || null,
        department_id: form.department_id || null,
        branch_id: form.branch_id || null,
      };
      if (editing) {
        await updateEmployee(editing.id, payload);
      } else {
        await createEmployee(payload);
      }
      setDialogOpen(false);
      setEditing(null);
      setFormError("");
      fetchAll();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setFormError(Array.isArray(detail) ? detail.map((d) => d.msg).join(". ") : detail || "Save failed.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEmployee(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError("Failed to delete employee.");
      setDeleteTarget(null);
    }
  };

  const getName = (id, list) => list.find((x) => x.id === id)?.name || null;
  const getEmpName = (id) => employees.find((e) => e.id === id)?.full_name || null;
  const paged = employees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box className="flex items-center justify-between mb-6">
        <Box>
          <Typography variant="h4" fontWeight={700}>Employees</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Manage team members, roles, and organizational assignments
          </Typography>
        </Box>
        {canWrite && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditing(null); setFormError(""); setDialogOpen(true); }}
          >
            Add Employee
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Card elevation={1} sx={{ mb: 3, p: 2, borderRadius: 2 }}>
        <Box className="flex flex-wrap gap-3 items-center">
          <TextField
            size="small"
            placeholder="Search by name, email, or designation..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ flex: "1 1 240px" }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Role</InputLabel>
            <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }} label="Role">
              <MenuItem value="">All Roles</MenuItem>
              {ROLES.map(({ value, label }) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            {employees.length} record{employees.length !== 1 ? "s" : ""}
          </Typography>
        </Box>
      </Card>

      <Card elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "background.default" }}>
                {["Name", "Email", "Role", "Designation", "Manager", "Team", "Location", ...(canWrite ? ["Actions"] : [])].map((h) => (
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
                      {Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                    </TableRow>
                  ))
                : paged.map((emp) => (
                    <TableRow key={emp.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{emp.full_name}</TableCell>
                      <TableCell sx={{ fontSize: "0.8rem" }}>{emp.email}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ROLES.find((r) => r.value === emp.role)?.label || emp.role}
                          color={ROLE_COLOR[emp.role] || "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{emp.designation || ""}</TableCell>
                      <TableCell>{emp.manager_id ? (getEmpName(emp.manager_id) || <Typography variant="caption" color="text.secondary">ID: {String(emp.manager_id).slice(0, 8)}</Typography>) : ""}</TableCell>
                      <TableCell>{emp.team_id ? (getName(emp.team_id, teams) || "") : ""}</TableCell>
                      <TableCell>{emp.location || ""}</TableCell>
                      {canWrite && (
                        <TableCell>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => { setEditing(emp); setFormError(""); setDialogOpen(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(emp)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
              {!loading && employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No employees found. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={employees.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      <EmployeeDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); setFormError(""); }}
        onSave={handleSave}
        editing={editing}
        error={formError}
        employees={employees}
        branches={branches}
        departments={departments}
        teams={teams}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete <strong>{deleteTarget?.full_name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setDeleteTarget(null)} variant="outlined" size="small">Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" size="small">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Employees;

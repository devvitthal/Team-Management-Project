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
  Tabs,
  Tab,
  Grid,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PropTypes from "prop-types";
import {
  getBranches, createBranch, updateBranch, deleteBranch,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getTeams, createTeam, updateTeam, deleteTeam,
} from "../services/organizationService";
import { getEmployees } from "../services/employeeService";

//  Branch Dialog 

const EMPTY_BRANCH = { name: "", location: "", org_leader_id: "" };

function BranchDialog({ open, onClose, onSave, editing, error, employees }) {
  const [form, setForm] = useState(EMPTY_BRANCH);

  useEffect(() => {
    if (open) {
      setForm(editing
        ? { name: editing.name || "", location: editing.location || "", org_leader_id: editing.org_leader_id || "" }
        : EMPTY_BRANCH);
    }
  }, [editing, open]);

  const orgLeaders = employees.filter((e) => ["org_leader", "admin"].includes(e.role));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? "Edit Branch" : "Add Branch"}</DialogTitle>
      <Divider />
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Branch Name *" name="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Location" name="location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Organization Leader</InputLabel>
              <Select
                value={form.org_leader_id}
                onChange={(e) => setForm((p) => ({ ...p, org_leader_id: e.target.value }))}
                label="Organization Leader"
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {orgLeaders.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>)}
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
BranchDialog.propTypes = { open: PropTypes.bool.isRequired, onClose: PropTypes.func.isRequired, onSave: PropTypes.func.isRequired, editing: PropTypes.object, error: PropTypes.string, employees: PropTypes.array.isRequired };
BranchDialog.defaultProps = { editing: null, error: "" };

//  Department Dialog 

const EMPTY_DEPT = { name: "", branch_id: "", manager_id: "" };

function DepartmentDialog({ open, onClose, onSave, editing, error, employees, branches }) {
  const [form, setForm] = useState(EMPTY_DEPT);

  useEffect(() => {
    if (open) {
      setForm(editing
        ? { name: editing.name || "", branch_id: editing.branch_id || "", manager_id: editing.manager_id || "" }
        : EMPTY_DEPT);
    }
  }, [editing, open]);

  const managers = employees.filter((e) => ["manager", "admin", "org_leader"].includes(e.role));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? "Edit Department" : "Add Department"}</DialogTitle>
      <Divider />
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Department Name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Branch</InputLabel>
              <Select value={form.branch_id} onChange={(e) => setForm((p) => ({ ...p, branch_id: e.target.value }))} label="Branch">
                <MenuItem value=""><em>None</em></MenuItem>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Department Manager</InputLabel>
              <Select value={form.manager_id} onChange={(e) => setForm((p) => ({ ...p, manager_id: e.target.value }))} label="Department Manager">
                <MenuItem value=""><em>None</em></MenuItem>
                {managers.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>)}
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
DepartmentDialog.propTypes = { open: PropTypes.bool.isRequired, onClose: PropTypes.func.isRequired, onSave: PropTypes.func.isRequired, editing: PropTypes.object, error: PropTypes.string, employees: PropTypes.array.isRequired, branches: PropTypes.array.isRequired };
DepartmentDialog.defaultProps = { editing: null, error: "" };

//  Team Dialog 

const EMPTY_TEAM = { name: "", department_id: "", location: "", team_lead_id: "" };

function TeamDialog({ open, onClose, onSave, editing, error, employees, departments }) {
  const [form, setForm] = useState(EMPTY_TEAM);

  useEffect(() => {
    if (open) {
      setForm(editing
        ? { name: editing.name || "", department_id: editing.department_id || "", location: editing.location || "", team_lead_id: editing.team_lead_id || "" }
        : EMPTY_TEAM);
    }
  }, [editing, open]);

  const teamLeads = employees.filter((e) => ["team_lead", "manager", "admin"].includes(e.role));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? "Edit Team" : "Add Team"}</DialogTitle>
      <Divider />
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Team Name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select value={form.department_id} onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value }))} label="Department">
                <MenuItem value=""><em>None</em></MenuItem>
                {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Team Lead</InputLabel>
              <Select value={form.team_lead_id} onChange={(e) => setForm((p) => ({ ...p, team_lead_id: e.target.value }))} label="Team Lead">
                <MenuItem value=""><em>None</em></MenuItem>
                {teamLeads.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>)}
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
TeamDialog.propTypes = { open: PropTypes.bool.isRequired, onClose: PropTypes.func.isRequired, onSave: PropTypes.func.isRequired, editing: PropTypes.object, error: PropTypes.string, employees: PropTypes.array.isRequired, departments: PropTypes.array.isRequired };
TeamDialog.defaultProps = { editing: null, error: "" };

//  Delete Confirm 

function DeleteConfirm({ open, name, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Confirm Deletion</DialogTitle>
      <DialogContent>
        <Typography variant="body2">Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onCancel} variant="outlined" size="small">Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error" size="small">Delete</Button>
      </DialogActions>
    </Dialog>
  );
}
DeleteConfirm.propTypes = { open: PropTypes.bool.isRequired, name: PropTypes.string, onConfirm: PropTypes.func.isRequired, onCancel: PropTypes.func.isRequired };
DeleteConfirm.defaultProps = { name: "" };

//  Main Page 

function Organization() {
  const [tab, setTab] = useState(0);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [brRes, deptRes, teamRes, empRes] = await Promise.allSettled([
        getBranches(), getDepartments(), getTeams(), getEmployees(),
      ]);
      setBranches(brRes.status === "fulfilled" ? brRes.value : []);
      setDepartments(deptRes.status === "fulfilled" ? deptRes.value : []);
      setTeams(teamRes.status === "fulfilled" ? teamRes.value : []);
      setEmployees(empRes.status === "fulfilled" ? empRes.value : []);
    } catch {
      setError("Failed to load organization data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const getEmpName = (id) => {
    if (!id) return "";
    const e = employees.find((emp) => emp.id === id);
    return e ? e.full_name : <Typography component="span" variant="caption" color="text.secondary">ID: {String(id).slice(0, 8)}</Typography>;
  };
  const getBranchName = (id) => branches.find((b) => b.id === id)?.name || "";
  const getDeptName = (id) => departments.find((d) => d.id === id)?.name || "";

  const openAdd = () => { setEditing(null); setFormError(""); setDialogOpen(true); };
  const openEdit = (item) => { setEditing(item); setFormError(""); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); setFormError(""); };

  const handleSaveBranch = async (form) => {
    if (!form.name.trim()) { setFormError("Branch name is required."); return; }
    try {
      const payload = { ...form, org_leader_id: form.org_leader_id || null };
      editing ? await updateBranch(editing.id, payload) : await createBranch(payload);
      closeDialog(); loadAll();
    } catch (err) {
      setFormError(err.response?.data?.detail || "Save failed.");
    }
  };

  const handleSaveDept = async (form) => {
    if (!form.name.trim()) { setFormError("Department name is required."); return; }
    try {
      const payload = { ...form, branch_id: form.branch_id || null, manager_id: form.manager_id || null };
      editing ? await updateDepartment(editing.id, payload) : await createDepartment(payload);
      closeDialog(); loadAll();
    } catch (err) {
      setFormError(err.response?.data?.detail || "Save failed.");
    }
  };

  const handleSaveTeam = async (form) => {
    if (!form.name.trim()) { setFormError("Team name is required."); return; }
    try {
      const payload = { ...form, department_id: form.department_id || null, team_lead_id: form.team_lead_id || null };
      editing ? await updateTeam(editing.id, payload) : await createTeam(payload);
      closeDialog(); loadAll();
    } catch (err) {
      setFormError(err.response?.data?.detail || "Save failed.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (tab === 0) await deleteBranch(deleteTarget.id);
      else if (tab === 1) await deleteDepartment(deleteTarget.id);
      else await deleteTeam(deleteTarget.id);
      setDeleteTarget(null); loadAll();
    } catch {
      setError("Failed to delete."); setDeleteTarget(null);
    }
  };

  const skeletonRows = (cols) =>
    Array.from({ length: 4 }).map((_, i) => (
      <TableRow key={i}>{Array.from({ length: cols }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
    ));

  return (
    <Box>
      <Box className="flex items-center justify-between mb-6">
        <Box>
          <Typography variant="h4" fontWeight={700}>Organization</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Manage branches, departments, and teams
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAdd}
        >
          Add {tab === 0 ? "Branch" : tab === 1 ? "Department" : "Team"}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Card elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Tab label={`Branches (${branches.length})`} />
          <Tab label={`Departments (${departments.length})`} />
          <Tab label={`Teams (${teams.length})`} />
        </Tabs>

        {/* Branches */}
        {tab === 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "background.default" }}>
                  {["Branch Name", "Location", "Organization Leader", "Departments", "Actions"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? skeletonRows(5) : branches.map((b) => (
                  <TableRow key={b.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{b.name}</TableCell>
                    <TableCell>{b.location || ""}</TableCell>
                    <TableCell>{getEmpName(b.org_leader_id)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={departments.filter((d) => d.branch_id === b.id).length} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(b)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(b)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && branches.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: "text.secondary" }}>No branches yet. Add the first one.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Departments */}
        {tab === 1 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "background.default" }}>
                  {["Name", "Branch", "Manager", "Teams", "Actions"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? skeletonRows(5) : departments.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{d.name}</TableCell>
                    <TableCell>{getBranchName(d.branch_id)}</TableCell>
                    <TableCell>{getEmpName(d.manager_id)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={teams.filter((t) => t.department_id === d.id).length} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(d)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(d)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && departments.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: "text.secondary" }}>No departments yet. Add the first one.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Teams */}
        {tab === 2 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "background.default" }}>
                  {["Team Name", "Department", "Team Lead", "Location", "Actions"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? skeletonRows(5) : teams.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                    <TableCell>{getDeptName(t.department_id)}</TableCell>
                    <TableCell>{getEmpName(t.team_lead_id)}</TableCell>
                    <TableCell>{t.location || ""}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(t)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(t)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && teams.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: "text.secondary" }}>No teams yet. Add the first one.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Dialogs */}
      {tab === 0 && (
        <BranchDialog open={dialogOpen} onClose={closeDialog} onSave={handleSaveBranch} editing={editing} error={formError} employees={employees} />
      )}
      {tab === 1 && (
        <DepartmentDialog open={dialogOpen} onClose={closeDialog} onSave={handleSaveDept} editing={editing} error={formError} employees={employees} branches={branches} />
      )}
      {tab === 2 && (
        <TeamDialog open={dialogOpen} onClose={closeDialog} onSave={handleSaveTeam} editing={editing} error={formError} employees={employees} departments={departments} />
      )}

      <DeleteConfirm
        open={!!deleteTarget}
        name={deleteTarget?.name}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}

export default Organization;

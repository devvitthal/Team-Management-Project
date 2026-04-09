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
  Alert,
  Chip,
  Tooltip,
  Skeleton,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import HistoryIcon from "@mui/icons-material/History";
import { getAchievements, updateAchievementStatus } from "../services/achievementService";
import { getValidations, submitValidation } from "../services/validationService";
import { getEmployees } from "../services/employeeService";
import { useAuth } from "../contexts/AuthContext";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Maps each submitter role to the role that should review their achievements.
 * Used to filter pending achievements the current reviewer is authorised to action.
 */
const EXPECTED_REVIEWER = {
  team_member: "team_lead",
  team_lead: "manager",
  manager: "org_leader",
  org_leader: "admin",
};

/**
 * Validations management page.
 * @returns {JSX.Element}
 */
function Validations() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewDialog, setReviewDialog] = useState({ open: false, achievement: null, action: "" });
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [a, v, e] = await Promise.allSettled([
        getAchievements({ status: "pending" }),
        getValidations(),
        getEmployees(),
      ]);
      setPending(a.status === "fulfilled" ? a.value : []);
      setHistory(v.status === "fulfilled" ? v.value : []);
      setEmployees(e.status === "fulfilled" ? e.value : []);
    } catch {
      setError("Failed to load validation data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /**
   * Resolve the employee record whose user_id matches the given auth user ID.
   * @param {string} userId - The auth user ID stored in achievement.submitted_by.
   * @returns {object|undefined}
   */
  const getSubmitterEmployee = (userId) =>
    employees.find((e) => e.user_id === userId || e.id === userId);

  /**
   * Filter the pending list to only achievements the current user should review
   * based on the hierarchy rules. Admins see everything.
   */
  const reviewablePending = pending.filter((a) => {
    if (user?.role === "admin") return true;
    const submitter = getSubmitterEmployee(a.submitted_by);
    const submitterRole = submitter?.role || "team_member";
    return EXPECTED_REVIEWER[submitterRole] === user?.role;
  });

  const openReview = (achievement, action) => {
    setReviewDialog({ open: true, achievement, action });
    setComment("");
    setCommentError("");
  };

  const closeReview = () => setReviewDialog({ open: false, achievement: null, action: "" });

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      setCommentError("A comment is required for all review actions.");
      return;
    }
    const { achievement, action } = reviewDialog;

    // Resolve submitter context for server-side self-review and hierarchy checks
    const submitter = getSubmitterEmployee(achievement.submitted_by);
    const submitterRole = submitter?.role || "team_member";

    setSaving(true);
    try {
      await submitValidation({
        achievement_id: achievement.id,
        action,
        comment,
        // Submitter context — used server-side for self-review ban + hierarchy routing
        submitted_by: achievement.submitted_by || null,
        submitter_role: submitterRole,
      });
      await updateAchievementStatus(achievement.id, action);
      closeReview();
      fetchData();
      fetchData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setCommentError(typeof detail === "string" ? detail : "Review submission failed.");
    } finally {
      setSaving(false);
    }
  };

  const getEmployeeName = (id) => {
    const emp = employees.find((e) => e.id === id || e.user_id === id);
    return emp?.full_name || id;
  };

  return (
    <Box>
      <Box className="mb-6">
        <Typography variant="h4" fontWeight={700}>Validations</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Review and approve or reject achievement submissions assigned to your role
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Card elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label={`Pending Review (${reviewablePending.length})`} />
            <Tab label={`Review History (${history.length})`} icon={<HistoryIcon fontSize="small" />} iconPosition="start" />
          </Tabs>
        </Box>

        {tab === 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "background.default" }}>
                  {["Title", "Employee", "Period", "Submitted By", "Actions"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                      </TableRow>
                    ))
                  : reviewablePending.map((a) => {
                      const submitter = getSubmitterEmployee(a.submitted_by);
                      return (
                        <TableRow key={a.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{a.title}</TableCell>
                          <TableCell>{getEmployeeName(a.employee_id)}</TableCell>
                          <TableCell>{MONTHS[a.month - 1]} {a.year}</TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">{submitter?.full_name || getEmployeeName(a.submitted_by)}</Typography>
                              {submitter?.role && (
                                <Typography variant="caption" color="text.secondary">
                                  {submitter.role.replace("_", " ")}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box className="flex gap-1">
                              <Tooltip title="Approve">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  startIcon={<CheckCircleOutlineIcon fontSize="small" />}
                                  onClick={() => openReview(a, "approved")}
                                >
                                  Approve
                                </Button>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<CancelOutlinedIcon fontSize="small" />}
                                  onClick={() => openReview(a, "rejected")}
                                >
                                  Reject
                                </Button>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                {!loading && reviewablePending.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: "text.secondary" }}>
                      No achievements pending your review at this time.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 1 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "background.default" }}>
                  {["Achievement", "Reviewer", "Decision", "Comment", "Date"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                      </TableRow>
                    ))
                  : history.map((v) => (
                      <TableRow key={v.id} hover>
                        <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem", color: "text.secondary" }}>
                          {String(v.achievement_id).slice(0, 8)}...
                        </TableCell>
                        <TableCell>{v.reviewer_name || v.reviewer_id}</TableCell>
                        <TableCell>
                          <Chip
                            label={v.action === "approved" ? "Approved" : "Rejected"}
                            color={v.action === "approved" ? "success" : "error"}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{v.comment}</Typography>
                        </TableCell>
                        <TableCell>
                          {v.created_at ? new Date(v.created_at).toLocaleDateString() : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                {!loading && history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: "text.secondary" }}>
                      No validation history found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onClose={closeReview} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reviewDialog.action === "approved" ? "Approve Achievement" : "Reject Achievement"}
        </DialogTitle>
        <Divider />
        <DialogContent>
          {reviewDialog.achievement && (
            <Box
              className="mb-4 p-3 rounded-lg"
              sx={{ bgcolor: "background.default", border: "1px solid", borderColor: "divider" }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                {reviewDialog.achievement.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {MONTHS[reviewDialog.achievement.month - 1]} {reviewDialog.achievement.year}
              </Typography>
              {reviewDialog.achievement.description && (
                <Typography variant="body2" mt={0.5}>{reviewDialog.achievement.description}</Typography>
              )}
            </Box>
          )}
          <TextField
            label="Comment (required)"
            value={comment}
            onChange={(e) => { setComment(e.target.value); setCommentError(""); }}
            fullWidth
            multiline
            rows={3}
            required
            error={!!commentError}
            helperText={commentError || "A comment is mandatory for all validation decisions."}
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={closeReview} variant="outlined" size="small">Cancel</Button>
          <Button
            variant="contained"
            color={reviewDialog.action === "approved" ? "success" : "error"}
            onClick={handleSubmitReview}
            disabled={saving}
            size="small"
          >
            {saving ? "Submitting..." : reviewDialog.action === "approved" ? "Approve" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Validations;

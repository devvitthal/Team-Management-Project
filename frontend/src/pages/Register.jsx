import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
} from "@mui/material";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useAuth } from "../contexts/AuthContext";

/**
 * Register page component.
 * @returns {JSX.Element}
 */
function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(". "));
      } else {
        setError(detail || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="min-h-screen flex items-center justify-center p-4" sx={{ bgcolor: "background.default" }}>
      <Box className="w-full max-w-sm">
        <Box className="text-center mb-6">
          <Box className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4" sx={{ bgcolor: "primary.main" }}>
            <PersonAddOutlinedIcon sx={{ color: "white", fontSize: 22 }} />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Register with your company email address
          </Typography>
        </Box>

        <Card elevation={2} sx={{ borderRadius: 2 }}>
          <CardContent className="p-6">
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                fullWidth
                id="full_name"
                name="full_name"
                label="Full Name"
                value={form.full_name}
                onChange={handleChange}
                autoFocus
                autoComplete="name"
                size="small"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Company Email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@company.com"
                autoComplete="email"
                size="small"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                id="password"
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                size="small"
                helperText="Min. 8 characters, one uppercase, one number"
                sx={{ mb: 3 }}
                slotProps={{ input: { endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword((v) => !v)} aria-label="toggle password visibility">
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ) } }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                size="medium"
                sx={{ py: 1.25 }}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary" align="center">
              Already have an account?{" "}
              <Link to="/login" style={{ color: "inherit", fontWeight: 600 }}>
                Sign in
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default Register;

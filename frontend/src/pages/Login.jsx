import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../contexts/AuthContext';

/**
 * Login page component.
 * @returns {JSX.Element}
 */
function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      className="min-h-screen flex items-center justify-center p-4"
      sx={{ bgcolor: 'background.default' }}
    >
      <Box className="w-full max-w-sm">
        <Box className="text-center mb-6">
          <Box
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            sx={{ bgcolor: 'primary.main' }}
          >
            <LockOutlinedIcon sx={{ color: 'white', fontSize: 22 }} />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            Sign In
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Team Management &amp; Achievement Analytics
          </Typography>
        </Box>

        <Card elevation={2} sx={{ borderRadius: 2 }}>
          <CardContent className="p-6">
            {error && (
              <Alert severity="error" className="mb-4" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
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
                autoFocus
                size="small"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                id="password"
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                size="small"
                sx={{ mb: 3 }}
                slotProps={{ input: { endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
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
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Box>

            <Box className="mt-4 pt-4 text-center" sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                No account?{' '}
                <Link to="/register" style={{ color: 'inherit', fontWeight: 600 }}>
                  Create one
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default Login;
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BarChartIcon from '@mui/icons-material/BarChart';
import HubIcon from '@mui/icons-material/Hub';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext';

const DRAWER_WIDTH = 220;

/**
 * Navigation items. `roles` is the inclusive list of roles that can see the
 * item; `null` means visible to all authenticated users.
 */
const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon, roles: null },
  { label: 'Employees', path: '/employees', icon: PeopleIcon, roles: null },
  { label: 'Organization', path: '/organization', icon: AccountTreeIcon, roles: ['admin', 'org_leader', 'manager'] },
  { label: 'Achievements', path: '/achievements', icon: EmojiEventsIcon, roles: null },
  { label: 'Validations', path: '/validations', icon: FactCheckIcon, roles: ['admin', 'org_leader', 'manager', 'team_lead'] },
  { label: 'Analytics', path: '/analytics', icon: BarChartIcon, roles: null },
  { label: 'Org Chart', path: '/org-chart', icon: HubIcon, roles: null },
];

const ROLE_LABELS = {
  admin: 'Administrator',
  org_leader: 'Organization Leader',
  manager: 'Manager',
  team_lead: 'Team Lead',
  team_member: 'Team Member',
};

/**
 * Sidebar drawer content with role-filtered navigation.
 * @param {object} props
 * @param {object} props.location - Current router location.
 * @param {Function} props.navigate - Router navigate function.
 * @param {Function} [props.onClose] - Optional close handler for mobile drawer.
 */
function DrawerContent({ location, navigate, onClose }) {
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role),
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'primary.main' }}>
      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700 }}>
          Team Management
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Achievement Analytics
        </Typography>
      </Box>
      <List sx={{ flex: 1, px: 1, py: 1 }} disablePadding>
        {visibleItems.map(({ label, path, icon: Icon }) => {
          const active = location.pathname.startsWith(path);
          return (
            <ListItemButton
              key={path}
              selected={active}
              onClick={() => { navigate(path); onClose?.(); }}
              sx={{
                borderRadius: 1,
                mb: 0.25,
                color: active ? 'white' : 'rgba(255,255,255,0.65)',
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)', color: 'white' },
                '&.Mui-selected:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: 'white' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400 }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', textAlign: 'center' }}>
          &copy; {new Date().getFullYear()} Team Management System
        </Typography>
      </Box>
    </Box>
  );
}

DrawerContent.propTypes = {
  location: PropTypes.object.isRequired,
  navigate: PropTypes.func.isRequired,
  onClose: PropTypes.func,
};

DrawerContent.defaultProps = {
  onClose: undefined,
};

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none' },
        }}
      >
        <DrawerContent location={location} navigate={navigate} onClose={() => setMobileOpen(false)} />
      </Drawer>

      {/* Permanent desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none' },
        }}
        open
      >
        <DrawerContent location={location} navigate={navigate} />
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <AppBar
          position="static"
          elevation={0}
          sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary' }}
        >
          <Toolbar variant="dense" sx={{ gap: 1 }}>
            {!isDesktop && (
              <IconButton edge="start" onClick={() => setMobileOpen((v) => !v)} size="small">
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Avatar
                sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.8rem', cursor: 'pointer' }}
                onClick={(e) => setAnchorEl(e.currentTarget)}
              >
                {initials}
              </Avatar>
              <Box
                sx={{ display: { xs: 'none', sm: 'block' }, cursor: 'pointer', lineHeight: 1.2 }}
                onClick={(e) => setAnchorEl(e.currentTarget)}
              >
                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>{user?.full_name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  {ROLE_LABELS[user?.role] || user?.role}
                </Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        {/* User menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ elevation: 2, sx: { mt: 0.5, minWidth: 200 } }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" fontWeight={600}>{user?.full_name}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1 }}>
            <LogoutIcon fontSize="small" color="action" />
            <Typography variant="body2">Sign Out</Typography>
          </MenuItem>
        </Menu>

        {/* Page content */}
        <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: 'background.default' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default AppLayout;

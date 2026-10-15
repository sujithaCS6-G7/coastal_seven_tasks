import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { UserCheck, Shield, Key, LogOut, CheckCircle, Mail, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 transition-colors">
      <Card className="border border-border shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">Protected User Profile</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Authenticated session guarded by React Router ProtectedRoute
              </CardDescription>
            </div>
          </div>

          <Badge
            variant={user?.role === 'admin' ? 'default' : 'secondary'}
            className="text-xs px-2.5 py-1 capitalize"
          >
            {user?.role === 'admin' ? '🛡️ Administrator' : '👤 Customer'}
          </Badge>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* User Attributes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" /> User ID
              </span>
              <p className="text-sm font-mono font-bold text-foreground mt-1">
                #{user?.id || 'N/A'}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" /> Username
              </span>
              <p className="text-sm font-bold text-foreground mt-1">
                {user?.username}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email Address
              </span>
              <p className="text-sm font-medium text-foreground mt-1">
                {user?.email || 'No email attached'}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Role Status
              </span>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> Active ({user?.role})
              </p>
            </div>
          </div>

          {/* Account Security & Session Overview */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-primary" /> Account Security & Session
            </span>
            <div className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/40 text-muted-foreground">
              <span>Authentication Protocol:</span>
              <span className="font-semibold text-foreground font-mono">JWT Bearer (Secure)</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/40 text-muted-foreground">
              <span>Session Status:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Encrypted & Active
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Your session is securely managed via HTTP Authorization headers.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            Back to Catalog
          </Button>
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ProfilePage;

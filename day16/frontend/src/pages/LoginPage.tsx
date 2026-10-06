import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/axiosClient';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card';
import { LogIn, Lock, User, AlertCircle, Key } from 'lucide-react';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Typed state & ref
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const usernameInputRef = useRef<HTMLInputElement | null>(null);

  const locState = location.state as LocationState | null;
  const from: string = locState?.from?.pathname || '/';

  useEffect(() => {
    usernameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const loggedUser = await login(username.trim(), password);
      toast({
        title: 'Authentication Successful',
        description: `Welcome back, ${loggedUser.username}!`,
        variant: 'success',
      });
      navigate(from, { replace: true });
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast({
        title: 'Login Failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoUser: string, demoPass: string): void => {
    setUsername(demoUser);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12 transition-colors">
      <Card className="w-full max-w-md shadow-lg border border-border">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-border">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LogIn className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Sign In to Nexora</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Authenticate to receive a signed JWT Bearer token
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="text-xs font-semibold text-foreground">
                Username
              </label>
              <div className="relative">
                <Input
                  ref={usernameInputRef}
                  id="login-username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUsername(e.target.value)
                  }
                  disabled={loading}
                  required
                  className="pl-9 text-xs"
                />
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-semibold text-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                  disabled={loading}
                  required
                  className="pl-9 text-xs"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="w-full text-xs font-semibold py-5 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <Key className="h-3 w-3" /> Quick Demo Accounts (Click to Fill):
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-[11px] h-7"
                onClick={() => handleFillDemo('admin', 'password123')}
              >
                Admin (admin)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-[11px] h-7"
                onClick={() => handleFillDemo('customer1', 'Password123!')}
              >
                Customer (customer1)
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-center border-t border-border pt-4">
          <p className="text-xs text-muted-foreground text-center">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create one now
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;

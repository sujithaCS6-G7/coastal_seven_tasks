import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/axiosClient';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { LogIn, Lock, User, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, { message: 'Username is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
    setFocus('username');
  }, [isAuthenticated, navigate, from, setFocus]);

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await login(data.username.trim(), data.password);
      toast({
        title: 'Authentication Successful',
        description: `Welcome back, ${data.username}!`,
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

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12 transition-colors">
      <Card className="form-card w-full max-w-md shadow-lg border border-border">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-border">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-6 w-6" />
          </div>
          <CardTitle className="form-title text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="form-subtitle text-xs text-muted-foreground">
            Sign in to your account with JWT Bearer Token validation
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {error && (
            <div
              role="alert"
              className="form-error mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="form-group space-y-1.5">
              <Label htmlFor="login-username" className="form-label text-xs font-semibold">
                Username
              </Label>
              <div className="relative">
                <Input
                  id="login-username"
                  type="text"
                  placeholder="Enter your username"
                  {...register('username')}
                  disabled={loading}
                  aria-invalid={!!errors.username}
                  className="form-input"
                />
              </div>
              {errors.username && (
                <p role="alert" className="text-xs font-medium text-destructive mt-1">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="form-group space-y-1.5">
              <Label htmlFor="login-password" className="form-label text-xs font-semibold">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  {...register('password')}
                  disabled={loading}
                  aria-invalid={!!errors.password}
                  className="form-input"
                />
              </div>
              {errors.password && (
                <p role="alert" className="text-xs font-medium text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="btn btn-primary w-full py-5 text-sm font-semibold mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-border pt-4">
          <p className="text-xs text-muted-foreground text-center">
            Don't have an account?{' '}
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

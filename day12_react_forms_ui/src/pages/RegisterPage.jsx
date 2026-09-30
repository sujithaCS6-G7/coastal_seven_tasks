import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters.' })
    .max(50, { message: 'Username cannot exceed 50 characters.' }),
  email: z
    .string()
    .min(1, { message: 'Email address is required.' })
    .email({ message: 'Please provide a valid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

const RegisterPage = () => {
  const { register: registerUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
    setFocus('username');
  }, [isAuthenticated, navigate, setFocus]);

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await registerUser(data.username.trim(), data.email.trim(), data.password);
      setSuccess(true);
      toast({
        title: 'Registration Successful',
        description: 'Account created! Redirecting to login...',
        variant: 'success',
      });
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast({
        title: 'Registration Failed',
        description: msg,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12 transition-colors">
      <Card className="form-card w-full max-w-md shadow-lg border border-border">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-border">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserPlus className="h-6 w-6" />
          </div>
          <CardTitle className="form-title text-2xl font-bold tracking-tight">Create Account</CardTitle>
          <CardDescription className="form-subtitle text-xs text-muted-foreground">
            Join Day 12 E-Commerce Store with Zod-validated authentication
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

          {success && (
            <div className="form-success mb-4 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs font-medium text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>✓ Account created successfully! Redirecting to login...</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="form-group space-y-1.5">
              <Label htmlFor="reg-username" className="form-label text-xs font-semibold">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reg-username"
                type="text"
                placeholder="Choose a username (min 3 chars)"
                {...register('username')}
                disabled={loading}
                aria-invalid={!!errors.username}
                className="form-input"
              />
              {errors.username && (
                <p role="alert" className="text-xs font-medium text-destructive mt-1">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="form-group space-y-1.5">
              <Label htmlFor="reg-email" className="form-label text-xs font-semibold">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="user@example.com"
                {...register('email')}
                disabled={loading}
                aria-invalid={!!errors.email}
                className="form-input"
              />
              {errors.email && (
                <p role="alert" className="text-xs font-medium text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="form-group space-y-1.5">
              <Label htmlFor="reg-password" className="form-label text-xs font-semibold">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="At least 6 characters"
                {...register('password')}
                disabled={loading}
                aria-invalid={!!errors.password}
                className="form-input"
              />
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
              {loading ? 'Registering...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-border pt-4">
          <p className="text-xs text-muted-foreground text-center">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterPage;

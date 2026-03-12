import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package2, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from '@/lib/api';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  
  // Enforce flow: Login -> Project Selection -> Dashboard
  // We ignore location.state.from to ensure users always land on project selection first
  const redirectPath = "/projects";

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const success = await login(email, password);
      
      if (success) {
        navigate(redirectPath, { replace: true });
      } else {
        setError('Invalid credentials. Use admin@madhuram.com / admin123, pm@madhuram.com / pm123, or devang@gmail.com / 123456');
      }
    } catch {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');

    if (resetPassword !== resetPasswordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsResetLoading(true);
    try {
      const result = await api.forgotPassword({
        email_id: email,
        password_change: resetPassword,
        re_typepassword: resetPasswordConfirm,
      });

      if (result.success) {
        setResetMessage('Password updated successfully. You can now log in with your new password.');
        setShowForgotPassword(false);
        setResetPassword('');
        setResetPasswordConfirm('');
      } else {
        setError(result.error || 'Failed to reset password.');
      }
    } catch {
      setError('An error occurred while resetting password.');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleDemoAdminLogin = () => {
    setEmail('admin@madhuram.com');
    setPassword('admin123');
  };

  const handleDemoPMLogin = () => {
    setEmail('pm@madhuram.com');
    setPassword('pm123');
  };

  const handleDemoDevangLogin = () => {
    setEmail('devang@gmail.com');
    setPassword('123456');
  };

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 px-4 md:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-900 opacity-90" />
        <div className="relative z-20 flex items-center text-lg font-bold">
          <Package2 className="mr-2 h-6 w-6" />
          Madhuram Inventory
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg font-medium leading-relaxed">
              &ldquo;Streamline your inventory, optimize your workflow, and take control of your business assets with precision and ease.&rdquo;
            </p>
            <footer className="text-sm opacity-80">Madhuram Management Team</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8 w-full">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <div className="flex items-center justify-center mb-2 lg:hidden">
               <Package2 className="h-8 w-8 text-primary mr-2" />
               <span className="text-xl font-bold">Madhuram Inventory</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>
          
          <div className="grid gap-6">
            <form onSubmit={handleLogin}>
              <div className="grid gap-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="name@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 md:h-10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoCapitalize="none"
                    autoComplete="current-password"
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 md:h-10"
                  />
                </div>
                <Button disabled={isLoading} className="h-11 md:h-10">
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Sign In
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 justify-start"
                  onClick={() => setShowForgotPassword((prev) => !prev)}
                >
                  {showForgotPassword ? 'Cancel password reset' : 'Forgot password?'}
                </Button>
              </div>
            </form>

            {showForgotPassword && (
              <form onSubmit={handleForgotPassword} className="grid gap-3 rounded-md border p-3">
                <p className="text-sm font-medium">Reset Password</p>
                <Input
                  placeholder="New password"
                  type="password"
                  disabled={isResetLoading}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                />
                <Input
                  placeholder="Re-type new password"
                  type="password"
                  disabled={isResetLoading}
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  required
                />
                <Button type="submit" disabled={isResetLoading || !email} className="h-10">
                  {isResetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
                {!email && <p className="text-xs text-muted-foreground">Enter your email above first.</p>}
              </form>
            )}
            {resetMessage && (
              <Alert>
                <AlertDescription>{resetMessage}</AlertDescription>
              </Alert>
            )}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Quick Access
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" type="button" disabled={isLoading} onClick={handleDemoAdminLogin} className="h-11 md:h-10">
                Admin Demo
              </Button>
              <Button variant="outline" type="button" disabled={isLoading} onClick={handleDemoPMLogin} className="h-11 md:h-10">
                PM Demo
              </Button>
              <Button variant="outline" type="button" disabled={isLoading} onClick={handleDemoDevangLogin} className="col-span-2 h-11 md:h-10">
                Devang Demo
              </Button>
            </div>
          </div>
          <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

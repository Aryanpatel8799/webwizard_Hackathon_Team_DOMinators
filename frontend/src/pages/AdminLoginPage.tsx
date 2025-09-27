import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

type LoginFormData = z.infer<typeof loginSchema>;

export const AdminLoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/admin';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@eventapp.com',
      password: 'Admin123!'
    }
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      await login(data.email, data.password);
      toast.success('Login successful! Welcome to the admin panel.');
      navigate(from, { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (role: 'admin' | 'manager' | 'support') => {
    const credentials = {
      admin: { email: 'admin@eventapp.com', password: 'Admin123!' },
      manager: { email: 'manager@eventapp.com', password: 'Manager123!' },
      support: { email: 'support@eventapp.com', password: 'Support123!' }
    };
    
    setValue('email', credentials[role].email);
    setValue('password', credentials[role].password);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="backdrop-blur-xl bg-white/5 border-white/10">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              className="mx-auto w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center"
            >
              <Shield className="w-10 h-10 text-white" />
            </motion.div>
            
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Portal</h1>
              <p className="text-gray-400 mt-2">
                Sign in to access the event management dashboard
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-white">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    {...register('email')}
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    error={errors.email?.message}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-white">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="pl-10 pr-12"
                    error={errors.password?.message}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="border-t border-white/10 pt-6">
              <p className="text-sm text-gray-400 text-center mb-4">Demo Credentials:</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('admin')}
                  className="text-xs bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg hover:from-red-500/30 hover:to-pink-500/30 transition-all duration-300 text-left"
                >
                  <div className="font-medium">Super Admin</div>
                  <div className="text-gray-400">admin@eventapp.com • Full Access</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('manager')}
                  className="text-xs bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 px-3 py-2 rounded-lg hover:from-amber-500/30 hover:to-orange-500/30 transition-all duration-300 text-left"
                >
                  <div className="font-medium">Event Manager</div>
                  <div className="text-gray-400">manager@eventapp.com • Events & Analytics</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('support')}
                  className="text-xs bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-300 px-3 py-2 rounded-lg hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300 text-left"
                >
                  <div className="font-medium">Support Staff</div>
                  <div className="text-gray-400">support@eventapp.com • Registrations Only</div>
                </button>
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-start space-x-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-300 font-medium">Demo Environment</p>
                <p className="text-amber-200/80 mt-1">
                  These are demo credentials for testing purposes only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

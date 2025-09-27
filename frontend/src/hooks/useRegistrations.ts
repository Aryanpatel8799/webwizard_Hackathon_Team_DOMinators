import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { RegistrationData, Registration } from '../types';
import { toast } from 'sonner';

export const useRegistrations = () => {
  const queryClient = useQueryClient();

  // Get all registrations (admin only)
  const {
    data: registrations = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['registrations'],
    queryFn: api.registrations.getAll,
    staleTime: 1000 * 60 * 2 // 2 minutes
  });

  // Register for an event
  const registerMutation = useMutation({
    mutationFn: api.registrations.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Registration successful! Check your email for confirmation.');
      return data;
    },
    onError: (error: any) => {
      const message = error.message || 'Registration failed. Please try again.';
      toast.error(message);
      throw error;
    }
  });

  // Get registration by ID
  const useRegistration = (registrationId: string) => {
    return useQuery({
      queryKey: ['registrations', registrationId],
      queryFn: () => api.registrations.getById(registrationId),
      enabled: !!registrationId
    });
  };

  // Get registrations by event
  const getRegistrationsByEvent = (eventId: string) => {
    return registrations.filter(reg => 
      typeof reg.event === 'string' ? reg.event === eventId : reg.event.id === eventId
    );
  };

  // Get registration by email
  const getRegistrationByEmail = (email: string) => {
    return registrations.find(reg => reg.email.toLowerCase() === email.toLowerCase());
  };

  // Cancel registration
  const cancelMutation = useMutation({
    mutationFn: (registrationId: string) => api.registrations.cancel(registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Registration cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel registration');
    }
  });

  // Update registration status (admin only)
  const updateStatusMutation = useMutation({
    mutationFn: ({ 
      registrationId, 
      status 
    }: { 
      registrationId: string; 
      status: 'confirmed' | 'waiting' | 'cancelled' 
    }) => api.registrations.updateStatus(registrationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast.success('Registration status updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update registration status');
    }
  });

  // Helper functions
  const getRegistrationStats = () => {
    const total = registrations.length;
    const confirmed = registrations.filter(reg => reg.status === 'confirmed').length;
    const waiting = registrations.filter(reg => reg.status === 'waiting').length;
    const cancelled = registrations.filter(reg => reg.status === 'cancelled').length;

    return {
      total,
      confirmed,
      waiting,
      cancelled,
      confirmedRate: total > 0 ? (confirmed / total) * 100 : 0
    };
  };

  const getRegistrationsByStatus = (status: Registration['status']) => {
    return registrations.filter(reg => reg.status === status);
  };

  const getRecentRegistrations = (days = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return registrations.filter(reg => 
      new Date(reg.createdAt) >= cutoffDate
    );
  };

  // Check if user is already registered for an event
  const isRegisteredForEvent = (email: string, eventId: string) => {
    return registrations.some(reg => 
      reg.email.toLowerCase() === email.toLowerCase() &&
      (typeof reg.event === 'string' ? reg.event === eventId : reg.event.id === eventId) &&
      reg.status !== 'cancelled'
    );
  };

  return {
    // Data
    registrations,
    isLoading,
    error,
    
    // Actions
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    cancel: cancelMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    useRegistration,
    
    // Loading states
    isRegistering: registerMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    
    // Helper functions
    getRegistrationsByEvent,
    getRegistrationByEmail,
    getRegistrationStats,
    getRegistrationsByStatus,
    getRecentRegistrations,
    isRegisteredForEvent
  };
};

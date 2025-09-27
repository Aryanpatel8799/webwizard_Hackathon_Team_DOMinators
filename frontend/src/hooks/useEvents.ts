import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Event } from '../types';
import { toast } from 'sonner';

export const useEvents = () => {
  const queryClient = useQueryClient();

  const {
    data: events = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['events'],
    queryFn: api.events.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Get a single event
  const useEvent = (eventId: string) => {
    return useQuery({
      queryKey: ['events', eventId],
      queryFn: () => api.events.getById(eventId),
      enabled: !!eventId,
      staleTime: 1000 * 60 * 5
    });
  };

  // Create event mutation (admin only)
  const createEventMutation = useMutation({
    mutationFn: api.events.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create event');
    }
  });

  // Update event mutation (admin only)
  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) => 
      api.events.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update event');
    }
  });

  // Delete event mutation (admin only)
  const deleteEventMutation = useMutation({
    mutationFn: api.events.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete event');
    }
  });

  // Helper functions
  const getEventsByCategory = (category: string) => {
    return events.filter(event => event.category === category);
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events.filter(event => new Date(event.date) > now && event.isActive);
  };

  const getPastEvents = () => {
    const now = new Date();
    return events.filter(event => new Date(event.date) < now);
  };

  const getActiveEvents = () => {
    return events.filter(event => event.isActive && event.isRegistrationOpen);
  };

  const searchEvents = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return events.filter(event => 
      event.name.toLowerCase().includes(lowercaseQuery) ||
      event.description?.toLowerCase().includes(lowercaseQuery) ||
      event.location.toLowerCase().includes(lowercaseQuery) ||
      event.category?.toLowerCase().includes(lowercaseQuery)
    );
  };

  const getAvailableSeats = (event: Event) => {
    return event.totalSeats - event.registeredCount;
  };

  const isEventFull = (event: Event) => {
    return getAvailableSeats(event) <= 0;
  };

  const isEventAlmostFull = (event: Event, threshold = 10) => {
    const available = getAvailableSeats(event);
    return available > 0 && available <= threshold;
  };

  return {
    // Data
    events,
    isLoading,
    error,
    
    // Actions
    refetch,
    useEvent,
    createEvent: createEventMutation.mutate,
    updateEvent: updateEventMutation.mutate,
    deleteEvent: deleteEventMutation.mutate,
    
    // Loading states
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
    
    // Helper functions
    getEventsByCategory,
    getUpcomingEvents,
    getPastEvents,
    getActiveEvents,
    searchEvents,
    getAvailableSeats,
    isEventFull,
    isEventAlmostFull
  };
};

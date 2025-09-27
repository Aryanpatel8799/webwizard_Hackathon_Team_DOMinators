import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, MapPin, Filter, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { EventCard, RegisterForm } from '../components/events';
import { Button, Input } from '../components/ui';
import { Event, RegistrationData } from '../types';
import { api } from '../api';
import { toast } from 'sonner';

export const HomePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch events
  const { 
    data: events = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['events'],
    queryFn: api.events.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Get unique categories for filter
  const categories = ['all', ...new Set(events.map(event => event.category).filter(Boolean))];

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    
    // Only show active and open for registration events
    return matchesSearch && matchesCategory && event.isActive && event.isRegistrationOpen;
  });

  // Handle event selection for registration
  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    setIsRegisterModalOpen(true);
  };

  // Handle registration submission
  const handleRegisterSubmit = async (data: RegistrationData) => {
    try {
      await api.registrations.create(data);
      toast.success('Registration successful! Check your email for confirmation.');
      refetch(); // Refresh events to update seat counts
    } catch (error: any) {
      toast.error(error.message || 'Registration failed. Please try again.');
      throw error; // Re-throw to let form handle it
    }
  };

  // Close registration modal
  const handleCloseModal = () => {
    setIsRegisterModalOpen(false);
    setSelectedEvent(null);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <Calendar className="w-16 h-16 mx-auto mb-4" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Events</h2>
          <p className="text-gray-400 mb-6">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
          <Button onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Discover Amazing{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                Events
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of attendees at the most exciting events happening near you.
              Register now and secure your spot!
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto"
            >
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  fullWidth
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Events Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">Upcoming Events</h2>
              <span className="text-gray-400">({filteredEvents.length} found)</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="ml-3 text-gray-300">Loading events...</span>
            </div>
          )}

          {/* Events Grid */}
          {!isLoading && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredEvents.map((event) => (
                <motion.div key={event.id} variants={itemVariants}>
                  <EventCard
                    event={event}
                    onSelect={handleEventSelect}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* No Events Found */}
          {!isLoading && filteredEvents.length === 0 && events.length > 0 && (
            <div className="text-center py-20">
              <div className="text-gray-400 mb-4">
                <Calendar className="w-16 h-16 mx-auto mb-4" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
              <p className="text-gray-400 mb-6">
                Try adjusting your search or filter criteria
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* No Events at All */}
          {!isLoading && events.length === 0 && (
            <div className="text-center py-20">
              <div className="text-gray-400 mb-4">
                <Calendar className="w-16 h-16 mx-auto mb-4" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No events available</h3>
              <p className="text-gray-400">
                Check back soon for upcoming events!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Registration Modal */}
      {selectedEvent && (
        <RegisterForm
          event={selectedEvent}
          isOpen={isRegisterModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleRegisterSubmit}
        />
      )}
    </div>
  );
};

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
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <span className="text-sm text-cyan-300 font-medium">🚀 New Events Added Daily</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Discover Amazing{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 animate-gradient">
                Events
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Join thousands of attendees at the most exciting events happening near you.
              From conferences to workshops, networking to learning - find your perfect event and register now!
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-2xl mx-auto mb-12"
            >
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search events, locations, or topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-lg"
                  fullWidth
                />
              </div>
              <Button 
                size="lg" 
                className="h-12 px-8 text-lg font-semibold"
                onClick={() => {
                  if (filteredEvents.length > 0) {
                    document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                Find Events
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400 mb-2">{events.length}+</div>
                <div className="text-gray-400">Active Events</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">10K+</div>
                <div className="text-gray-400">Happy Attendees</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">50+</div>
                <div className="text-gray-400">Cities Covered</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose Our Platform?</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              We make event discovery and registration simple, secure, and seamless.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '🎫',
                title: 'Easy Registration',
                description: 'Quick and secure registration process with instant confirmation emails and QR codes.'
              },
              {
                icon: '🔍',
                title: 'Smart Discovery',
                description: 'Find events that match your interests with our intelligent search and filtering system.'
              },
              {
                icon: '📱',
                title: 'Mobile Friendly',
                description: 'Access everything on any device with our responsive design and mobile-optimized experience.'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events-section" className="py-16 px-4">
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

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold text-white mb-4">EventHub</h3>
              <p className="text-gray-300 mb-4 max-w-md">
                Your gateway to amazing events. Discover, register, and attend the best events in your area.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <span className="text-white">📧</span>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <span className="text-white">🐦</span>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <span className="text-white">📘</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Browse Events</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Create Event</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 EventHub. All rights reserved. Made with ❤️ for event enthusiasts.
            </p>
          </div>
        </div>
      </footer>

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

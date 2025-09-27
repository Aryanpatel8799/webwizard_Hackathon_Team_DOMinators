import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, Users, DollarSign, Clock, FileText } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, Input } from '../ui';
import { toast } from 'sonner';

interface Event {
  _id?: string;
  id?: string;
  title?: string;
  name: string;
  description?: string;
  date: string;
  venue?: string;
  location: string;
  isActive?: boolean;
  attendeesCount?: number;
  registeredCount: number;
  capacity?: number;
  maxCapacity?: number;
  totalSeats: number;
  price?: number;
  category?: string;
}

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: Partial<Event>) => void;
  event?: Event | null;
  isLoading?: boolean;
}

const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  event = null,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Partial<Event>>({
    name: '',
    description: '',
    date: '',
    location: '',
    totalSeats: 100,
    price: 0,
    category: 'conference',
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name || event.title || '',
        description: event.description || '',
        date: event.date ? new Date(event.date).toISOString().slice(0, 16) : '',
        location: event.location || event.venue || '',
        totalSeats: event.totalSeats || event.capacity || event.maxCapacity || 100,
        price: event.price || 0,
        category: event.category || 'conference',
        isActive: event.isActive !== false
      });
    } else {
      // Reset form for new event
      setFormData({
        name: '',
        description: '',
        date: '',
        location: '',
        totalSeats: 100,
        price: 0,
        category: 'conference',
        isActive: true
      });
    }
    setErrors({});
  }, [event, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Event name is required';
    }

    if (!formData.date) {
      newErrors.date = 'Event date is required';
    } else {
      const eventDate = new Date(formData.date);
      const now = new Date();
      if (eventDate < now) {
        newErrors.date = 'Event date must be in the future';
      }
    }

    if (!formData.location?.trim()) {
      newErrors.location = 'Event location is required';
    }

    if (!formData.totalSeats || formData.totalSeats < 1) {
      newErrors.totalSeats = 'Capacity must be at least 1';
    }

    if (formData.price !== undefined && formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Format the date properly
    const submitData = {
      ...formData,
      date: new Date(formData.date!).toISOString()
    };

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const categories = [
    'conference',
    'workshop',
    'seminar',
    'webinar',
    'meetup',
    'networking',
    'training',
    'exhibition',
    'festival',
    'competition',
    'other'
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <h2 className="text-xl font-bold text-white">
                {event ? 'Edit Event' : 'Create New Event'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isLoading}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Event Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Event Name *
                  </label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter event name"
                    className={errors.name ? 'border-red-500' : ''}
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter event description"
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                {/* Date and Location Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Date & Time *
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.date || ''}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className={errors.date ? 'border-red-500' : ''}
                      disabled={isLoading}
                    />
                    {errors.date && (
                      <p className="text-red-400 text-sm mt-1">{errors.date}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Location *
                    </label>
                    <Input
                      value={formData.location || ''}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="Enter event location"
                      className={errors.location ? 'border-red-500' : ''}
                      disabled={isLoading}
                    />
                    {errors.location && (
                      <p className="text-red-400 text-sm mt-1">{errors.location}</p>
                    )}
                  </div>
                </div>

                {/* Capacity and Price Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Users className="w-4 h-4 inline mr-2" />
                      Capacity *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.totalSeats || ''}
                      onChange={(e) => handleInputChange('totalSeats', parseInt(e.target.value) || 0)}
                      placeholder="Max attendees"
                      className={errors.totalSeats ? 'border-red-500' : ''}
                      disabled={isLoading}
                    />
                    {errors.totalSeats && (
                      <p className="text-red-400 text-sm mt-1">{errors.totalSeats}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-2" />
                      Ticket Price
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price || ''}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={errors.price ? 'border-red-500' : ''}
                      disabled={isLoading}
                    />
                    {errors.price && (
                      <p className="text-red-400 text-sm mt-1">{errors.price}</p>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Category
                  </label>
                  <select
                    value={formData.category || 'conference'}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    disabled={isLoading}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive !== false}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                    disabled={isLoading}
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-300">
                    Event is active and accepting registrations
                  </label>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading}
                    className="min-w-[120px]"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : (
                      event ? 'Update Event' : 'Create Event'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EventFormModal;

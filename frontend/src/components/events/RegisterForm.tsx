import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, X, Calendar, MapPin, Users } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader } from '../ui';
import { Event, RegistrationData } from '../../types';
import { cn } from '../../utils/cn';

const registrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'),
});

type FormData = z.infer<typeof registrationSchema>;

interface RegisterFormProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RegistrationData) => Promise<void>;
  isLoading?: boolean;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  event,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(registrationSchema)
  });

  const handleFormSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit({
        ...data,
        eventId: event.id
      });
      reset();
      onClose();
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const availableSeats = event.totalSeats - event.registeredCount;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Card glass className="overflow-hidden">
              <CardHeader className="relative">
                <button
                  onClick={onClose}
                  className="absolute top-6 right-6 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="w-5 h-5 text-gray-300" />
                </button>
                
                <div className="pr-12">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Register for Event
                  </h2>
                  <p className="text-gray-400">
                    Secure your spot at this amazing event
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Event Summary */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h3 className="font-semibold text-white mb-3">{event.name}</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3 text-gray-300">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <span>{formatDate(event.date)} at {formatTime(event.date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-gray-300">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                      <span>{event.location}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-gray-300">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span>{availableSeats} seats available</span>
                    </div>
                    
                    {event.price && (
                      <div className="pt-2 border-t border-white/10">
                        <span className="text-lg font-semibold text-white">
                          ${event.price.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                  <Input
                    label="Full Name"
                    placeholder="Enter your full name"
                    icon={<User className="w-5 h-5" />}
                    error={errors.name?.message}
                    fullWidth
                    {...register('name')}
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    icon={<Mail className="w-5 h-5" />}
                    error={errors.email?.message}
                    fullWidth
                    {...register('email')}
                  />

                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="Enter your phone number"
                    icon={<Phone className="w-5 h-5" />}
                    error={errors.phone?.message}
                    fullWidth
                    {...register('phone')}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onClose}
                      disabled={isSubmitting}
                      fullWidth
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isSubmitting}
                      disabled={isSubmitting || availableSeats <= 0}
                      fullWidth
                    >
                      {availableSeats <= 0 ? 'Event Full' : 'Complete Registration'}
                    </Button>
                  </div>
                </form>

                {event.price && (
                  <p className="text-xs text-gray-500 text-center">
                    Payment will be processed upon registration confirmation
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

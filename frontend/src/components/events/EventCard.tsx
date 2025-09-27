import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Clock, Star } from 'lucide-react';
import { Button, Card, CardContent, CardFooter } from '../ui';
import { Event } from '../../types';
import { cn } from '../../utils/cn';

interface EventCardProps {
  event: Event;
  onSelect: (event: Event) => void;
  className?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onSelect,
  className
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const availableSeats = event.totalSeats - event.registeredCount;
  const isAlmostFull = availableSeats <= 10 && availableSeats > 0;
  const isFull = availableSeats <= 0;

  return (
    <Card 
      className={cn('overflow-hidden group', className)}
      hover
    >
      {/* Event Image/Banner */}
      <div className="relative h-48 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-cyan-500/90 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
            {event.category || 'Event'}
          </span>
        </div>
        
        {isFull && (
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 bg-red-500/90 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
              SOLD OUT
            </span>
          </div>
        )}
        
        {isAlmostFull && !isFull && (
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 bg-orange-500/90 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
              {availableSeats} left
            </span>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
            {event.name}
          </h3>
        </div>
      </div>

      <CardContent className="space-y-4">
        {/* Event Details */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-gray-300">
            <Calendar className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white font-medium">
                {formatDate(event.date)}
              </p>
              <p className="text-sm text-gray-400">
                {formatTime(event.date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-gray-300">
            <MapPin className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <p className="text-sm">{event.location}</p>
          </div>

          <div className="flex items-center gap-3 text-gray-300">
            <Users className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm">
                <span className="text-white font-medium">{event.registeredCount}</span>
                <span className="text-gray-400"> / {event.totalSeats} registered</span>
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                <div 
                  className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ 
                    width: `${Math.min((event.registeredCount / event.totalSeats) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {event.price && (
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <p className="text-lg font-semibold text-white">
                ${event.price.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-gray-400 text-sm line-clamp-3">
            {event.description}
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Button
          fullWidth
          variant={isFull ? 'ghost' : 'primary'}
          disabled={isFull}
          onClick={() => onSelect(event)}
          className={cn(
            'transition-all duration-200',
            isFull && 'cursor-not-allowed',
            isAlmostFull && !isFull && 'animate-pulse'
          )}
        >
          {isFull ? 'Event Full' : 'Register Now'}
        </Button>
      </CardFooter>
    </Card>
  );
};

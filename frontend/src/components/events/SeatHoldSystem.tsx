import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Timer,
  Loader2
} from 'lucide-react';
import { Button, Card, CardContent } from '../ui';
import { useRealTime } from '../../contexts/RealTimeContext';
import { toast } from 'sonner';
import { api } from '../../api/index';

interface SeatHoldSystemProps {
  eventId: string;
  availableSeats: number;
  totalSeats: number;
  onSeatHold: (held: boolean) => void;
  onRegistrationComplete: () => void;
}

interface SeatHold {
  id: string;
  eventId: string;
  userId: string;
  seatsHeld: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'confirmed';
}

export const SeatHoldSystem: React.FC<SeatHoldSystemProps> = ({
  eventId,
  availableSeats,
  totalSeats,
  onSeatHold,
  onRegistrationComplete
}) => {
  const { isConnected, joinEventRoom, leaveEventRoom, onSeatsUpdate } = useRealTime();
  const [seatHold, setSeatHold] = useState<SeatHold | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isHolding, setIsHolding] = useState(false);
  const [currentAvailable, setCurrentAvailable] = useState(availableSeats);

  // Hold duration in seconds (5 minutes)
  const HOLD_DURATION = 5 * 60;

  useEffect(() => {
    // Join event room for real-time seat updates
    joinEventRoom(eventId);
    
    return () => {
      leaveEventRoom(eventId);
    };
  }, [eventId, joinEventRoom, leaveEventRoom]);

  // Listen for seat updates
  useEffect(() => {
    const unsubscribe = onSeatsUpdate((data) => {
      if (data.eventId === eventId) {
        setCurrentAvailable(data.available);
      }
    });

    return unsubscribe;
  }, [eventId, onSeatsUpdate]);

  // Timer countdown for seat hold
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (seatHold && seatHold.status === 'active') {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const expires = new Date(seatHold.expiresAt).getTime();
        const remaining = Math.max(0, Math.floor((expires - now) / 1000));

        setTimeLeft(remaining);

        if (remaining <= 0) {
          handleSeatHoldExpired();
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [seatHold]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const holdSeat = async (seatsToHold: number = 1) => {
    if (currentAvailable < seatsToHold) {
      toast.error('Not enough seats available');
      return;
    }

    setIsHolding(true);

    try {
      const response = await api.events.holdSeat(eventId, seatsToHold);
      
      if (response.success) {
        const newHold: SeatHold = response.data;
        setSeatHold(newHold);
        setCurrentAvailable(prev => prev - seatsToHold);
        onSeatHold(true);
        
        toast.success(`Seat${seatsToHold > 1 ? 's' : ''} held for ${HOLD_DURATION / 60} minutes`);
      } else {
        toast.error(response.message || 'Failed to hold seat');
      }
    } catch (error: any) {
      console.error('Error holding seat:', error);
      toast.error(error.message || 'Failed to hold seat');
    } finally {
      setIsHolding(false);
    }
  };

  const releaseSeat = async () => {
    if (!seatHold) return;

    try {
      await api.events.releaseSeat(seatHold.id);
      
      setCurrentAvailable(prev => prev + seatHold.seatsHeld);
      setSeatHold(null);
      setTimeLeft(0);
      onSeatHold(false);
      
      toast.info('Seat released');
    } catch (error: any) {
      console.error('Error releasing seat:', error);
      toast.error('Failed to release seat');
    }
  };

  const confirmSeat = async () => {
    if (!seatHold) return;

    try {
      const response = await api.events.confirmSeat(seatHold.id);
      
      if (response.success) {
        setSeatHold(prev => prev ? { ...prev, status: 'confirmed' } : null);
        onRegistrationComplete();
        toast.success('Seat confirmed! Registration completed.');
      } else {
        toast.error(response.message || 'Failed to confirm seat');
      }
    } catch (error: any) {
      console.error('Error confirming seat:', error);
      toast.error('Failed to confirm seat');
    }
  };

  const handleSeatHoldExpired = () => {
    if (seatHold) {
      setCurrentAvailable(prev => prev + seatHold.seatsHeld);
      setSeatHold(null);
      setTimeLeft(0);
      onSeatHold(false);
      toast.warning('Seat hold expired');
    }
  };

  const getSeatStatusColor = () => {
    const ratio = currentAvailable / totalSeats;
    if (ratio > 0.5) return 'text-green-400';
    if (ratio > 0.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSeatStatusIcon = () => {
    if (seatHold?.status === 'confirmed') return CheckCircle;
    if (seatHold?.status === 'active') return Clock;
    if (currentAvailable === 0) return XCircle;
    return Users;
  };

  const StatusIcon = getSeatStatusIcon();

  return (
    <div className="space-y-4">
      {/* Real-time Connection Status */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-gray-400">
            {isConnected ? 'Live updates active' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Seat Availability */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusIcon className={`w-5 h-5 ${getSeatStatusColor()}`} />
              <div>
                <p className="font-medium text-white">
                  {currentAvailable} of {totalSeats} seats available
                </p>
                <p className="text-sm text-gray-400">
                  {totalSeats - currentAvailable} registered
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  currentAvailable > totalSeats * 0.5 ? 'bg-green-500' :
                  currentAvailable > totalSeats * 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ 
                  width: `${((totalSeats - currentAvailable) / totalSeats) * 100}%` 
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seat Hold Interface */}
      <AnimatePresence mode="wait">
        {!seatHold && currentAvailable > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-white mb-3">
                    Hold your seat to secure your spot
                  </p>
                  <Button
                    onClick={() => holdSeat(1)}
                    disabled={isHolding || currentAvailable === 0}
                    variant="primary"
                    className="w-full"
                  >
                    {isHolding ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Holding Seat...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Hold Seat (5 min)
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {seatHold && seatHold.status === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <Timer className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">
                      Seat Hold Active
                    </span>
                  </div>
                  
                  <div className="text-3xl font-bold text-white mb-2">
                    {formatTime(timeLeft)}
                  </div>
                  
                  <p className="text-gray-300 mb-4">
                    Complete registration to confirm your seat
                  </p>
                  
                  <div className="flex space-x-3">
                    <Button
                      onClick={confirmSeat}
                      variant="primary"
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Registration
                    </Button>
                    
                    <Button
                      onClick={releaseSeat}
                      variant="ghost"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Release Seat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {seatHold && seatHold.status === 'confirmed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-4">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Registration Confirmed!
                  </h3>
                  <p className="text-gray-300">
                    Your seat has been secured for this event.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {currentAvailable === 0 && !seatHold && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-4">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Event Full
                  </h3>
                  <p className="text-gray-300 mb-4">
                    No seats available. Join the waiting list to be notified of cancellations.
                  </p>
                  <Button variant="secondary" className="w-full">
                    Join Waiting List
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning for low seats */}
      {currentAvailable > 0 && currentAvailable <= 5 && !seatHold && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center space-x-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg"
        >
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <p className="text-orange-400 text-sm">
            Only {currentAvailable} seat{currentAvailable !== 1 ? 's' : ''} left!
          </p>
        </motion.div>
      )}
    </div>
  );
};

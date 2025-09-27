import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Mail, 
  Users, 
  Send, 
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../utils/cn';
import { toast } from 'sonner';

interface Participant {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  college?: string;
  status: 'confirmed' | 'waiting' | 'cancelled';
  event: {
    _id: string;
    title: string;
    date: string;
    venue: string;
  };
  registeredAt: string;
}

interface Event {
  _id: string;
  title: string;
  date: string;
  venue: string;
}

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: Event[];
  participants?: Participant[];
  onSendEmail: (emailData: {
    eventId?: string;
    recipients?: Array<{ email: string; name: string }>;
    subject: string;
    message: string;
    template: string;
    includeAllParticipants?: boolean;
  }) => Promise<void>;
}

const BulkEmailModal: React.FC<BulkEmailModalProps> = ({
  isOpen,
  onClose,
  events,
  participants = [],
  onSendEmail
}) => {
  const [emailData, setEmailData] = useState({
    subject: '',
    message: '',
    template: 'general'
  });
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [recipientMode, setRecipientMode] = useState<'all' | 'event' | 'selected'>('all');
  const [isLoading, setIsLoading] = useState(false);

  const templates = [
    { id: 'general', name: 'General Message', description: 'Custom message to participants' },
    { id: 'event_update', name: 'Event Update', description: 'Important event updates' },
    { id: 'event_reminder', name: 'Event Reminder', description: 'Reminder about upcoming event' }
  ];

  // Filter participants based on selected event and status
  const filteredParticipants = participants.filter(participant => {
    const matchesEvent = selectedEvent === 'all' || participant.event._id === selectedEvent;
    const matchesStatus = filterStatus === 'all' || participant.status === filterStatus;
    return matchesEvent && matchesStatus;
  });

  // Get selected event details
  const eventDetails = events.find(event => event._id === selectedEvent);

  // Handle participant selection
  const handleParticipantToggle = (participantId: string) => {
    const newSelected = new Set(selectedParticipants);
    if (newSelected.has(participantId)) {
      newSelected.delete(participantId);
    } else {
      newSelected.add(participantId);
    }
    setSelectedParticipants(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedParticipants.size === filteredParticipants.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(filteredParticipants.map(p => p._id)));
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.subject || !emailData.message) {
      toast.error('Please fill in subject and message');
      return;
    }

    setIsLoading(true);
    try {
      let emailPayload: any = {
        subject: emailData.subject,
        message: emailData.message,
        template: emailData.template
      };

      if (recipientMode === 'event' && selectedEvent !== 'all') {
        emailPayload.eventId = selectedEvent;
        emailPayload.includeAllParticipants = true;
      } else if (recipientMode === 'selected') {
        const recipients = filteredParticipants
          .filter(p => selectedParticipants.has(p._id))
          .map(p => ({ email: p.email, name: p.name }));
        
        if (recipients.length === 0) {
          toast.error('Please select at least one recipient');
          return;
        }
        emailPayload.recipients = recipients;
      } else {
        // Send to all participants
        emailPayload.recipients = filteredParticipants.map(p => ({ 
          email: p.email, 
          name: p.name 
        }));
      }

      await onSendEmail(emailPayload);
      onClose();
      // Reset form
      setEmailData({ subject: '', message: '', template: 'general' });
      setSelectedParticipants(new Set());
      setSelectedEvent('all');
      setRecipientMode('all');
    } catch (error) {
      console.error('Failed to send bulk email:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecipientCount = () => {
    if (recipientMode === 'selected') {
      return selectedParticipants.size;
    } else if (recipientMode === 'event' && selectedEvent !== 'all') {
      return filteredParticipants.filter(p => p.event._id === selectedEvent).length;
    } else {
      return filteredParticipants.length;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Bulk Email
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Send emails to event participants
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex h-[calc(90vh-80px)]">
              {/* Left Panel - Recipients */}
              <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                    Select Recipients
                  </h3>
                  
                  {/* Recipient Mode Selection */}
                  <div className="space-y-2 mb-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="recipientMode"
                        value="all"
                        checked={recipientMode === 'all'}
                        onChange={(e) => setRecipientMode(e.target.value as any)}
                        className="text-blue-600"
                      />
                      <span className="text-sm">All Participants ({filteredParticipants.length})</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="recipientMode"
                        value="event"
                        checked={recipientMode === 'event'}
                        onChange={(e) => setRecipientMode(e.target.value as any)}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Specific Event Participants</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="recipientMode"
                        value="selected"
                        checked={recipientMode === 'selected'}
                        onChange={(e) => setRecipientMode(e.target.value as any)}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Manually Selected ({selectedParticipants.size})</span>
                    </label>
                  </div>

                  {/* Filters */}
                  <div className="flex gap-2 mb-3">
                    <select
                      value={selectedEvent}
                      onChange={(e) => setSelectedEvent(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      disabled={recipientMode === 'all'}
                    >
                      <option value="all">All Events</option>
                      {events.map(event => (
                        <option key={event._id} value={event._id}>
                          {event.title}
                        </option>
                      ))}
                    </select>
                    
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Status</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="waiting">Waiting</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {recipientMode === 'selected' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSelectAll}
                      className="w-full"
                    >
                      {selectedParticipants.size === filteredParticipants.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>

                {/* Participants List */}
                <div className="p-4 h-full overflow-y-auto">
                  {filteredParticipants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p>No participants found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredParticipants.map(participant => (
                        <div
                          key={participant._id}
                          className={cn(
                            "p-3 border rounded-lg cursor-pointer transition-colors",
                            recipientMode === 'selected' && selectedParticipants.has(participant._id)
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                          )}
                          onClick={() => recipientMode === 'selected' && handleParticipantToggle(participant._id)}
                        >
                          <div className="flex items-center gap-3">
                            {recipientMode === 'selected' && (
                              <input
                                type="checkbox"
                                checked={selectedParticipants.has(participant._id)}
                                onChange={() => handleParticipantToggle(participant._id)}
                                className="text-blue-600"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {participant.name}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {participant.email}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {participant.event.title} • {participant.status}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Email Composition */}
              <div className="w-1/2 p-6 overflow-y-auto">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  Compose Email
                </h3>

                {/* Template Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Template
                  </label>
                  <div className="space-y-2">
                    {templates.map(template => (
                      <label key={template.id} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <input
                          type="radio"
                          name="template"
                          value={template.id}
                          checked={emailData.template === template.id}
                          onChange={(e) => setEmailData({ ...emailData, template: e.target.value })}
                          className="mt-1 text-blue-600"
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {template.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {template.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    placeholder="Enter email subject..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Message */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={emailData.message}
                    onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                    placeholder="Enter your message..."
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                {/* Send Summary */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      Email Summary
                    </span>
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p>Recipients: <strong>{getRecipientCount()}</strong> participants</p>
                    {eventDetails && recipientMode === 'event' && (
                      <p>Event: <strong>{eventDetails.title}</strong></p>
                    )}
                    <p>Template: <strong>{templates.find(t => t.id === emailData.template)?.name}</strong></p>
                  </div>
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleSendEmail}
                  disabled={isLoading || !emailData.subject || !emailData.message || getRecipientCount() === 0}
                  className="w-full"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Sending...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Send Email to {getRecipientCount()} Recipients
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BulkEmailModal;

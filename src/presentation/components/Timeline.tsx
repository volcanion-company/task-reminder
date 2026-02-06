import { format } from 'date-fns';
import { CheckCircle2, Clock, Edit, Plus } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  type: 'created' | 'updated' | 'completed' | 'status_changed';
  timestamp: string;
  description: string;
  details?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  const getIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return <Plus className="w-4 h-4 text-blue-600" />;
      case 'updated':
        return <Edit className="w-4 h-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'status_changed':
        return <Clock className="w-4 h-4 text-purple-600" />;
    }
  };

  const getIconBg = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return 'bg-blue-100';
      case 'updated':
        return 'bg-yellow-100';
      case 'completed':
        return 'bg-green-100';
      case 'status_changed':
        return 'bg-purple-100';
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`p-2 rounded-full ${getIconBg(event.type)}`}>
              {getIcon(event.type)}
            </div>
            {index < events.length - 1 && (
              <div className="w-0.5 h-full min-h-[40px] bg-border mt-2" />
            )}
          </div>

          {/* Event content */}
          <div className="flex-1 pb-6">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium">{event.description}</h4>
              <time className="text-sm text-muted-foreground">
                {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm')}
              </time>
            </div>
            {event.details && (
              <p className="text-sm text-muted-foreground">{event.details}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

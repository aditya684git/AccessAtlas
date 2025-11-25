import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Clock } from "lucide-react";

/**
 * Recent Activity panel displaying user's recent actions
 * Shows navigation history, tags added, and recent interactions
 */
const RecentActivity = () => {
  // Mock data - would be replaced with actual state management later
  const activities = [
    {
      id: 1,
      type: "navigation",
      description: "Navigated to Library",
      time: "2 hours ago",
      icon: Navigation,
    },
    {
      id: 2,
      type: "tag",
      description: "Added tag: Family Restroom",
      time: "5 hours ago",
      icon: MapPin,
    },
    {
      id: 3,
      type: "navigation",
      description: "Navigated to Main Building",
      time: "1 day ago",
      icon: Navigation,
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.description}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;

import * as React from "react";
import { Bell, LucideIcon, Package, ShoppingBag, Crown, Info, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { Notification } from "@shared/schema";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/activity";

const typeIcons: Record<string, LucideIcon> = {
  order: ShoppingBag,
  sheep: Package,
  vip: Crown,
  system: Info,
};

const typeColors: Record<string, string> = {
  order: "text-blue-500 bg-blue-500/10",
  sheep: "text-emerald-500 bg-emerald-500/10",
  vip: "text-amber-500 bg-amber-500/10",
  system: "text-slate-500 bg-slate-500/10",
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!user || !user.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      // الترتيب برمجياً (Client-side) لضمان العمل دون الحاجة لفهارس مركبة
      const sortedData = data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifications(sortedData);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    if (!user || unreadCount === 0) return;
    const unreadIds = notifications.filter((n: Notification) => !n.isRead).map((n: Notification) => n.id);
    await markAllNotificationsAsRead(user.uid, unreadIds);
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) {
      await markNotificationAsRead(n.id);
    }
    setOpen(false);
    if (n.link) {
      window.location.href = n.link;
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} د`;
    if (hours < 24) return `منذ ${hours} سا`;
    return `منذ ${days} ي`;
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] border-2 border-background"
            >
              {unreadCount > 9 ? "+9" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 overflow-hidden" align="end">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h4 className="font-bold text-sm">الإشعارات</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] px-2 h-auto"
              onClick={handleMarkAllRead}
            >
              <Check className="h-3 w-3 ml-1" />
              تعيين الكل كمقروء
            </Button>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-xs">لا توجد إشعارات حالياً</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n: Notification) => {
                const Icon = typeIcons[n.type] || Info;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer relative",
                      !n.isRead && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", typeColors[n.type])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm mb-0.5 leading-tight", !n.isRead ? "font-bold" : "font-medium")}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {formatTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t text-center">
            <Button variant="ghost" size="sm" className="w-full text-[10px] h-7" onClick={() => setOpen(false)}>
              إغلاق
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

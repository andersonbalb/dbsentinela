import { useEffect, useRef } from "react";
import { mockAlerts } from "@/data/mockData";

export function usePushNotifications() {
  const permissionRef = useRef<NotificationPermission>("default");
  const notifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!("Notification" in window)) return;

    permissionRef.current = Notification.permission;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        permissionRef.current = p;
      });
    }
  }, []);

  useEffect(() => {
    if (!("Notification" in window) || permissionRef.current !== "granted") return;

    const interval = setInterval(() => {
      const criticalAlerts = mockAlerts.filter(
        (a) => a.severity === "critical" && a.status === "active" && !notifiedIds.current.has(a.id)
      );

      criticalAlerts.forEach((alert) => {
        notifiedIds.current.add(alert.id);
        new Notification("🚨 Alerta Crítico - DB Sentinela", {
          body: `${alert.databaseName}: ${alert.message}`,
          icon: "/favicon.ico",
          tag: alert.id,
        });
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return { requestPermission: () => Notification.requestPermission() };
}

import { NotificationHistoryPage } from "@/components/notification-history-page";

export default function NotificationsPage() {
  return <NotificationHistoryPage visualV2={process.env.OPENFORGE_FUND_MANAGER_UX_V2 === "true"} />;
}

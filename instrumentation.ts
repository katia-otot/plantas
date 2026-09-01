export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { startNotificationScheduler } = await import(
    "@/lib/notification-scheduler"
  );
  await startNotificationScheduler();
}

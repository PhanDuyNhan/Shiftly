import "./globals.css";
import { AppShell } from "./app-shell";

export const metadata = { title: "Shiftly", description: "Quản lý nhân sự, nghỉ phép và lịch ca" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><AppShell>{children}</AppShell></body></html>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { getClubAdminReport, getPlatformReport } from "@/lib/clubStore";
import { listUsers, toPublicUser } from "@/lib/auth";
import { requirePageUser } from "@/lib/pageAuth";
import { PlatformReportView } from "@/components/PlatformReportView";
import { UserMenu } from "@/components/UserMenu";

export const metadata: Metadata = {
  title: "Dashboard — In-Que",
  description: "Reports across your clubs.",
};

export default async function DashboardPage() {
  const user = await requirePageUser();
  const publicUser = toPublicUser(user);

  if (user.role === "club_admin") {
    const report = await getClubAdminReport(user.clubIds);
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              <span className="text-ball">●</span> Dashboard
            </h1>
            <p className="text-xs text-muted">Reports across the clubs you run.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/clubs" className="btn text-xs">
              Clubs
            </Link>
            <UserMenu user={publicUser} />
          </div>
        </div>

        <PlatformReportView
          report={report}
          emptyClubsMessage={
            <>
              You don&apos;t administer any clubs yet. Ask a super admin to
              assign you one.
            </>
          }
        />
      </div>
    );
  }

  const [report, users] = await Promise.all([getPlatformReport(), listUsers()]);
  const superAdminCount = users.filter((u) => u.role === "super_admin").length;
  const clubAdminCount = users.length - superAdminCount;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            <span className="text-ball">●</span> Dashboard
          </h1>
          <p className="text-xs text-muted">Platform-wide stats across every club.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/clubs" className="btn text-xs">
            Clubs
          </Link>
          <Link href="/users" className="btn text-xs">
            Users
          </Link>
          <UserMenu user={publicUser} />
        </div>
      </div>

      <PlatformReportView
        report={report}
        adminsTile={{ total: users.length, superAdminCount, clubAdminCount }}
        emptyClubsMessage={
          <>
            No clubs yet.{" "}
            <Link href="/clubs" className="font-medium text-accent hover:underline">
              Create one →
            </Link>
          </>
        }
      />
    </div>
  );
}

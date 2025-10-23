import { getWorkflowFlags, getChapters, getRecentJobLogs } from "@roo-code/life-ipo"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
	const flags = await getWorkflowFlags()
	const chapters = await getChapters()
	const recentJobs = await getRecentJobLogs(20)

	const stats = {
		total: chapters.length,
		pending: chapters.filter((c) => c.status === "pending").length,
		processing: chapters.filter((c) => c.status === "processing" || c.status === "sam_improving").length,
		ready: chapters.filter((c) => c.status === "ready").length,
		approved: chapters.filter((c) => c.status === "approved").length,
		sent: chapters.filter((c) => c.status === "sent").length,
		failed: chapters.filter((c) => c.status === "failed").length,
	}

	const readyForApproval = flags.samQualityComplete && flags.coauthorReportsReady && !flags.humanApproval

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
				<p className="text-muted-foreground">Workflow status and system overview</p>
			</div>

			{/* Workflow Flags */}
			<div className="mb-8 p-6 bg-card border border-border rounded-lg">
				<h2 className="text-xl font-semibold mb-4">Workflow Status</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="p-4 bg-background rounded">
						<div className="text-sm text-muted-foreground mb-1">Sam Quality Complete</div>
						<div
							className={`text-lg font-semibold ${flags.samQualityComplete ? "text-green-500" : "text-yellow-500"}`}>
							{flags.samQualityComplete ? "✓ Complete" : "⋯ In Progress"}
						</div>
					</div>

					<div className="p-4 bg-background rounded">
						<div className="text-sm text-muted-foreground mb-1">Co-author Reports Ready</div>
						<div
							className={`text-lg font-semibold ${flags.coauthorReportsReady ? "text-green-500" : "text-yellow-500"}`}>
							{flags.coauthorReportsReady ? "✓ Complete" : "⋯ In Progress"}
						</div>
					</div>

					<div className="p-4 bg-background rounded">
						<div className="text-sm text-muted-foreground mb-1">Human Approval</div>
						<div
							className={`text-lg font-semibold ${flags.humanApproval ? "text-green-500" : "text-gray-500"}`}>
							{flags.humanApproval ? "✓ Approved" : "⊗ Pending"}
						</div>
					</div>
				</div>

				{readyForApproval && (
					<div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded">
						<div className="flex items-center justify-between">
							<div>
								<div className="font-semibold text-green-500">Ready for Approval</div>
								<div className="text-sm text-muted-foreground">
									All chapters processed. Review and approve to send feedback emails.
								</div>
							</div>
							<button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
								Review & Approve
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Chapter Stats */}
			<div className="mb-8 p-6 bg-card border border-border rounded-lg">
				<h2 className="text-xl font-semibold mb-4">Chapter Statistics</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
					<StatCard label="Total" value={stats.total} />
					<StatCard label="Pending" value={stats.pending} color="text-yellow-500" />
					<StatCard label="Processing" value={stats.processing} color="text-blue-500" />
					<StatCard label="Ready" value={stats.ready} color="text-green-500" />
					<StatCard label="Approved" value={stats.approved} color="text-emerald-500" />
					<StatCard label="Sent" value={stats.sent} color="text-gray-500" />
					<StatCard label="Failed" value={stats.failed} color="text-red-500" />
				</div>
			</div>

			{/* Recent Jobs */}
			<div className="p-6 bg-card border border-border rounded-lg">
				<h2 className="text-xl font-semibold mb-4">Recent Jobs</h2>
				<div className="space-y-2">
					{recentJobs.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">No jobs yet</div>
					) : (
						recentJobs.map((job) => (
							<div
								key={job.id}
								className="flex items-center justify-between p-3 bg-background rounded text-sm">
								<div className="flex items-center gap-4">
									<span
										className={`px-2 py-1 rounded text-xs font-medium ${getJobStatusColor(job.status)}`}>
										{job.status}
									</span>
									<span className="font-mono text-xs text-muted-foreground">{job.jobType}</span>
									{job.chapterId && (
										<span className="text-muted-foreground">Chapter #{job.chapterId}</span>
									)}
								</div>
								<div className="flex items-center gap-4">
									{job.durationMs && (
										<span className="text-muted-foreground">
											{(job.durationMs / 1000).toFixed(1)}s
										</span>
									)}
									<span className="text-muted-foreground text-xs">
										{new Date(job.startedAt).toLocaleTimeString()}
									</span>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	)
}

function StatCard({ label, value, color = "text-foreground" }: { label: string; value: number; color?: string }) {
	return (
		<div className="p-4 bg-background rounded">
			<div className="text-sm text-muted-foreground mb-1">{label}</div>
			<div className={`text-2xl font-bold ${color}`}>{value}</div>
		</div>
	)
}

function getJobStatusColor(status: string): string {
	const colors: Record<string, string> = {
		started: "bg-blue-500/10 text-blue-500",
		completed: "bg-green-500/10 text-green-500",
		failed: "bg-red-500/10 text-red-500",
	}
	return colors[status] || "bg-gray-500/10 text-gray-500"
}

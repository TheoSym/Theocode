import { getChapters } from "@roo-code/life-ipo"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ChaptersPage() {
	const chapters = await getChapters()

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Chapters</h1>
				<p className="text-muted-foreground">All uploaded chapters and their processing status</p>
			</div>

			<div className="space-y-4">
				{chapters.length === 0 ? (
					<div className="text-center py-12 text-muted-foreground">
						<p>No chapters uploaded yet.</p>
					</div>
				) : (
					chapters.map((chapter: any) => {
						const latestScore = chapter.scores?.[0]

						return (
							<Link
								key={chapter.id}
								href={`/chapters/${chapter.id}`}
								className="block p-6 bg-card border border-border rounded-lg hover:border-accent transition-colors">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<h3 className="text-lg font-semibold mb-1">{chapter.title}</h3>
										<p className="text-sm text-muted-foreground mb-3">
											by {chapter.author?.name || "Unknown"} •{" "}
											{chapter.author?.role === "sam" ? "Sam (Owner)" : "Co-author"}
										</p>

										<div className="flex items-center gap-4 text-sm">
											<span
												className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(chapter.status)}`}>
												{chapter.status}
											</span>

											{latestScore && (
												<span className="text-muted-foreground">
													Score: {latestScore.average}/100
												</span>
											)}

											{chapter.iteration && (
												<span className="text-muted-foreground">
													Iteration: {chapter.iteration}
												</span>
											)}
										</div>
									</div>

									<div className="text-sm text-muted-foreground">
										{new Date(chapter.createdAt).toLocaleDateString()}
									</div>
								</div>
							</Link>
						)
					})
				)}
			</div>
		</div>
	)
}

function getStatusColor(status: string): string {
	const colors: Record<string, string> = {
		pending: "bg-yellow-500/10 text-yellow-500",
		processing: "bg-blue-500/10 text-blue-500",
		sam_improving: "bg-purple-500/10 text-purple-500",
		ready: "bg-green-500/10 text-green-500",
		approved: "bg-emerald-500/10 text-emerald-500",
		sent: "bg-gray-500/10 text-gray-500",
		failed: "bg-red-500/10 text-red-500",
	}
	return colors[status] || "bg-gray-500/10 text-gray-500"
}

import Link from "next/link"

export default function HomePage() {
	return (
		<div className="container mx-auto px-4 py-12">
			<div className="max-w-3xl mx-auto">
				<h1 className="text-4xl font-bold mb-4">Life IPO Editorial App</h1>
				<p className="text-lg text-muted-foreground mb-8">
					AI-powered editorial workflow for the Life IPO Anthology
				</p>

				<div className="space-y-6">
					<section>
						<h2 className="text-2xl font-semibold mb-3">About</h2>
						<p className="text-muted-foreground mb-4">
							This application automates the editorial workflow for the Life IPO Anthology owned by{" "}
							<a
								href="https://www.sammane.com"
								target="_blank"
								rel="noopener noreferrer"
								className="text-accent hover:underline">
								Sam Sammane
							</a>{" "}
							(Born Ghiath AL SAMMANE).
						</p>
						<p className="text-muted-foreground">
							The system handles chapter uploads, AI-powered content processing with quality scoring,
							iterative improvements, and automated feedback delivery to authors.
						</p>
					</section>

					<section>
						<h2 className="text-2xl font-semibold mb-3">Features</h2>
						<ul className="space-y-2 text-muted-foreground">
							<li>• Automated AI rewriting and quality improvement for Sam's chapters</li>
							<li>• Quality scoring and constructive feedback for co-author submissions</li>
							<li>• Iterative improvement loop until quality targets are met</li>
							<li>• Human approval gate before sending feedback</li>
							<li>• Automated email delivery with retry logic</li>
							<li>• Optional master document compilation</li>
						</ul>
					</section>

					<div className="flex gap-4 mt-8">
						<Link
							href="/chapters"
							className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
							View Chapters
						</Link>
						<Link
							href="/admin"
							className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors border border-border">
							Admin Dashboard
						</Link>
					</div>
				</div>
			</div>
		</div>
	)
}

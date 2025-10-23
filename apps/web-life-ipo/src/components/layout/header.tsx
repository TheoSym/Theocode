import Link from "next/link"

export function Header() {
	return (
		<header className="border-b border-border bg-card">
			<div className="container mx-auto px-4 py-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-8">
						<Link href="/" className="text-xl font-semibold text-foreground hover:text-accent">
							Life IPO Editorial
						</Link>
						<nav className="flex gap-6">
							<Link href="/chapters" className="text-sm text-muted-foreground hover:text-foreground">
								Chapters
							</Link>
							<Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
								Admin
							</Link>
						</nav>
					</div>
				</div>
			</div>
		</header>
	)
}

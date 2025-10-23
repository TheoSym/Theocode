import { NextResponse } from "next/server"
import { getChapters } from "@roo-code/life-ipo"

export async function GET() {
	try {
		const chapters = await getChapters()

		return NextResponse.json({
			success: true,
			chapters,
			count: chapters.length,
		})
	} catch (error) {
		console.error("Error fetching chapters:", error)
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to fetch chapters",
			},
			{ status: 500 },
		)
	}
}

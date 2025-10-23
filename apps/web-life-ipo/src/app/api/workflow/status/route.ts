import { NextResponse } from "next/server"
import { getWorkflowFlags, getChaptersByStatus } from "@roo-code/life-ipo"

export async function GET() {
	try {
		const flags = await getWorkflowFlags()
		const readyChapters = await getChaptersByStatus("ready")
		const processingChapters = await getChaptersByStatus(["processing", "sam_improving"])

		return NextResponse.json({
			success: true,
			flags,
			stats: {
				readyForApproval: readyChapters.length,
				processing: processingChapters.length,
			},
		})
	} catch (error) {
		console.error("Error fetching workflow status:", error)
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to fetch workflow status",
			},
			{ status: 500 },
		)
	}
}

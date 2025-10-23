import { NextResponse } from "next/server"
import { getSanitizedConfig } from "@/lib/config"

export async function GET() {
	try {
		const config = getSanitizedConfig()

		return NextResponse.json({
			status: "healthy",
			timestamp: new Date().toISOString(),
			config,
		})
	} catch (error) {
		return NextResponse.json(
			{
				status: "unhealthy",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		)
	}
}

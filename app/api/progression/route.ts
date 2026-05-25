import { GenerateProgressionRequestSchema } from "@/lib/api/progressionSchemas";
import { generateProgression } from "@/lib/generator/progression/generateProgression";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json();

    const parsed = GenerateProgressionRequestSchema.safeParse(body);

    if (!parsed.success) {
        return Response.json(
            {
                error: "INVALID_REQUEST",
                issues: parsed.error.issues,
            },
            { status: 400 }
        );
    }

    const result = generateProgression(
        parsed.data.settings,
        parsed.data.seed,
        parsed.data.generatorVersion
    );

    return Response.json(result, {
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

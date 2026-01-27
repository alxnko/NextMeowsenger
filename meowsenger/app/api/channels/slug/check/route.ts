import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug required" }, { status: 400 });
  }

  // Common validation with frontend
  const cleanSlug = slug.toLowerCase().trim();

  // Basic format validation
  if (cleanSlug.length < 3) {
    return NextResponse.json({
      available: false,
      error: "Slug must be at least 3 characters",
      slug: cleanSlug,
    });
  }

  if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
    return NextResponse.json({
      available: false,
      error: "Slug can only contain letters, numbers, and hyphens",
      slug: cleanSlug,
    });
  }

  try {
    const existing = await prisma.chat.findUnique({
      where: { slug: cleanSlug },
      select: { id: true },
    });

    return NextResponse.json({
      available: !existing,
      slug: cleanSlug,
    });
  } catch (error) {
    console.error("Slug check failed", error);
    return NextResponse.json(
      { error: "Failed to check slug availability" },
      { status: 500 },
    );
  }
}

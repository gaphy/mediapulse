import { NextResponse } from "next/server";

const PLEX_CLIENT_ID = "mediapulse-dashboard";

const PLEX_HEADERS = {
  "X-Plex-Client-Identifier": PLEX_CLIENT_ID,
  "X-Plex-Product": "MediaPulse",
  "X-Plex-Version": "1.0.0",
  Accept: "application/json",
};

// POST: Create a new PIN and return the auth URL
export async function POST() {
  try {
    const response = await fetch("https://plex.tv/api/v2/pins", {
      method: "POST",
      headers: {
        ...PLEX_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ strong: "true" }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Plex API error: HTTP ${response.status}` },
        { status: 502 }
      );
    }

    const data = (await response.json()) as { id: number; code: string };

    const authUrl = `https://app.plex.tv/auth#?clientID=${encodeURIComponent(PLEX_CLIENT_ID)}&code=${encodeURIComponent(data.code)}&context%5Bdevice%5D%5Bproduct%5D=MediaPulse`;

    return NextResponse.json({
      pinId: data.id,
      code: data.code,
      authUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to create Plex PIN" },
      { status: 500 }
    );
  }
}

// GET: Check if a PIN has been claimed (poll for token)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pinId = searchParams.get("pinId");

  if (!pinId) {
    return NextResponse.json({ error: "Missing pinId" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://plex.tv/api/v2/pins/${pinId}`, {
      headers: PLEX_HEADERS,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Plex API error: HTTP ${response.status}` },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      authToken: string | null;
      expiresAt: string;
    };

    if (data.authToken) {
      return NextResponse.json({ token: data.authToken });
    }

    const expired = new Date(data.expiresAt) < new Date();
    if (expired) {
      return NextResponse.json({ error: "PIN expired" }, { status: 410 });
    }

    return NextResponse.json({ pending: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to check Plex PIN" },
      { status: 500 }
    );
  }
}

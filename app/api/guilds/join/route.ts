import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { guilds, guildMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { inviteCode } = await req.json();
    if (!inviteCode) return new NextResponse("Invite code required", { status: 400 });

    const [guild] = await db.select().from(guilds).where(eq(guilds.inviteCode, inviteCode));
    if (!guild) return new NextResponse("Invalid invite code", { status: 404 });

    // Check if member
    const [existingMember] = await db.select().from(guildMembers).where(
        and(
            eq(guildMembers.guildId, guild.id),
            eq(guildMembers.userId, userId)
        )
    );

    if (existingMember) return new NextResponse("Already a member", { status: 400 });

    await db.insert(guildMembers).values({
      guildId: guild.id,
      userId: userId,
      role: 'member',
    });

    return NextResponse.json(guild);
  } catch (error) {
    console.error("Guild Join Error", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { guilds, guildMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // Join guild members with guilds to get the user's guilds
    const members = await db.select({
        guild: guilds,
        role: guildMembers.role
    })
    .from(guildMembers)
    .innerJoin(guilds, eq(guildMembers.guildId, guilds.id))
    .where(eq(guildMembers.userId, userId));

    const userGuilds = members.map(m => ({ ...m.guild, role: m.role }));
    return NextResponse.json(userGuilds);
  } catch (error) {
    console.error("Guild List Error", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

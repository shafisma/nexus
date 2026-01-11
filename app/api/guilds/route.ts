import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { guilds, guildMembers } from '@/db/schema';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

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

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { name } = await req.json();
    if (!name) return new NextResponse("Name required", { status: 400 });

    const inviteCode = nanoid(6); // Generate simple code

    const [guild] = await db.insert(guilds).values({
      name,
      ownerId: userId,
      inviteCode,
    }).returning();

    await db.insert(guildMembers).values({
      guildId: guild.id,
      userId: userId,
      role: 'owner',
    });

    return NextResponse.json(guild);
  } catch (error) {
    console.error("Guild Create Error", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

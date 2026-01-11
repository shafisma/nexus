import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { messages, rooms, guilds } from '@/db/schema';
import { pusherServer } from '@/lib/pusher';
import { asc, eq, isNull } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const user = await currentUser();
    const body = await req.json();
    const { content, type, fileUrl, fileName, pollQuestion, pollOptions, guildId } = body;

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (body.type === 'text' && (!content || typeof content !== "string" || !content.trim())) {
      return new NextResponse("Content is required", { status: 400 });
    }

    // Robust user name resolution
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    let userName = `${firstName} ${lastName}`.trim();

    if (!userName) {
       userName = user.username || user.emailAddresses?.[0]?.emailAddress || "Anonymous";
    }

    const [newMessage] = await db.insert(messages).values({
      content: content.trim(),
      userId,
      userName,
      roomId: 'general',
      guildId: guildId || null,
      type: type || 'text',
      fileUrl,
      fileName,
      pollQuestion,
      pollOptions,
    }).returning();

    const eventChannel = guildId ? `presence-guild-${guildId}` : 'presence-global';
    await pusherServer.trigger(eventChannel, 'new-message', newMessage);

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('[MESSAGES_POST]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId');

    const query = db.select().from(messages).orderBy(asc(messages.createdAt));

    if (guildId) {
        // @ts-ignore
        query.where(eq(messages.guildId, guildId));
    } else {
        // Global chat (messages with no guildId)
        // @ts-ignore
        query.where(isNull(messages.guildId));
    }

    const allMessages = await query;

    return NextResponse.json(allMessages);
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
    try {
        const { userId } = auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const { searchParams } = new URL(req.url);
        const messageId = searchParams.get('id');

        if (!messageId) return new NextResponse("ID required", { status: 400 });

        const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
        if (!message) return new NextResponse("Not found", { status: 404 });

        let canDelete = message.userId === userId;

        // If not author, check if guild owner
        if (!canDelete && message.guildId) {
            const [guild] = await db.select().from(guilds).where(eq(guilds.id, message.guildId));
            if (guild && guild.ownerId === userId) {
                canDelete = true;
            }
        }

        if (!canDelete) return new NextResponse("Forbidden", { status: 403 });

        await db.delete(messages).where(eq(messages.id, messageId));
        
        const eventChannel = message.guildId ? `presence-guild-${message.guildId}` : 'presence-global';
        await pusherServer.trigger(eventChannel, 'message-deleted', messageId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete Error", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { userId } = auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { id, content } = body;

        const [message] = await db.select().from(messages).where(eq(messages.id, id));
        if (!message) return new NextResponse("Not found", { status: 404 });

        if (message.userId !== userId) return new NextResponse("Forbidden", { status: 403 });

        const [updatedMessage] = await db.update(messages)
            .set({ 
                content, 
                updatedAt: new Date() 
            })
            .where(eq(messages.id, id))
            .returning();

        const eventChannel = message.guildId ? `presence-guild-${message.guildId}` : 'presence-global';
        await pusherServer.trigger(eventChannel, 'message-updated', updatedMessage);

        return NextResponse.json(updatedMessage);
    } catch (error) {
        console.error("Patch Error", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

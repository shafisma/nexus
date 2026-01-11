import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { pusherServer } from '@/lib/pusher';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { messageId } = await req.json();
    if (!messageId) return new NextResponse("Message ID required", { status: 400 });

    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message) return new NextResponse("Not found", { status: 404 });

    // Parse seenBy
    let seenBy: string[] = [];
    if (Array.isArray(message.seenBy)) {
        seenBy = message.seenBy as any; // Cast for now
    } else if (typeof message.seenBy === 'string') {
        try { seenBy = JSON.parse(message.seenBy); } catch (e) {}
    }

    if (!seenBy.includes(userId)) {
        seenBy.push(userId);
        
        await db.update(messages)
            .set({ seenBy: JSON.stringify(seenBy) as any }) // Drizzle helper
            .where(eq(messages.id, messageId));

        // Notify options
        // We probably don't want to broadcast every single 'seen' event to everyone.
        // But for < 50 users it's fine.
        const eventChannel = message.guildId ? `guild-${message.guildId}` : 'chat';
        await pusherServer.trigger(eventChannel, 'message-seen', { id: messageId, userId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Status Update Error", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

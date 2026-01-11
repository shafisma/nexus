import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { pusherServer } from '@/lib/pusher';
import { eq, inArray } from 'drizzle-orm';

export async function POST(req: Request) {
    try {
        const { userId } = auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const { messageIds } = await req.json();
        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return new NextResponse("Invalid message IDs", { status: 400 });
        }

        // Fetch messages to update
        const targets = await db.select().from(messages).where(inArray(messages.id, messageIds));
        
        const updates = [];

        for (const msg of targets) {
            // Check if user already saw it
            const seenList = (msg.seenBy as string[]) || []; // Safe cast if Drizzle handles it as array, or access JSON
            if (!seenList.includes(userId) && msg.userId !== userId) {
                const newSeenList = [...seenList, userId];
                
                await db.update(messages)
                    .set({ seenBy: newSeenList })
                    .where(eq(messages.id, msg.id));
                
                // We need to notify the sender (and others) that this message was seen
                const eventChannel = msg.guildId ? `presence-guild-${msg.guildId}` : 'presence-global';
                // Note: presence channels are used for user status, but we can reuse for events or use the chat channel.
                // The frontend listens to `presence-guild-...` now for everything? 
                // Wait, in page.tsx I changed subscription to `presence-guild-...`.
                
                // Let's check page.tsx again. Yes: `const channelName = ... ? 'presence-guild-...' : 'presence-global'`
                // So we must trigger on THAT channel.
                
                // Trigger an update event. 
                // Optimization: Maybe don't trigger for every single message seen immediately if many?
                // For now, trigger individually or batched.
                
                 await pusherServer.trigger(eventChannel, 'message-updated', {
                    ...msg,
                    seenBy: newSeenList
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Seen Error", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

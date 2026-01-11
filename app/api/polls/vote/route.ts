import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { pusherServer } from '@/lib/pusher';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { messageId, optionId } = await req.json();
    
    // Fetch generic message
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    
    if (!message || message.type !== 'poll' || !message.pollOptions) {
      return new NextResponse("Invalid poll", { status: 400 });
    }

    // Parse options
    // Cast to unknown first to avoid TS error if schema type inference is tricky with raw json
    let options = message.pollOptions as any[];
    
    // Toggle vote
    const updatedOptions = options.map((opt: any) => {
      const votes = opt.votes || [];
      if (opt.id === optionId) {
        // Add user if not present
        if (!votes.includes(userId)) {
          return { ...opt, votes: [...votes, userId] };
        }
      } else {
        // Remove user from other options (single choice poll)
        // Or keep for multiple choice. Let's assume single choice for now.
        if (votes.includes(userId)) {
          return { ...opt, votes: votes.filter((id: string) => id !== userId) };
        }
      }
      return opt;
    });

    // Update DB
    const [updatedMessage] = await db.update(messages)
      .set({ pollOptions: updatedOptions })
      .where(eq(messages.id, messageId))
      .returning();

    // Trigger update via Pusher
    await pusherServer.trigger('chat', 'poll-update', updatedMessage);

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error('Vote error:', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

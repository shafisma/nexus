import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const user = await currentUser();
    const { content } = await req.json();

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        userId,
        userName: `${user.firstName} ${user.lastName}`,
      },
    });

    await pusherServer.trigger('chat', 'new-message', message);

    return NextResponse.json(message);
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const messages = await prisma.message.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
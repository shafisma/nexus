import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId || !user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) {
    return new NextResponse("Missing socket_id or channel_name", { status: 400 });
  }

  const presenceData = {
    user_id: userId,
    user_info: {
      name: user.fullName || user.emailAddresses[0].emailAddress,
      email: user.emailAddresses[0].emailAddress,
    },
  };

  const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);

  return NextResponse.json(authResponse);
}

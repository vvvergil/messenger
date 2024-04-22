import getCurrentUser from "@/app/actions/getCurrentUser";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { pusherServer } from "@/app/libs/pusher";

interface IParams {
  conversationId?:string
};

export async function POST(
  request :Request,
  {params} : {params: IParams}
) {
  try{
    const currentUser = await getCurrentUser();
    const {
      conversationId
    } = params;

    if(!currentUser?.id || !currentUser?.email){
      return new NextResponse("Unauthorized",{status:401});
    }

    console.time("seen:find");
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId
      },
      include: {
        messages: {
          include: {
            seen: true
          }
        },
        users: true,
      }
    });
    console.timeEnd("seen:find");

    if(!conversation){
      return new NextResponse("Invalid ID",{status:400});
    }

    const lastMessage = conversation.messages[conversation.messages.length-1];

    if(!lastMessage){
      return NextResponse.json(conversation);
    }

    console.time("seen:update");
    //更新看到过消息的用户列表
    const updateMessage = await prisma.message.update({
      where: {
        id: lastMessage.id
      },
      include: {
        sender: true,
        seen: true
      },
      data: {
        seen: {
          connect: {
            id: currentUser.id
          }
        }
      }
    });
    console.timeEnd("seen:update");

    console.time("pusher:conversation:update");
    await pusherServer.trigger(currentUser.email,'conversation:update',{
      id:conversationId,
      messages: [updateMessage]
    })

    console.timeEnd("pusher:conversation:update");
    if(lastMessage.seenIds.indexOf(currentUser.id) !== -1){
      return NextResponse.json(conversation);
    }

    console.time("pusher:message:update");

    await pusherServer.trigger(conversationId!,'message:update',updateMessage);
    console.timeEnd("pusher:message:update");

    return NextResponse.json(updateMessage);

  }catch(error: any){
    console.log(error, "ERROR_MESSAGES_SEEN");
    return new NextResponse("Internal Error",{status: 500});
  }
}
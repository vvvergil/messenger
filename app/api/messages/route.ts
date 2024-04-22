import getCurrentUser from "@/app/actions/getCurrentUser";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { pusherServer } from "@/app/libs/pusher";

export async function POST(
  request:Request
) {
    try {
      const currentUser = await getCurrentUser();
      const body = await request.json();

      //console.log(body);
      
      const {
        message,
        image,
        conversationId
      } = body;

      if(!currentUser?.id || !currentUser?.email){
        return new NextResponse("Unauthorized",{status:401}); 
      }

      console.time('message:create');
      const newMessage = await prisma.message.create({
        data:{
          body:message,
          image:image,
          conversation:{
            connect: {
              id:conversationId
            }
          },
          sender: {
            connect: {
              id: currentUser.id
            }
          },
          seen: {
            connect: {
              id: currentUser.id
            }
          }
        },
        include: {
          seen: true,
          sender: true,
        }
      });
      console.timeEnd("message:create");
      console.time("message:update");
      const updatedConversation = await prisma.conversation.update({
        where:{
          id:conversationId
        },
        data:{
          lastMessageAt:new Date(),
          messages:{
            connect: {
              id:newMessage.id
            }
          }
        },
        include: {
          users:true,
          messages: {
            include: {
              seen: true
            }
          }
        }
      });
      console.timeEnd("message:update");

      console.time("pusher:message:new");

      await pusherServer.trigger(conversationId,'messages:new',newMessage);
      console.timeEnd("pusher:message:new");

      const lastMessage = updatedConversation.messages[updatedConversation.messages.length-1];

      console.time("pusher:conversation:update");

      updatedConversation.users.map((user:any) => {
        pusherServer.trigger(user.email!,'conversation:update',{
          id:conversationId,
          messages: [lastMessage]
        })
      })

      console.timeEnd("pusher:conversation:update");

      return NextResponse.json(newMessage);

    }catch(error:any){
      console.log(error,"ERROR_MESSAGES");
      return new NextResponse("InternalError",{status:500});
    }
}
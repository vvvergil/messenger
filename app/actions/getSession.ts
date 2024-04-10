import { getServerSession } from "next-auth";

import  { authOptions }  from "@/app/utils/authOption";

export default async function getSession(){
  return await getServerSession(authOptions);
}
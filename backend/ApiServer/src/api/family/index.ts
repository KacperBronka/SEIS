import { Router } from "express";
import createRouter from "./create.js";
import joinRouter from "./join.js";
import statusRouter from "./status.js";
import approveRouter from "./approve.js";
import declineRouter from "./decline.js";
import removeMemberRouter from "./removeMember.js";

const familyRouter = Router({})

familyRouter.use(createRouter)
familyRouter.use(joinRouter)
familyRouter.use(statusRouter)
familyRouter.use(approveRouter)
familyRouter.use(declineRouter)
familyRouter.use(removeMemberRouter)

export default familyRouter
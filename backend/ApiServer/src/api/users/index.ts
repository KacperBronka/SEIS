import { Router } from "express";

import getUserDataRouter from "./getUserData.js";
import verifyAgeRouter from "./verifyAge.js";
import clearCodeRouter from "./clearCode.js";
import createCodeRouter from "./createCode.js";

const usersRouter = Router({})

usersRouter.use(getUserDataRouter)
usersRouter.use(verifyAgeRouter)
usersRouter.use(clearCodeRouter)
usersRouter.use(createCodeRouter)

export default usersRouter
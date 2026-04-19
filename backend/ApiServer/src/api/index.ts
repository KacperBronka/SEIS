import { Router } from "express";
import usersRouter from "./users/index.js";
import familyRouter from "./family/index.js";

const appRouter = Router({})

appRouter.use("/users/", usersRouter)
appRouter.use("/family/", familyRouter)

appRouter.get("/", (req, res) => {
    res.send({error: null, status: "ok", message: "SEIS is up and running"});
});

export default appRouter
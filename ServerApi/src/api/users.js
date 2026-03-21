import { Router } from "express"
import { clearCode, generateCode, getCodeData } from "../services/codeService.js"
import { getSocketId } from "../services/socketService.js"
import { getPersonalData } from "../services/databaseService.js"
import { checkRequestData_notEmpty } from "../util/dataUtil.js"
import { waitForUserAccept } from "../services/socketService.js"

const usersRouter = Router({})

usersRouter.post("/code", (req, res) => {
    const uid = req.body.id_uid;

    if (!checkRequestData_notEmpty(uid)) {
        return res.status(400).send({ "error": "request data incomplete(id_uid)" });
    }

    const sid = getSocketId(uid);
    if (!sid) {
        return res.status(404).send({ code: null, error: "No socket assigned to the user id" });
    }

    const response = generateCode(uid, sid);
    res.send({ code: response, error: null });
});

usersRouter.post("/clear-code", (req, res) => {
    const uid = req.body.id_uid; 
    
    clearCode(uid);
    res.sendStatus(200);
});

usersRouter.post("/verify-age", async (req, res) => {
    const { requested_age, code, meta } = req.body;
    
    if (!checkRequestData_notEmpty(requested_age, code, meta)) {
        return res.status(400).send({ "error": "request data incomplete(requested_age, code, meta)" });
    }

    const codeData = getCodeData(code);
    if (codeData == null) {
        return res.status(400).send({ error: "Code is invalid or no longer active", age_check: false });
    }

    const userSocket = getSocketId(codeData.user);

    if (userSocket) {
        userSocket.emit("accept-request", meta);
    } else {
        return res.status(410).send({ error: "User socket disconnected", age_check: false });
    }
    
    const userAccepted = await waitForUserAccept(code);
    console.log(userAccepted)
    if (!userAccepted) {
        return res.send({ error: "User denied or timeout", age_check: false });
    }

    const personalData = getPersonalData(codeData.user);
    const age_check = personalData.age >= requested_age;
    console.log(age_check)
    console.log( personalData)
    res.send({ error: null, age_check });
});
usersRouter.post("/get-user-data", (req, res) => {
    const uid = req.body.id_uid

    if(!checkRequestData_notEmpty(uid)){
        return res.status(400).send({"error": "request data incomplete(id_uid)", user: null})
    }

    const personalData = getPersonalData(uid)

    if(!personalData) {
        return res.status(404).send({error: `User with id(${uid}) has not been found`, user: null})
    }

    res.send({error: null, user: personalData})
})

export { usersRouter }

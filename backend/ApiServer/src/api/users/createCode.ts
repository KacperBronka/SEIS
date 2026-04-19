import { Router } from "express";
import { Joi, validate } from "express-validation";
import { getSocketId } from "../../services/socketService.js";
import { generateCode } from "../../services/codeService.js";
import { getPersonalData } from "../../services/databaseService.js";

const createCodeRouter = Router()

createCodeRouter.post("/code", validate({
    body: Joi.object({
        id_uid: Joi.string().alphanum().required()
    })
}), async (req, res) => {
    const uid = req.body.id_uid;

    const sid = getSocketId(uid);
    if (!sid) {
        return res.status(404).send({ code: null, error: "No socket assigned to the user id" });
    }

    const personalData = await getPersonalData(uid);
    if (!personalData) {
        return res.status(404).send({ code: null, error: `User with id(${uid}) has not been found` });
    }

    const response = generateCode(personalData, sid);
    res.send({ code: response, error: null });
});

export default createCodeRouter
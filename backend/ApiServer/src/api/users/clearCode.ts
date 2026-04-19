import { Router } from "express";
import { Joi, validate } from "express-validation";
import { clearCode } from "../../services/codeService.js";
import { getPersonalData } from "../../services/databaseService.js";

const clearCodeRouter = Router({})

clearCodeRouter.post("/clear-code", validate({
    body: Joi.object({
        id_uid: Joi.string().alphanum().required()
    })
}), async (req, res) => {
    const uid = req.body.id_uid;

    const personalData = await getPersonalData(uid);
    if (!personalData) {
        return res.status(404).send({ error: `User with id(${uid}) has not been found` });
    }
    
    clearCode(personalData);
    res.sendStatus(200);
});

export default clearCodeRouter
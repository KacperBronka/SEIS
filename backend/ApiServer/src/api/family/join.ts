import { Router } from "express";
import { Joi, validate } from "express-validation";
import { FamilyServiceError, joinFamilyGroup } from "../../services/familyService.js";

const joinRouter = Router({})

joinRouter.post("/join", validate({
    body: Joi.object({
        id_uid: Joi.string().alphanum().required(),
        join_code: Joi.string().alphanum().max(12).required(),
    })
}), async (req, res) => {
    const { id_uid, join_code } = req.body;

    try {
        const response = await joinFamilyGroup(id_uid, join_code);
        return res.send(response);
    } catch (error) {
        if (error instanceof FamilyServiceError) {
            return res.status(error.status).send({ error: error.message });
        }

        return res.status(500).send({ error: "Internal server error" });
    }
});

export default joinRouter

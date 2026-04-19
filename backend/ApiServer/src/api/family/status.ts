import { Router } from "express";
import { Joi, validate } from "express-validation";
import { getFamilyStatus } from "../../services/familyService.js";

const statusRouter = Router({})

statusRouter.post("/status", validate({
    body: Joi.object({
        id_uid: Joi.string().alphanum().required(),
    })
}), async (req, res) => {
    const { id_uid } = req.body;

    try {
        const response = await getFamilyStatus(id_uid);
        return res.send(response);
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

export default statusRouter

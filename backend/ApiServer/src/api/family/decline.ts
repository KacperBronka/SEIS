import { Router } from "express";
import { Joi, validate } from "express-validation";
import { declineFamilyJoin, FamilyServiceError } from "../../services/familyService.js";

const declineRouter = Router({})

declineRouter.post("/decline", validate({
    body: Joi.object({
        parent_id: Joi.string().alphanum().required(),
        child_id: Joi.string().alphanum().required(),
        family_id: Joi.alternatives().try(
            Joi.number().integer().positive(),
            Joi.string().pattern(/^[1-9]\d*$/)
        ).required(),
    })
}), async (req, res) => {
    const { parent_id, child_id, family_id } = req.body;

    try {
        const response = await declineFamilyJoin(parent_id, child_id, family_id);
        return res.send(response);
    } catch (error) {
        if (error instanceof FamilyServiceError) {
            return res.status(error.status).send({ error: error.message });
        }

        return res.status(500).send({ error: "Internal server error" });
    }
});

export default declineRouter

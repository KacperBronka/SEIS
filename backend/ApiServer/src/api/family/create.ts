import { Router } from "express";
import { Joi, validate } from "express-validation";
import { createFamilyGroup, FamilyServiceError } from "../../services/familyService.js";

const createRouter = Router({})

createRouter.post("/create", validate({
    body: Joi.object({
        id_uid: Joi.string().alphanum().required(),
        family_name: Joi.string().trim().min(1).required(),
        email: Joi.string().email().required(),
    })
}), async (req, res) => {
    const { id_uid, family_name, email } = req.body;

    try {
        const response = await createFamilyGroup(id_uid, family_name, email);
        return res.send(response);
    } catch (error) {
        if (error instanceof FamilyServiceError) {
            return res.status(error.status).send({ error: error.message });
        }

        console.log("Error creating family:", error);
        return res.status(500).send({ error: "Internal server error" });
    }
});


export default createRouter
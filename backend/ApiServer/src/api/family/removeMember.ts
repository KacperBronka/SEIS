import { Router } from "express";
import { Joi, validate } from "express-validation";
import { FamilyServiceError, removeFamilyMemberFromFamily } from "../../services/familyService.js";

const removeMemberRouter = Router({})

removeMemberRouter.post("/remove", validate({
	body: Joi.object({
		parent_id: Joi.string().alphanum().required(),
		child_id: Joi.string().alphanum().required(),
	})
}), async (req, res) => {
	const { parent_id, child_id } = req.body;

	try {
		const response = await removeFamilyMemberFromFamily(parent_id, child_id);
		return res.send(response);
	} catch (error) {
		if (error instanceof FamilyServiceError) {
			return res.status(error.status).send({ error: error.message });
		}

		return res.status(500).send({ error: "Internal server error" });
	}
});

export default removeMemberRouter

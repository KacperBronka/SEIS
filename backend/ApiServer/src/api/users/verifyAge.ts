import { Router } from "express";
import { Joi, validate } from "express-validation";
import { getCodeData } from "../../services/codeService.js";
import { emitToUser, getSocketId, waitForUserAccept } from "../../services/socketService.js";
import { getPersonalData } from "../../services/databaseService.js";
import { getAgeFromPESEL } from "../../util/peselUtil.js";
import { createAndSaveToken } from "../../services/tokenService.js";
import {sendFamilyActivityNotification} from "../../services/familyService.js";

const verifyAgeRouter = Router({})

async function waitForSocket(userId: string, timeoutMs = 3000, pollIntervalMs = 200) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        const sid = getSocketId(userId);
        if (sid) {
            return sid;
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return null;
}

verifyAgeRouter.post("/verify-age", validate({
    body: Joi.object({
        requested_age: Joi.number().required(),
        code: Joi.string().regex(/[0-9]{6}/).required(),
        meta: Joi.string().min(2).required()
    })
}), async (req, res) => {
    const { requested_age, code, meta } = req.body;

    const codeData = getCodeData(code);
    if (codeData == null) {
        return res.status(400).send({ error: "Code is invalid or no longer active", age_check: false, token: null });
    }
    
    const userSocket = await waitForSocket(codeData.user.gov_id);

    if (userSocket) {
        emitToUser(codeData.user.gov_id, "accept-request", meta);
    } else {
        return res.status(410).send({ error: "User socket disconnected", age_check: false, token: null });
    }
    
    const userAccepted = await waitForUserAccept(code);
    const personalData = await getPersonalData(codeData.user.gov_id);

    if (!userAccepted) {
        if (personalData) {
            createAndSaveToken(codeData.user, false);
        }
        
        return res.send({ error: "User denied or timeout", age_check: false, token: null });
    }
    
    if (!personalData) {
        return res.status(404).send({ error: "User data not found", age_check: false, token: null });
    }

    const age_check = getAgeFromPESEL(personalData.pesel) >= requested_age;

    const token = createAndSaveToken(codeData.user, true);
    const mailRes = await sendFamilyActivityNotification(personalData, meta);

    console.log(`Activity notification email sent: ${mailRes}`);

    res.send({ error: null, age_check, token });
});

export default verifyAgeRouter
import nodemailer from "nodemailer";
import config from "../config.js";
import { formatTimestamp } from "../util/formatUtil.js"
import type { User } from "../types/User.js";
import { getFamilyById, getFamilyMembershipByUserId, getPersonalData } from "./databaseService.js";

function getDisplayName(user: User): string {
    return `${user.name} ${user.surname}`.trim();
}

async function sendActivityMail(user: User, service: string): Promise<void> {
    const membership = await getFamilyMembershipByUserId(user.gov_id);
    if (!membership) {
        return;
    }

    const family = await getFamilyById(membership.family_id);
    if (!family) {
        return;
    }

    const parentUser = await getPersonalData(family.parent_id);
    const parentName = parentUser ? getDisplayName(parentUser) : family.parent_id;
    const childName = getDisplayName(user);


    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "noreply.SEIS@gmail.com",
            pass: process.env.GMAIL_APP_PASSWORD, 
        },
    });

    await transporter.sendMail({
        from: "noreply.SEIS@gmail.com",
        to: family.parent_email,
        subject: `SEIS - Activity from ${childName}`,
        html: `<div style="background-color:#f5f5f7; padding:20px; font-family:Arial, sans-serif;">
            <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                
                <!-- Header -->
                <div style="background:#6a0dad; color:#ffffff; padding:16px 24px; display:flex; align-items:center;">

                <div style="font-size:18px; font-weight:bold;">
                    SEIS Notification
                </div>
                </div>

                <!-- Body -->
                <div style="padding:24px; color:#333333; line-height:1.6; font-size:15px;">
                <p>Dear <strong>${parentName}</strong>,</p>

                <p>
                    We would like to inform you that 
                    <strong style="color:#6a0dad;">${childName}</strong> 
                    has just accessed the service:
                </p>

                <p style="background:#f3e8ff; padding:12px; border-radius:6px; font-weight:bold; color:#4b0082;">
                    ${service}
                </p>

                <p style="margin-top:20px; font-size:13px; color:#777;">
                    This message is automatically generated. Please do not reply to this email.
                </p>

                <table role="presentation" width="100%" style="margin-top:24px; border-collapse:collapse;">
                    <tr>
                        <td style="vertical-align:middle;">
                            Best regards,<br/>
                            <strong>SEIS Team</strong>
                        </td>
                        <td align="right" style="vertical-align:middle; text-align:right;">
                            <img src="http://130.61.44.50:2000/public/logo.png" alt="SEIS Logo" style="height:50px; width:auto; display:block; margin-left:auto;" />
                        </td>
                    </tr>
                </table>
                </div>

                <!-- Footer -->
<div style="background:#fafafa; padding:12px; font-size:12px; color:#999; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>© SEIS System</span>
            
        </div>

    </div>
</div>

            </div>
            </div>`,
    });

  
}

export { sendActivityMail };

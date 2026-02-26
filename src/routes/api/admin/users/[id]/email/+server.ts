import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requireAdmin } from '$lib/server/admin';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';

const FROM_ADDRESS = 'Votist Moderation <onboarding@votist.com>';

function getResend() {
	return new Resend(env.RESEND_API_KEY);
}

export const POST: RequestHandler = async (event) => {
	let adminDbUser: { id: string };
	try {
		const { dbUser } = await requireAdmin(event);
		adminDbUser = dbUser;
	} catch {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const { id } = event.params;
	if (!id) return json({ error: 'Missing user id' }, { status: 400 });

	let body: { subject?: string; body?: string; template?: string };
	try {
		body = await event.request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const subject = body.subject?.trim();
	const emailBody = body.body?.trim();

	if (!subject) return json({ error: 'Subject is required' }, { status: 400 });
	if (!emailBody) return json({ error: 'Body is required' }, { status: 400 });

	try {
		const targetUser = await prisma.user.findUnique({
			where: { id },
			select: { id: true, email: true, firstName: true, lastName: true }
		});

		if (!targetUser) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		if (!targetUser.email) {
			return json({ error: 'User has no email address' }, { status: 400 });
		}

		const userName =
			[targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || 'User';

		const htmlBody = `
			<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
				<p>Hello ${userName},</p>
				<div style="white-space: pre-wrap;">${emailBody.replace(/\n/g, '<br>')}</div>
				<p style="margin-top: 24px; color: #6b7280;">&mdash; Votist Admin Team</p>
			</div>
		`;

		const { error: resendError } = await getResend().emails.send({
			from: FROM_ADDRESS,
			to: targetUser.email,
			subject,
			html: htmlBody
		});

		if (resendError) {
			console.error('Resend error sending admin email:', resendError);
			return json({ success: false, error: resendError.message }, { status: 500 });
		}

		// Log the action
		await prisma.moderationLog.create({
			data: {
				action: 'WARN',
				targetId: targetUser.id,
				adminId: adminDbUser.id,
				reason: `Admin email sent: ${subject}`,
				metadata: { subject, template: body.template ?? null }
			}
		});

		return json({ success: true });
	} catch (err) {
		console.error('Error sending admin email:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
